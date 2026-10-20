"""Database roles and privileges (spec acesso-ao-banco)."""

from collections.abc import Iterator
from contextlib import contextmanager

import psycopg
import pytest
from psycopg import sql

pytestmark = pytest.mark.db

Denied = psycopg.errors.InsufficientPrivilege


@contextmanager
def as_role(db: psycopg.Connection, role: str) -> Iterator[None]:
    """Run statements as `role` inside a savepoint; errors roll back to it."""
    with db.transaction():
        # Since Postgres 16 a role's creator holds ADMIN but not SET on it; this
        # grant only lives inside the test transaction.
        db.execute(sql.SQL("grant {} to current_user").format(sql.Identifier(role)))
        db.execute(sql.SQL("set local role {}").format(sql.Identifier(role)))
        yield
        db.execute("reset role")


def expect_denied(db: psycopg.Connection, role: str, statement: str) -> None:
    with pytest.raises(Denied), as_role(db, role):
        db.execute(statement)


def test_site_reads_mandates(db: psycopg.Connection) -> None:
    with as_role(db, "cobra_web_reader"):
        db.execute("select count(*) from core.mandates").fetchone()
        db.execute("select count(*) from core.localities").fetchone()


@pytest.mark.parametrize(
    "statement",
    [
        "insert into core.politicians (civil_name, parliamentary_name, source, collected_at) "
        "values ('A', 'A', 'cobra', now())",
        "update core.politicians set civil_name = 'B'",
        "delete from core.politicians",
        "update core.localities set name = 'X' where ibge_code = '53'",
    ],
)
def test_site_cannot_write(db: psycopg.Connection, statement: str) -> None:
    expect_denied(db, "cobra_web_reader", statement)


def test_site_cannot_read_cpf(db: psycopg.Connection) -> None:
    expect_denied(db, "cobra_web_reader", "select cpf from restricted.politician_private_ids")


def test_collector_writes_a_party(db: psycopg.Connection) -> None:
    with as_role(db, "cobra_collector"):
        db.execute(
            "insert into core.parties (acronym, name, source, collected_at) "
            "values ('COL', 'Partido Coletado', 'tse', now())"
        )
        db.execute("select count(*) from restricted.politician_private_ids").fetchone()


@pytest.mark.parametrize(
    "statement",
    ["create table core.collector_probe (id int)", "drop table core.parties"],
)
def test_collector_cannot_change_the_schema(db: psycopg.Connection, statement: str) -> None:
    with (
        pytest.raises((Denied, psycopg.errors.InsufficientPrivilege)),
        as_role(db, "cobra_collector"),
    ):
        db.execute(statement)


def test_supabase_anonymous_role_has_no_access(db: psycopg.Connection) -> None:
    exists = db.execute("select 1 from pg_roles where rolname = 'anon'").fetchone()
    if exists is None:
        pytest.skip("role `anon` only exists on Supabase")
    expect_denied(db, "anon", "select * from core.politicians")
