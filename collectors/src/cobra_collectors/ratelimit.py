"""Per-source request rate limiting (DDR RNF-09)."""

import time
from collections.abc import Callable


class RateLimiter:
    """Token bucket: at most `rate_per_second` requests per second on average, bursts up to `burst`.

    Clock and sleep are injectable so tests run without real waiting.
    """

    def __init__(
        self,
        rate_per_second: float,
        burst: int = 1,
        *,
        clock: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        if rate_per_second <= 0:
            raise ValueError("rate_per_second must be positive")
        if burst < 1:
            raise ValueError("burst must be at least 1")
        self.rate = rate_per_second
        self.burst = burst
        self._clock = clock
        self._sleep = sleep
        self._tokens = float(burst)
        self._last = clock()

    def _refill(self) -> None:
        now = self._clock()
        self._tokens = min(self.burst, self._tokens + (now - self._last) * self.rate)
        self._last = now

    def acquire(self) -> None:
        """Blocks until a request may be made."""
        self._refill()
        if self._tokens < 1:
            self._sleep((1 - self._tokens) / self.rate)
            self._refill()
        self._tokens -= 1
