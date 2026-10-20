import re
from pathlib import Path

import pytest

from cobra_collectors.config import REPO_ROOT, ConfigError, Settings, load_settings


@pytest.mark.usefixtures("valid_environment")
def test_valid_configuration_applies_defaults() -> None:
    settings = load_settings(None)
    assert settings.app_env == "test"
    assert settings.log_level == "info"


def test_missing_variable_is_named(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "test")
    with pytest.raises(ConfigError, match="DATABASE_URL: is required") as error:
        load_settings(None)
    assert error.value.variables == ["DATABASE_URL"]


@pytest.mark.usefixtures("valid_environment")
def test_invalid_value_is_never_echoed(monkeypatch: pytest.MonkeyPatch) -> None:
    sentinel = "value-that-must-never-be-printed"
    monkeypatch.setenv("DATABASE_URL", sentinel)
    with pytest.raises(ConfigError) as error:
        load_settings(None)
    assert "DATABASE_URL: has an invalid format" in str(error.value)
    assert sentinel not in str(error.value)


def test_reads_env_file(tmp_path: Path) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text("APP_ENV=production\nDATABASE_URL=postgresql://u:p@db:5432/cobra\n")
    assert load_settings(env_file).app_env == "production"


def test_every_setting_is_documented_in_env_example() -> None:
    example = (REPO_ROOT / ".env.example").read_text(encoding="utf-8")
    documented = set(re.findall(r"^([A-Z][A-Z0-9_]*)=", example, flags=re.MULTILINE))
    missing = {name.upper() for name in Settings.model_fields} - documented
    assert not missing, f"read by the collectors but missing from .env.example: {missing}"
