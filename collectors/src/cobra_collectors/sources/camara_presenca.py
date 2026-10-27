"""Câmara presence in plenary deliberative sessions: the `attendance` job of the `camara`
adapter, one per year. See design D1 of openspec change `ingestao-presenca`."""

import csv
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import UTC, date, datetime
from pathlib import Path

from cobra_collectors.pipeline import Context
from cobra_collectors.sources.camara_votacoes_model import file_url
from cobra_collectors.sources.votes_store import linked_members

PLENARY = "PLEN"
DELIBERATIVE = "Sessão Deliberativa"
# A year with sessions must have recorded presence in at least this share of them (D1).
MIN_SESSIONS_WITH_PRESENCE = 0.9
EVENT_URL = "https://dadosabertos.camara.leg.br/api/v2/eventos/{}"


@dataclass(frozen=True)
class Session:
    id: str
    held_on: date
    started_at: datetime | None


def _rows(path: Path) -> Iterator[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        yield from csv.DictReader(handle, delimiter=";")


def read_sessions(events: Path, organs: Path) -> dict[str, Session]:
    """Plenary deliberative sessions that took place (situation "Encerrada…")."""
    plenary = {r["idEvento"] for r in _rows(organs) if r.get("siglaOrgao") == PLENARY}
    sessions: dict[str, Session] = {}
    for r in _rows(events):
        if (
            r.get("id") in plenary
            and r.get("descricaoTipo") == DELIBERATIVE
            and (r.get("situacao") or "").startswith("Encerrada")
            and r.get("dataHoraInicio")
        ):
            started = datetime.fromisoformat(r["dataHoraInicio"])
            sessions[r["id"]] = Session(r["id"], started.date(), started)
    return sessions


def read_presence(path: Path, sessions: set[str]) -> dict[str, set[str]]:
    """Session → deputies with a recorded presence."""
    presence: dict[str, set[str]] = {}
    for r in _rows(path):
        if r.get("idEvento") in sessions and r.get("idDeputado"):
            presence.setdefault(r["idEvento"], set()).add(r["idDeputado"])
    return presence


def collect_attendance(ctx: Context, year: int) -> None:
    paths = {}
    for dataset in ("eventos", "eventosOrgaos", "eventosPresencaDeputados"):
        saved = ctx.fetch_file(file_url(dataset, year))
        if saved.file_path is None:  # pragma: no cover - fetch_file always writes a file
            raise RuntimeError("download without a file")
        paths[dataset] = saved.file_path
    sessions = read_sessions(paths["eventos"], paths["eventosOrgaos"])
    if not sessions:
        return
    presence = read_presence(paths["eventosPresencaDeputados"], set(sessions))
    share = len(presence) / len(sessions)
    ctx.validate(
        share >= MIN_SESSIONS_WITH_PRESENCE,
        f"presença registrada em só {share:.0%} das sessões deliberativas de {year}",
    )
    db = ctx.db
    house = db.execute("select id from core.legislative_houses where slug = 'camara'").fetchone()
    if house is None:  # pragma: no cover - seeded by the migrations
        raise RuntimeError("Câmara missing from core.legislative_houses")
    linked = linked_members(db, "camara")
    now = datetime.now(UTC)
    db.execute(
        "delete from core.sessions where source = 'camara' and extract(year from held_on) = %s",
        (year,),
    )
    for s in sessions.values():
        row = db.execute(
            """
            insert into core.sessions (house_id, held_on, started_at, kind, source, source_id,
              source_url, collected_at)
            values (%s, %s, %s, %s, 'camara', %s, %s, %s)
            returning id
            """,
            (house[0], s.held_on, s.started_at, DELIBERATIVE, s.id, EVENT_URL.format(s.id), now),
        ).fetchone()
        if row is None:  # pragma: no cover - insert ... returning always yields a row
            raise RuntimeError("insert returned no row")
        with (
            db.cursor() as cur,
            cur.copy(
                "copy core.session_attendance (session_id, external_id, politician_id, source, "
                "source_id, source_url, collected_at) from stdin"
            ) as copy,
        ):
            for deputy in sorted(presence.get(s.id, ())):
                copy.write_row(
                    (row[0], deputy, linked.get(deputy), "camara", f"{s.id}:{deputy}",
                     EVENT_URL.format(s.id), now)
                )  # fmt: skip
