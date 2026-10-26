from collections.abc import Callable

import httpx
import pytest

from cobra_collectors.http import (
    HttpClient,
    RetryPolicy,
    SourceUnavailableError,
    retry_after_seconds,
)
from cobra_collectors.ratelimit import RateLimiter

URL = "https://dadosabertos.example.gov.br/api/itens"


def client_with(
    responses: list[httpx.Response | Exception], waits: list[float]
) -> tuple[HttpClient, list[httpx.Request]]:
    seen: list[httpx.Request] = []
    queue = list(responses)

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        item = queue.pop(0)
        if isinstance(item, Exception):
            raise item
        return item

    limiter = RateLimiter(1000, burst=1000, sleep=lambda _: None)
    client = HttpClient(
        limiter,
        policy=RetryPolicy(max_attempts=3, base_seconds=1, cap_seconds=60),
        transport=httpx.MockTransport(handler),
        sleep=waits.append,
        jitter=lambda: 1.0,  # deterministic: no jitter reduction
    )
    return client, seen


def test_retries_429_respecting_retry_after_then_succeeds() -> None:
    waits: list[float] = []
    client, seen = client_with(
        [httpx.Response(429, headers={"Retry-After": "2"}), httpx.Response(200, json={"ok": True})],
        waits,
    )
    response = client.get(URL)
    assert response.status_code == 200
    assert len(seen) == 2
    assert waits[0] >= 2


def test_backoff_grows_exponentially() -> None:
    waits: list[float] = []
    client, _ = client_with(
        [httpx.Response(503), httpx.Response(503), httpx.Response(200)],
        waits,
    )
    client.get(URL)
    assert waits == [1.0, 2.0]


def test_gives_up_after_max_attempts() -> None:
    waits: list[float] = []
    client, seen = client_with([httpx.Response(503)] * 3, waits)
    with pytest.raises(SourceUnavailableError, match="3 attempts"):
        client.get(URL)
    assert len(seen) == 3


def test_does_not_retry_404() -> None:
    waits: list[float] = []
    client, seen = client_with([httpx.Response(404)], waits)
    assert client.get(URL).status_code == 404
    assert len(seen) == 1
    assert waits == []


def test_retries_network_errors() -> None:
    waits: list[float] = []
    client, seen = client_with(
        [httpx.ConnectError("boom"), httpx.Response(200)],
        waits,
    )
    assert client.get(URL).status_code == 200
    assert len(seen) == 2


def test_identifies_itself() -> None:
    client, seen = client_with([httpx.Response(200)], [])
    client.get(URL)
    agent = seen[0].headers["User-Agent"]
    assert "Cobra" in agent
    assert "github.com" in agent


def test_every_attempt_goes_through_the_rate_limiter() -> None:
    acquired: list[int] = []

    class CountingLimiter(RateLimiter):
        def acquire(self) -> None:
            acquired.append(1)

    responses: list[Callable[[], httpx.Response]] = [
        lambda: httpx.Response(503),
        lambda: httpx.Response(200),
    ]
    client = HttpClient(
        CountingLimiter(1),
        transport=httpx.MockTransport(lambda _: responses.pop(0)()),
        sleep=lambda _: None,
    )
    client.get(URL)
    assert len(acquired) == 2


@pytest.mark.parametrize(("header", "expected"), [("5", 5.0), (None, None), ("not a date", None)])
def test_retry_after_parsing(header: str | None, expected: float | None) -> None:
    assert retry_after_seconds(header) == expected
