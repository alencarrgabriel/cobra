from pathlib import Path

import pytest
import structlog

from cobra_collectors import config

CONFIG_VARIABLES = ("APP_ENV", "LOG_LEVEL", "DATABASE_URL", "RAW_DATA_DIR")


@pytest.fixture(autouse=True)
def isolated_environment(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Tests never see the developer's `.env` or shell variables."""
    for name in CONFIG_VARIABLES:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setattr(config, "ENV_FILE", tmp_path / "missing.env")


@pytest.fixture
def valid_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("DATABASE_URL", "postgresql://test:test@127.0.0.1:1/test")


@pytest.fixture(autouse=True)
def reset_logging() -> None:
    """A test that configures logging must not leak its (closed) output stream to the next."""
    structlog.reset_defaults()
