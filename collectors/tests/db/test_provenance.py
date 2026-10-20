"""Every public-data table carries provenance columns (spec rastreabilidade-de-dados)."""

import psycopg
import pytest

pytestmark = pytest.mark.db

PROVENANCE_SCHEMAS = ("core", "restricted")

# column -> (type as reported by format_type, NOT NULL)
PROVENANCE_COLUMNS = {
    "source": ("core.data_source", True),
    "source_id": ("text", False),
    "source_url": ("text", False),
    "collected_at": ("timestamp with time zone", True),
    "source_updated_at": ("timestamp with time zone", False),
}


def provenance_violations(conn: psycopg.Connection) -> list[str]:
    rows = conn.execute(
        """
        select c.relnamespace::regnamespace::text || '.' || c.relname as table_name,
               a.attname, format_type(a.atttypid, a.atttypmod), a.attnotnull
        from pg_class c
        left join pg_attribute a
               on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
        where c.relkind in ('r', 'p')
          and c.relnamespace::regnamespace::text = any(%s)
        """,
        (list(PROVENANCE_SCHEMAS),),
    ).fetchall()
    tables: dict[str, dict[str, tuple[str, bool]]] = {}
    for table, column, data_type, not_null in rows:
        tables.setdefault(table, {})[column] = (data_type, not_null)

    violations = []
    for table, columns in sorted(tables.items()):
        for column, expected in PROVENANCE_COLUMNS.items():
            actual = columns.get(column)
            if actual != expected:
                violations.append(f"{table}.{column}: expected {expected}, found {actual}")
    return violations


def test_every_public_data_table_has_provenance_columns(db: psycopg.Connection) -> None:
    assert provenance_violations(db) == []


def test_a_table_without_provenance_is_reported(db: psycopg.Connection) -> None:
    db.execute("create table core.provenance_probe (id int)")
    violations = provenance_violations(db)
    assert "core.provenance_probe.source: expected ('core.data_source', True), found None" in (
        violations
    )
    assert len([v for v in violations if v.startswith("core.provenance_probe.")]) == len(
        PROVENANCE_COLUMNS
    )
