"""Command line entry point: `cobra-collect`."""

import httpx
import psycopg
import typer

from cobra_collectors import config, runner
from cobra_collectors.config import ConfigError, Settings, load_settings
from cobra_collectors.log import configure_logging
from cobra_collectors.sources import REGISTRY

__all__ = ["HTTP_TRANSPORT", "REGISTRY", "app"]

app = typer.Typer(help="Coletores de dados oficiais do Cobra.", no_args_is_help=True)

# Tests swap in a mocked transport so `work` never touches the network.
HTTP_TRANSPORT: httpx.BaseTransport | None = None


def _settings_or_exit() -> Settings:
    try:
        settings = load_settings(config.ENV_FILE)
    except ConfigError as error:
        typer.echo(str(error), err=True)
        raise typer.Exit(code=1) from None
    configure_logging(settings.app_env, settings.log_level)
    return settings


def _db_url(settings: Settings) -> str:
    return str(settings.database_url)


@app.command("check-config")
def check_config() -> None:
    """Valida a configuração e encerra."""
    _settings_or_exit()
    typer.echo("Configuração válida.")


@app.command("sources")
def sources() -> None:
    """Lista as fontes de dados registradas."""
    _settings_or_exit()
    if not REGISTRY:
        typer.echo("Nenhuma fonte registrada ainda.")
        return
    for name in sorted(REGISTRY):
        typer.echo(name)


@app.command("enqueue")
def enqueue(source: str = typer.Argument(..., help="Nome da fonte, ex.: camara")) -> None:
    """Coloca na fila todas as tarefas de uma atualização completa da fonte."""
    settings = _settings_or_exit()
    factory = REGISTRY.get(source)
    if factory is None:
        typer.echo(f"Fonte desconhecida: {source}. Use `cobra-collect sources`.", err=True)
        raise typer.Exit(code=2)
    with psycopg.connect(_db_url(settings), autocommit=True) as conn:
        queued = runner.enqueue_source(conn, factory())
    typer.echo(f"{queued} tarefas novas na fila de {source}.")


@app.command("work")
def work(
    source: str | None = typer.Option(None, help="Processar só esta fonte."),
    max_jobs: int | None = typer.Option(None, help="Parar depois de N tarefas."),
) -> None:
    """Processa tarefas da fila até esvaziar (ou até --max-jobs)."""
    settings = _settings_or_exit()
    summary = runner.work(
        _db_url(settings),
        REGISTRY,
        settings.raw_data_dir,
        only=source,
        max_jobs=max_jobs,
        transport=HTTP_TRANSPORT,
    )
    typer.echo(
        f"Execução {summary.run_id}: {summary.done} concluídas, {summary.failed} com falha "
        f"({summary.status})."
    )
    if summary.status == "failed":
        raise typer.Exit(code=1)


@app.command("status")
def status() -> None:
    """Mostra a última execução e as tarefas por situação, por fonte."""
    settings = _settings_or_exit()
    with psycopg.connect(_db_url(settings)) as conn:
        report = runner.status(conn)
    if not report["runs"] and not report["jobs"]:
        typer.echo("Nenhuma execução registrada ainda.")
        return
    for run in report["runs"]:
        finished = (
            run["finished_at"].isoformat(timespec="seconds")
            if run["finished_at"]
            else "em andamento"
        )
        typer.echo(
            f"{run['source']}: última execução {finished} · {run['status']} · "
            f"{run['jobs_done']} concluídas, {run['jobs_failed']} com falha"
        )
    for row in report["jobs"]:
        typer.echo(f"  {row['source']} {row['status']}: {row['total']}")
