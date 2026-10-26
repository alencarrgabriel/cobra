import pytest

from cobra_collectors.ratelimit import RateLimiter


class FakeClock:
    def __init__(self) -> None:
        self.now = 0.0
        self.calls: list[float] = []

    def __call__(self) -> float:
        return self.now

    def sleep(self, seconds: float) -> None:
        self.now += seconds


def request_times(limiter: RateLimiter, clock: FakeClock, n: int) -> list[float]:
    times = []
    for _ in range(n):
        limiter.acquire()
        times.append(clock.now)
    return times


def test_never_exceeds_the_rate_in_any_one_second_window() -> None:
    clock = FakeClock()
    limiter = RateLimiter(8, clock=clock, sleep=clock.sleep)
    times = request_times(limiter, clock, 50)
    for start in times:
        in_window = [t for t in times if start <= t < start + 1.0]
        assert len(in_window) <= 8


def test_burst_allows_initial_requests_without_waiting() -> None:
    clock = FakeClock()
    limiter = RateLimiter(2, burst=3, clock=clock, sleep=clock.sleep)
    assert request_times(limiter, clock, 3) == [0.0, 0.0, 0.0]
    limiter.acquire()
    assert clock.now == pytest.approx(0.5)


def test_rejects_invalid_configuration() -> None:
    with pytest.raises(ValueError):
        RateLimiter(0)
    with pytest.raises(ValueError):
        RateLimiter(1, burst=0)
