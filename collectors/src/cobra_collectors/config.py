"""Configuration from environment variables (shared `.env` at the repository root)."""

from pathlib import Path
from typing import Literal

from pydantic import PostgresDsn, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]
ENV_FILE = REPO_ROOT / ".env"


class Settings(BaseSettings):
    """Every field must also be documented in the repository root `.env.example`."""

    model_config = SettingsConfigDict(
        env_file_encoding="utf-8", extra="ignore", frozen=True, env_ignore_empty=True
    )

    app_env: Literal["development", "test", "production"]
    log_level: Literal["debug", "info", "warn", "error"] = "info"
    database_url: PostgresDsn
    raw_data_dir: Path = REPO_ROOT / "data" / "raw"


class ConfigError(Exception):
    """Invalid configuration. The message names variables and problems, never values."""

    def __init__(self, problems: list[tuple[str, str]]) -> None:
        self.variables = [variable for variable, _ in problems]
        lines = "\n".join(f"  - {variable}: {problem}" for variable, problem in problems)
        super().__init__(f"Invalid environment configuration:\n{lines}")


def _describe(error_type: str) -> str:
    if error_type == "missing":
        return "is required"
    if error_type == "literal_error":
        return "is not one of the allowed values"
    return "has an invalid format"


def load_settings(env_file: Path | None) -> Settings:
    """Validate configuration from the environment (and `env_file`, if it exists)."""
    try:
        return Settings(_env_file=env_file)
    except ValidationError as error:
        # Built from `loc` and `type` only: pydantic's own message includes the input value.
        problems = [(str(e["loc"][0]).upper(), _describe(e["type"])) for e in error.errors()]
        raise ConfigError(problems) from None
