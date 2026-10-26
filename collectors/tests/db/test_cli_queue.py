"""`enqueue`, `work` and `status` commands (spec coleta-de-dados: Registro de execuções)."""

from collections.abc import Iterator
from pathlib import Path

import psycopg
import pytest
from typer.testing import CliRunner

from cobra_collectors import cli

from .example_source import ExampleSource, transport

pytestmark = pytest.mark.db

runner = CliRunner()


@pytest.fixture
def env(
    monkeypatch: pytest.MonkeyPatch,
    test_database_url: str,
    tmp_path: Path,
    autocommit_conn: psycopg.Connection,
) -> Iterator[psycopg.Connection]:
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("DATABASE_URL", test_database_url)
    monkeypatch.setenv("RAW_DATA_DIR", str(tmp_path))
    monkeypatch.setitem(cli.REGISTRY, "cobra", ExampleSource)
    monkeypatch.setattr(
        cli, "HTTP_TRANSPORT", transport({1: [{"id": 911, "sigla": "EXD", "nome": "Exemplo D"}]})
    )

    def wipe() -> None:
        for table in ("raw.responses", "ops.jobs", "ops.runs"):
            autocommit_conn.execute(f"delete from {table}")  # noqa: S608 - fixed table names
        autocommit_conn.execute("delete from core.parties where source = 'cobra'")

    wipe()
    yield autocommit_conn
    wipe()


def test_enqueue_work_and_status(env: psycopg.Connection) -> None:
    result = runner.invoke(cli.app, ["enqueue", "cobra"])
    assert result.exit_code == 0, result.output
    assert "2 tarefas novas na fila de cobra." in result.stdout

    result = runner.invoke(cli.app, ["work"])
    assert result.exit_code == 0, result.output
    assert "2 concluídas, 0 com falha (ok)" in result.stdout

    result = runner.invoke(cli.app, ["status"])
    assert result.exit_code == 0, result.output
    assert "ok · 2 concluídas, 0 com falha" in result.stdout
    assert "cobra done: 2" in result.stdout


def test_enqueue_unknown_source(env: psycopg.Connection) -> None:
    result = runner.invoke(cli.app, ["enqueue", "nada"])
    assert result.exit_code == 2
    assert "Fonte desconhecida: nada" in result.stderr


def test_status_with_no_runs(env: psycopg.Connection) -> None:
    result = runner.invoke(cli.app, ["status"])
    assert "Nenhuma execução registrada ainda." in result.stdout
