"""The `expenses` job of the `camara` and `senado` adapters: one year of quota expenses, written
again in full. See design D1 to D3 of openspec change `ingestao-despesas`."""

import zipfile
from collections.abc import Iterable
from datetime import UTC, datetime

import psycopg

from cobra_collectors.pipeline import Context
from cobra_collectors.sources.despesas_model import (
    Expense,
    UnreadableExpenseError,
    camara_url,
    read_camara,
    read_senado,
    senado_url,
)
from cobra_collectors.sources.votes_store import linked_members

# Below this many members with expenses in a year, the file is taken as incomplete (D3).
MIN_MEMBERS = {"camara": 50, "senado": 30}


def collect_camara(ctx: Context, year: int) -> None:
    url = camara_url(year)
    saved = ctx.fetch_file(url)
    if saved.file_path is None:  # pragma: no cover - fetch_file always writes a file
        raise RuntimeError("download without a file")
    try:
        with zipfile.ZipFile(saved.file_path) as archive:
            expenses = [e for e in read_camara(archive) if e.year == year]
    except UnreadableExpenseError as error:
        ctx.validate(False, str(error))
    _save(ctx, "camara", year, expenses, url)


def collect_senado(ctx: Context, year: int) -> None:
    url = senado_url(year)
    response = ctx.fetch(url)
    response.raise_for_status()
    try:
        expenses = [e for e in read_senado(response.json() or []) if e.year == year]
    except UnreadableExpenseError as error:
        ctx.validate(False, str(error))
    _save(ctx, "senado", year, expenses, url)


def _save(
    ctx: Context,
    house: str,
    year: int,
    expenses: Iterable[Expense],
    url: str,
) -> None:
    rows = list(expenses)
    if not rows:
        return
    members = len({e.member_id for e in rows})
    ctx.validate(
        members >= MIN_MEMBERS[house],
        f"despesas de só {members} parlamentares em {year} ({house})",
    )
    db: psycopg.Connection = ctx.db
    found = db.execute("select id from core.legislative_houses where slug = %s", (house,))
    house_row = found.fetchone()
    if house_row is None:  # pragma: no cover - seeded by the migrations
        raise RuntimeError(f"{house} missing from core.legislative_houses")
    linked = linked_members(db, house)
    db.execute("delete from core.expenses where source::text = %s and year = %s", (house, year))
    now = datetime.now(UTC)
    with (
        db.cursor() as cur,
        cur.copy(
            "copy core.expenses (house_id, external_id, politician_id, year, month, category, "
            "supplier_kind, supplier_name, supplier_cnpj, issued_on, value, document_url, source, "
            "source_id, source_url, collected_at) from stdin"
        ) as copy,
    ):
        for e in rows:
            copy.write_row(
                (house_row[0], e.member_id, linked.get(e.member_id), e.year, e.month,
                 e.category, e.supplier_kind, e.supplier_name, e.supplier_cnpj, e.issued_on,
                 e.value, e.document_url, house, e.source_id, url, now)
            )  # fmt: skip
