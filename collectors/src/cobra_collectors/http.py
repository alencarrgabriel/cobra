"""HTTP client for official sources: rate limited, retrying, identified (DDR §6.2)."""

import random
import time
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from email.utils import parsedate_to_datetime
from importlib.metadata import version
from typing import Any

import httpx
import structlog

from cobra_collectors.ratelimit import RateLimiter

RETRY_STATUS = frozenset({429, 502, 503, 504})
REPO_URL = "https://github.com/alencarrgabriel/cobra"
USER_AGENT = f"Cobra/{version('cobra-collectors')} (+{REPO_URL})"

log = structlog.get_logger()


class SourceUnavailableError(Exception):
    """The source kept failing after every retry; the job should be retried later."""


@dataclass(frozen=True)
class RetryPolicy:
    max_attempts: int = 5
    base_seconds: float = 1.0
    cap_seconds: float = 60.0


def retry_after_seconds(value: str | None) -> float | None:
    """Seconds requested by a `Retry-After` header (delta-seconds or HTTP date)."""
    if not value:
        return None
    try:
        return max(0.0, float(value))
    except ValueError:
        pass
    try:
        when = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        return None
    return max(0.0, when.timestamp() - time.time())


class HttpClient:
    """One per source: shares that source's rate limiter across all its requests."""

    def __init__(
        self,
        limiter: RateLimiter,
        *,
        policy: RetryPolicy | None = None,
        transport: httpx.BaseTransport | None = None,
        timeout: float = 30.0,
        sleep: Callable[[float], None] = time.sleep,
        jitter: Callable[[], float] = random.random,
    ) -> None:
        self.limiter = limiter
        self.policy = policy or RetryPolicy()
        self._sleep = sleep
        self._jitter = jitter
        self._client = httpx.Client(
            transport=transport,
            timeout=timeout,
            follow_redirects=True,
            headers={"User-Agent": USER_AGENT},
        )

    def close(self) -> None:
        self._client.close()

    def backoff(self, attempt: int, retry_after: float | None) -> float:
        """Wait before retry number `attempt` (1-based): exponential, capped, with jitter."""
        exp = min(self.policy.cap_seconds, self.policy.base_seconds * 2.0 ** (attempt - 1))
        wait = exp * (0.5 + self._jitter() / 2)
        return max(wait, retry_after or 0.0)

    def get(self, url: str, params: Mapping[str, Any] | None = None) -> httpx.Response:
        """GET retrying 429/502/503/504 and network errors; other statuses are returned as is."""
        last_error: str = ""
        for attempt in range(1, self.policy.max_attempts + 1):
            self.limiter.acquire()
            try:
                response = self._client.get(url, params=params)
            except httpx.TransportError as error:
                last_error = f"{type(error).__name__}: {error}"
                retry_after = None
            else:
                if response.status_code not in RETRY_STATUS:
                    return response
                last_error = f"HTTP {response.status_code}"
                retry_after = retry_after_seconds(response.headers.get("Retry-After"))
            if attempt == self.policy.max_attempts:
                break
            wait = self.backoff(attempt, retry_after)
            log.warning(
                "source.retry", url=url, attempt=attempt, wait=round(wait, 2), error=last_error
            )
            self._sleep(wait)
        raise SourceUnavailableError(
            f"{url} failed after {self.policy.max_attempts} attempts ({last_error})"
        )
