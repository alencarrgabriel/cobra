import psycopg
import pytest

pytestmark = pytest.mark.db


def test_runs_in_a_throwaway_database(db: psycopg.Connection) -> None:
    name = db.execute("select current_database()").fetchone()
    assert name is not None
    assert name[0].startswith("cobra_test_")


def test_changes_do_not_reach_the_admin_database(db: psycopg.Connection, admin_url: str) -> None:
    db.execute("create table harness_probe (id int)")
    with psycopg.connect(admin_url) as admin:
        found = admin.execute("select to_regclass('public.harness_probe')").fetchone()
    assert found == (None,)


def test_each_test_is_rolled_back(db: psycopg.Connection) -> None:
    found = db.execute("select to_regclass('public.harness_probe')").fetchone()
    assert found == (None,)
