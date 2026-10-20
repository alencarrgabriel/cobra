"""Fixtures for `db` tests: a throwaway database with every migration applied."""

import os
import secrets
from collections.abc import Iterator
from pathlib import Path

import psycopg
import pytest
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict, make_conninfo

from cobra_collectors.config import REPO_ROOT

MIGRATIONS_DIR = REPO_ROOT / "supabase" / "migrations"
DEFAULT_TEST_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"


def migration_files() -> list[Path]:
    """Supabase migrations in the order the CLI applies them (timestamp prefix)."""
    return sorted(MIGRATIONS_DIR.glob("*.sql"))


def _admin_url() -> str:
    return os.environ.get("TEST_DATABASE_URL") or DEFAULT_TEST_DATABASE_URL


def _describe(url: str) -> str:
    """Host, port and database only: never print credentials."""
    info = conninfo_to_dict(url)
    return f"{info.get('host')}:{info.get('port', 5432)}/{info.get('dbname')}"


@pytest.fixture(scope="session")
def admin_url() -> str:
    return _admin_url()


@pytest.fixture(scope="session")
def test_database_url(admin_url: str) -> Iterator[str]:
    """Creates `cobra_test_<random>`, applies all migrations, drops it at the end."""
    name = f"cobra_test_{secrets.token_hex(4)}"
    try:
        admin = psycopg.connect(admin_url, autocommit=True, connect_timeout=5)
    except psycopg.OperationalError:
        pytest.exit(
            f"Postgres not reachable at {_describe(admin_url)}. "
            "Start it with `pnpm db:start` or set TEST_DATABASE_URL.",
            returncode=1,
        )
    with admin:
        admin.execute(sql.SQL("create database {}").format(sql.Identifier(name)))
        url = make_conninfo(admin_url, dbname=name)
        try:
            with psycopg.connect(url, autocommit=True) as conn:
                for migration in migration_files():
                    try:
                        conn.execute(migration.read_text(encoding="utf-8").encode())
                    except psycopg.Error as error:
                        pytest.fail(f"Migration {migration.name} failed: {error}", pytrace=False)
            yield url
        finally:
            admin.execute(
                sql.SQL("drop database if exists {} with (force)").format(sql.Identifier(name))
            )


@pytest.fixture(scope="session")
def session_conn(test_database_url: str) -> Iterator[psycopg.Connection]:
    with psycopg.connect(test_database_url) as conn:
        yield conn


@pytest.fixture
def db(session_conn: psycopg.Connection) -> Iterator[psycopg.Connection]:
    """Connection inside a transaction that is always rolled back after the test."""
    with session_conn.transaction(force_rollback=True):
        yield session_conn
