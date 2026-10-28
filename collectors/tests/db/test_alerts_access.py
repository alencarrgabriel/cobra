"""Alerts privileges (spec alertas): the site cannot read subscriptions; the alerts role manages
them but cannot change or erase the access log."""

import uuid

import psycopg
import pytest

from tests.db.test_access import as_role, expect_denied

pytestmark = pytest.mark.db


def a_subscription(db: psycopg.Connection) -> str:
    row = db.execute(
        """
        insert into alerts.subscriptions (email_lookup, email_enc, prefs_enc)
        values (%s, %s, %s) returning id
        """,
        (uuid.uuid4().bytes, b"\x00cifrado", b"\x00cifrado"),
    ).fetchone()
    assert row is not None
    return str(row[0])


def test_site_cannot_read_alerts(db: psycopg.Connection) -> None:
    a_subscription(db)
    for query in (
        "select * from alerts.subscriptions",
        "select * from alerts.links",
        "select * from alerts.access_log",
        "select * from alerts.outbox_local",
    ):
        expect_denied(db, "cobra_web_reader", query)
    expect_denied(db, "cobra_editor", "select * from alerts.subscriptions")


def test_alerts_role_manages_subscriptions_but_not_the_log(db: psycopg.Connection) -> None:
    sub = a_subscription(db)
    with as_role(db, "cobra_alerts"):
        db.execute("update alerts.subscriptions set status = 'ativa' where id = %s", (sub,))
        db.execute(
            "insert into alerts.access_log (subscription_id, action) values (%s, 'confirmacao')",
            (sub,),
        )
        db.execute("delete from alerts.subscriptions where id = %s", (sub,))
        assert db.execute(
            "select count(*) from alerts.access_log where subscription_id = %s", (sub,)
        ).fetchone() == (1,)
    expect_denied(db, "cobra_alerts", "delete from alerts.access_log")
    expect_denied(db, "cobra_alerts", "update alerts.access_log set action = 'acesso'")
    expect_denied(db, "cobra_alerts", "update core.politicians set collected_at = now()")


def test_one_subscription_per_email_lookup(db: psycopg.Connection) -> None:
    lookup = uuid.uuid4().bytes
    db.execute(
        "insert into alerts.subscriptions (email_lookup, email_enc, prefs_enc) values (%s, '', '')",
        (lookup,),
    )
    with pytest.raises(psycopg.errors.UniqueViolation), db.transaction():
        db.execute(
            "insert into alerts.subscriptions (email_lookup, email_enc, prefs_enc) "
            "values (%s, '', '')",
            (lookup,),
        )


def test_deliveries_go_away_with_the_subscription(db: psycopg.Connection) -> None:
    sub = a_subscription(db)
    with as_role(db, "cobra_alerts"):
        db.execute(
            "insert into alerts.deliveries (subscription_id, week_start, vote_ids, status) "
            "values (%s, '2026-06-08', '{1,2}', 'enviado')",
            (sub,),
        )
        db.execute("delete from alerts.subscriptions where id = %s", (sub,))
        assert db.execute(
            "select count(*) from alerts.deliveries where subscription_id = %s", (sub,)
        ).fetchone() == (0,)
    expect_denied(db, "cobra_web_reader", "select * from alerts.deliveries")


def test_one_delivery_per_week_starting_on_monday(db: psycopg.Connection) -> None:
    sub = a_subscription(db)
    insert = (
        "insert into alerts.deliveries (subscription_id, week_start, vote_ids, status) "
        "values (%s, %s, '{}', 'enviado')"
    )
    db.execute(insert, (sub, "2026-06-08"))
    with pytest.raises(psycopg.errors.UniqueViolation), db.transaction():
        db.execute(insert, (sub, "2026-06-08"))
    with pytest.raises(psycopg.errors.CheckViolation), db.transaction():
        db.execute(insert, (sub, "2026-06-10"))
