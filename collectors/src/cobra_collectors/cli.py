"""Command line entry point: `cobra-collect`."""

import typer

from cobra_collectors import config
from cobra_collectors.config import ConfigError, Settings, load_settings
from cobra_collectors.log import configure_logging
from cobra_collectors.sources import SOURCES

app = typer.Typer(help="Coletores de dados oficiais do Cobra.", no_args_is_help=True)


def _settings_or_exit() -> Settings:
    try:
        settings = load_settings(config.ENV_FILE)
    except ConfigError as error:
        typer.echo(str(error), err=True)
        raise typer.Exit(code=1) from None
    configure_logging(settings.app_env, settings.log_level)
    return settings


@app.command("check-config")
def check_config() -> None:
    """Valida a configuração e encerra."""
    _settings_or_exit()
    typer.echo("Configuração válida.")


@app.command("sources")
def sources() -> None:
    """Lista as fontes de dados registradas."""
    _settings_or_exit()
    if not SOURCES:
        typer.echo("Nenhuma fonte registrada ainda.")
        return
    for name in SOURCES:
        typer.echo(name)
