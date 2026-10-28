"""Editorial panel privileges (spec painel-editorial): the site never reads drafts; the editor
writes summaries and the log but cannot change or erase the log."""

import psycopg
import pytest

from tests.db.test_access import as_role, expect_denied

pytestmark = pytest.mark.db


def a_vote(db: psycopg.Connection) -> int:
    row = db.execute(
        """
        insert into core.votes (house_id, occurred_on, organ, description, yes, no, other,
          nominal, source, source_id, collected_at)
        select id, '2026-06-10', 'PLEN', 'Teste', 300, 100, 0, true, 'camara', 'ed-1', now()
        from core.legislative_houses where slug = 'camara'
        returning id
        """
    ).fetchone()
    assert row is not None
    return int(row[0])


TEXT = "O projeto muda a regra de teste. A favor: autores dizem X. Contra: críticos dizem Y."


def test_site_reads_only_published_summaries(db: psycopg.Connection) -> None:
    vote = a_vote(db)
    db.execute(
        """
        insert into editorial.vote_summaries (vote_id, version, text, status, author)
        values (%s, 1, %s, 'rascunho', 'editora@cobra.test')
        """,
        (vote, TEXT),
    )
    expect_denied(db, "cobra_web_reader", "select * from editorial.vote_summaries")
    expect_denied(db, "cobra_web_reader", "select * from editorial.editors")
    with as_role(db, "cobra_web_reader"):
        assert db.execute("select count(*) from core.published_summaries").fetchone() == (0,)
    db.execute(
        """
        update editorial.vote_summaries set status = 'publicado', approved_by = 'editora',
          approved_at = now() where vote_id = %s
        """,
        (vote,),
    )
    with as_role(db, "cobra_web_reader"):
        assert db.execute(
            "select text from core.published_summaries where vote_id = %s", (vote,)
        ).fetchone() == (TEXT,)


def test_editor_writes_but_cannot_rewrite_the_log(db: psycopg.Connection) -> None:
    vote = a_vote(db)
    with as_role(db, "cobra_editor"):
        db.execute(
            """
            insert into editorial.vote_summaries (vote_id, version, text, status, author)
            values (%s, 1, %s, 'rascunho', 'editora@cobra.test')
            """,
            (vote, TEXT),
        )
        db.execute(
            "insert into editorial.log (editor, action, vote_id, version) "
            "values ('editora@cobra.test', 'rascunho', %s, 1)",
            (vote,),
        )
    expect_denied(db, "cobra_editor", "delete from editorial.log")
    expect_denied(db, "cobra_editor", "update editorial.log set editor = 'outra'")
    expect_denied(db, "cobra_editor", "update core.votes set yes = 0")


def test_one_published_version_per_vote(db: psycopg.Connection) -> None:
    vote = a_vote(db)
    for version in (1, 2):
        db.execute(
            """
            insert into editorial.vote_summaries (vote_id, version, text, status, author,
              approved_by, approved_at)
            values (%s, %s, %s, 'publicado', 'editora', 'editora', now())
            """
            if version == 1
            else """
            insert into editorial.vote_summaries (vote_id, version, text, status, author)
            values (%s, %s, %s, 'rascunho', 'editora')
            """,
            (vote, version, TEXT),
        )
    with pytest.raises(psycopg.errors.UniqueViolation), db.transaction():
        db.execute(
            """
            update editorial.vote_summaries set status = 'publicado', approved_by = 'editora',
              approved_at = now() where vote_id = %s and version = 2
            """,
            (vote,),
        )


def test_published_summary_keeps_the_ai_mark_after_an_edit(db: psycopg.Connection) -> None:
    vote = a_vote(db)
    db.execute(
        """
        insert into editorial.vote_summaries (vote_id, version, text, status, author, ai_model)
        values (%s, 1, %s, 'rascunho', 'editora', 'claude-haiku-5-5')
        """,
        (vote, TEXT),
    )
    db.execute(
        """
        insert into editorial.vote_summaries (vote_id, version, text, status, author,
          approved_by, approved_at)
        values (%s, 2, %s, 'publicado', 'editora', 'editora', now())
        """,
        (vote, TEXT + " Revisado."),
    )
    assert db.execute(
        "select ai_model from core.published_summaries where vote_id = %s", (vote,)
    ).fetchone() == ("claude-haiku-5-5",)
