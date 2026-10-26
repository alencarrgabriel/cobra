"""Standard flow for every source: fetch → keep raw → normalize → validate → publish (DDR §6.2)."""

from collections.abc import Iterable
from dataclasses import dataclass, field
from typing import Any, Protocol

import httpx
import psycopg

from cobra_collectors import queue
from cobra_collectors.http import HttpClient
from cobra_collectors.queue import Job
from cobra_collectors.raw import RawStore, SavedRaw


class ValidationError(Exception):
    """Normalized data failed a check; nothing from the job is published."""


@dataclass(frozen=True)
class JobSpec:
    kind: str
    dedupe_key: str
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass
class Context:
    """What a source adapter gets to process one job.

    `db` is inside the job's transaction: writes to `core` become visible only if the
    whole job succeeds. Raw responses go through `save_raw`, which commits on its own.
    `ops` is an autocommit connection for queue writes that must survive a rollback.
    """

    source: str
    job: Job
    db: psycopg.Connection
    http: HttpClient
    raw: RawStore
    ops: psycopg.Connection

    def fetch(self, url: str, params: dict[str, Any] | None = None) -> httpx.Response:
        """GET through the source's rate limiter and retries, keeping the raw response."""
        response = self.http.get(url, params=params)
        self.save_raw(response)
        return response

    def save_raw(self, response: httpx.Response) -> SavedRaw:
        return self.raw.save_response(self.source, response, job_id=self.job.id)

    def enqueue(
        self, kind: str, dedupe_key: str, payload: dict[str, Any], *, independent: bool = False
    ) -> bool:
        """Queues a follow-up job of this source.

        By default it joins the job's transaction (e.g. details of a work that is only
        queued if the work is published). With `independent=True` it is written at once,
        so it survives a failed validation (e.g. the next page of a listing).
        """
        conn = self.ops if independent else self.db
        return queue.enqueue(conn, self.source, kind, dedupe_key, payload)

    @staticmethod
    def validate(condition: bool, message: str) -> None:
        if not condition:
            raise ValidationError(message)


class Source(Protocol):
    """A source adapter. `name` is a `core.data_source` value."""

    name: str
    rate_per_second: float
    burst: int

    def plan(self) -> Iterable[JobSpec]:
        """Jobs to queue for a full refresh."""
        ...

    def handle(self, ctx: Context) -> None:
        """Processes one job: fetch, normalize, validate and write to `core` via `ctx.db`."""
        ...


def run_job(
    source: Source,
    job: Job,
    db: psycopg.Connection,
    http: HttpClient,
    raw: RawStore,
    ops: psycopg.Connection,
) -> None:
    """Runs `source.handle` in a single transaction; any exception rolls everything back."""
    with db.transaction():
        source.handle(Context(source.name, job, db, http, raw, ops))
