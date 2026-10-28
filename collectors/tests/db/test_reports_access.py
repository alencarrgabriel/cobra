"""Report privileges (spec reporte-de-erro): the site reads only the public queue, the form
role only inserts, and editors cannot rewrite the triage history."""

import psycopg
import pytest

from tests.db.test_access import as_role, expect_denied

pytestmark = pytest.mark.db

TEXT = "O valor da obra está diferente do que aparece no Obrasgov."


def a_report(db: psycopg.Connection) -> int:
    with as_role(db, "cobra_reports"):
        row = db.execute(
            """
            insert into reports.reports (page_path, kind, description, email_enc, due_on)
            values ('/obras/1', 'erro', %s, %s, '2026-06-15') returning id
            """,
            (TEXT, b"cifrado"),
        ).fetchone()
    assert row is not None
    return int(row[0])


def test_site_reads_only_the_public_queue(db: psycopg.Connection) -> None:
    report = a_report(db)
    expect_denied(db, "cobra_web_reader", "select description from reports.reports")
    expect_denied(db, "cobra_web_reader", "select * from reports.history")
    with as_role(db, "cobra_web_reader"):
        row = db.execute(
            "select status, page_path from core.public_reports where id = %s", (report,)
        ).fetchone()
    assert row == ("recebido", "/obras/1")


def test_form_role_only_inserts(db: psycopg.Connection) -> None:
    a_report(db)
    expect_denied(db, "cobra_reports", "select description from reports.reports")
    expect_denied(db, "cobra_reports", "select email_enc from reports.reports")
    expect_denied(db, "cobra_reports", "update reports.reports set status = 'corrigido'")
    expect_denied(db, "cobra_reports", "delete from reports.reports")
    with as_role(db, "cobra_reports"):
        assert db.execute(
            "select count(*) from reports.reports where created_at > now() - interval '1 day'"
        ).fetchone() == (1,)


def test_editor_triages_but_cannot_rewrite_history(db: psycopg.Connection) -> None:
    report = a_report(db)
    with as_role(db, "cobra_editor"):
        db.execute(
            """
            update reports.reports set status = 'corrigido', public_note = %s,
              closed_at = now(), closed_by = 'editora' where id = %s
            """,
            (TEXT, report),
        )
        db.execute(
            "insert into reports.history (report_id, editor, status, public_note) "
            "values (%s, 'editora', 'corrigido', %s)",
            (report, TEXT),
        )
    expect_denied(db, "cobra_editor", "delete from reports.history")
    expect_denied(db, "cobra_editor", "update reports.history set editor = 'outra'")
    expect_denied(db, "cobra_editor", "delete from reports.reports")


def test_closing_needs_a_public_note(db: psycopg.Connection) -> None:
    report = a_report(db)
    with pytest.raises(psycopg.errors.CheckViolation), db.transaction():
        db.execute(
            "update reports.reports set status = 'corrigido', closed_at = now() where id = %s",
            (report,),
        )
