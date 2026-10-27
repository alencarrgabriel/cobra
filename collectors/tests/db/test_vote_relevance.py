"""Objective relevance criteria and events (spec relevancia), computed by the database."""

import psycopg
import pytest

pytestmark = pytest.mark.db


def add_vote(  # noqa: PLR0913 - one argument per field the criteria read
    db: psycopg.Connection,
    sid: str,
    *,
    yes: int,
    no: int,
    other: int = 0,
    nominal: bool = True,
    kind: str | None = "PL",
    orientations: dict[str, str] | None = None,
) -> int:
    row = db.execute(
        """
        insert into core.votes (house_id, occurred_on, organ, description, yes, no, other,
          nominal, proposition_label, proposition_type, source, source_id, collected_at)
        select id, '2026-06-10', 'PLEN', 'Teste', %s, %s, %s, %s, %s, %s, 'camara', %s, now()
        from core.legislative_houses where slug = 'camara'
        returning id
        """,
        (yes, no, other, nominal, f"{kind} 1/2026" if kind else None, kind, sid),
    ).fetchone()
    assert row is not None
    for bench, orientation in (orientations or {}).items():
        db.execute(
            """
            insert into core.vote_orientations (vote_id, bench, orientation, source, source_id,
              collected_at)
            values (%s, %s, %s, 'camara', %s, now())
            """,
            (row[0], bench, orientation, f"{sid}:{bench}"),
        )
    return int(row[0])


def criteria(db: psycopg.Connection, vote_id: int) -> list[str] | None:
    row = db.execute(
        "select criteria from core.vote_relevance where vote_id = %s", (vote_id,)
    ).fetchone()
    return None if row is None else list(row[0])


def test_each_criterion(db: psycopg.Connection) -> None:
    diverge = add_vote(db, "r1", yes=300, no=100,
                       orientations={"Governo": "sim", "Oposição": "nao"})  # fmt: skip
    liberado = add_vote(db, "r2", yes=300, no=100,
                        orientations={"Governo": "sim", "Oposição": "liberado"})  # fmt: skip
    close = add_vote(db, "r3", yes=230, no=200, other=10)
    pec = add_vote(db, "r4", yes=400, no=20, kind="PEC")
    plain = add_vote(db, "r5", yes=400, no=20)
    assert criteria(db, diverge) == ["divergencia"]
    assert criteria(db, liberado) == []
    assert criteria(db, close) == ["placar_disputado"]
    assert criteria(db, pec) == ["tipo_de_materia"]
    assert criteria(db, plain) == []


def test_curation_and_symbolic_votes(db: psycopg.Connection) -> None:
    curated = add_vote(db, "r6", yes=400, no=20)
    db.execute(
        """
        insert into core.vote_curation (vote_id, justification, curated_by, curated_at)
        values (%s, 'Primeira votação da reforma do setor elétrico.', 'editora', now())
        """,
        (curated,),
    )
    symbolic = add_vote(db, "r7", yes=0, no=0, nominal=False, kind="PEC")
    assert criteria(db, curated) == ["curadoria"]
    assert criteria(db, symbolic) is None  # never a relevant vote
    events: dict[int, str] = dict(
        db.execute(
            "select vote_id, kind from core.events where vote_id = any(%s)", ([curated, symbolic],)
        ).fetchall()
    )
    assert events == {curated: "votacao_relevante", symbolic: "votacao_simbolica"}
