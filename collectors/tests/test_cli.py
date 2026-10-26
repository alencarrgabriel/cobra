import pytest
from typer.testing import CliRunner

from cobra_collectors.cli import app

runner = CliRunner()


def test_check_config_fails_without_database_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "test")
    result = runner.invoke(app, ["check-config"])
    assert result.exit_code != 0
    assert "DATABASE_URL" in result.stderr


@pytest.mark.usefixtures("valid_environment")
def test_check_config_accepts_valid_configuration() -> None:
    result = runner.invoke(app, ["check-config"])
    assert result.exit_code == 0
    assert "Configuração válida." in result.stdout


@pytest.mark.usefixtures("valid_environment")
def test_sources_lists_registered_adapters() -> None:
    result = runner.invoke(app, ["sources"])
    assert result.exit_code == 0
    assert "obrasgov" in result.stdout
