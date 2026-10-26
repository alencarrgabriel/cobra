"""Obrasgov adapter end to end with recorded responses (spec obras-federais)."""

import copy
import json
from collections.abc import Iterator
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Any

import httpx
import psycopg
import pytest

from cobra_collectors import runner
from cobra_collectors.sources.obrasgov import ObrasgovSource

pytestmark = pytest.mark.db

FIXTURES = Path(__file__).parent.parent / "fixtures" / "obrasgov"


def load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def page(items: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "data": items,
        "total_pages": 1,
        "total_items": len(items),
        "page_number": 1,
        "page_size": 200,
    }


def geometry(project: dict[str, Any], i: int) -> dict[str, Any]:
    return {
        "id_projeto_investimento": project["id_projeto_investimento"],
        "id_geometria": 9000 + i,
        "sg_uf": "DF",
        "no_municipio": "Brasília",
        "cod_ibge": 5300108,
        "origem_geometria": "Vetorização",
    }


class FakeObrasgov:
    """Serves the recorded responses by path, like the real API."""

    def __init__(self) -> None:
        self.projects = load("projetos-df-p1.json")["data"]
        # Optional multi-page listing; when set, it replaces `projects`.
        self.project_pages: list[list[dict[str, Any]]] | None = None
        self.calls: list[str] = []

    def __call__(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path.rsplit("/", 1)[-1]
        self.calls.append(path)
        params = request.url.params
        if path == "data-atualizacao":
            body: dict[str, Any] = load("data-atualizacao.json")
        elif path == "projeto-investimento":
            if self.project_pages is None:
                body = page(self.projects)
            else:
                n = int(params["pagina"])
                body = dict(
                    page(self.project_pages[n - 1]),
                    page_number=n,
                    total_pages=len(self.project_pages),
                )
        elif path in ("execucao-fisica", "historico-situacao-cancelada-paralisada"):
            name = "execucao" if path == "execucao-fisica" else "historico"
            fixture = FIXTURES / f"{name}-{params['id_projeto_investimento']}.json"
            body = json.loads(fixture.read_text(encoding="utf-8")) if fixture.exists() else page([])
        elif path == "geometria":
            body = page([geometry(p, i) for i, p in enumerate(self.projects)])
        else:
            return httpx.Response(404)
        return httpx.Response(200, json=body)


@pytest.fixture
def clean(autocommit_conn: psycopg.Connection) -> Iterator[psycopg.Connection]:
    def wipe() -> None:
        for sql in (
            "delete from raw.responses",
            "delete from ops.jobs",
            "delete from ops.runs",
            "delete from core.works where source = 'obrasgov'",
        ):
            autocommit_conn.execute(sql)

    wipe()
    yield autocommit_conn
    wipe()


def collect(
    db: psycopg.Connection, url: str, tmp_path: Path, fake: FakeObrasgov
) -> runner.RunSummary:
    runner.enqueue_source(db, ObrasgovSource())
    return runner.work(
        url, {"obrasgov": ObrasgovSource}, tmp_path, transport=httpx.MockTransport(fake)
    )


def test_full_load(clean: psycopg.Connection, test_database_url: str, tmp_path: Path) -> None:
    summary = collect(clean, test_database_url, tmp_path, FakeObrasgov())
    assert summary.failed == 0
    # 1 projects page + 1 geometry page + 4 detail jobs
    assert summary.done == 6

    works: dict[str, str] = dict(
        clean.execute(
            "select source_id, status::text from core.works where source = 'obrasgov'"
        ).fetchall()
    )
    assert works == {
        "30410.53-71": "completed",
        "59698.53-89": "in_progress",
        "10930.53-87": "stopped",
        "19754.53-12": "registered",
    }
    progress = clean.execute(
        "select physical_progress from core.works where source_id = '59698.53-89'"
    ).fetchone()
    assert progress == (Decimal("1.47"),)
    events = clean.execute(
        "select e.status, e.occurred_on from core.work_status_events e join core.works w "
        "on w.id = e.work_id where w.source_id = '10930.53-87'"
    ).fetchall()
    assert events == [("Paralisada", date(2025, 5, 7))]
    linked = clean.execute(
        "select count(*) from core.work_localities where locality_code = '5300108'"
    ).fetchone()
    assert linked == (4,)
    dates = clean.execute(
        "select distinct source_updated_at::date from core.works where source = 'obrasgov'"
    ).fetchall()
    assert dates == [(date(2026, 10, 23),)]


def test_recollection_updates_without_duplicating(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    fake = FakeObrasgov()
    collect(clean, test_database_url, tmp_path, fake)
    fake.projects = copy.deepcopy(fake.projects)
    next(p for p in fake.projects if p["id_projeto_investimento"] == "59698.53-89")["situacao"] = (
        "Paralisada"
    )
    collect(clean, test_database_url, tmp_path, fake)
    rows = clean.execute(
        "select count(*), max(status::text) from core.works where source_id = '59698.53-89'"
    ).fetchone()
    assert rows == (1, "stopped")
    assert clean.execute(
        "select count(*) from core.works where source = 'obrasgov'"
    ).fetchone() == (4,)
    assert clean.execute("select count(*) from core.work_status_events").fetchone() == (1,)


def test_invalid_work_blocks_the_whole_page(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    fake = FakeObrasgov()
    fake.projects = copy.deepcopy(fake.projects)
    fake.projects[1]["uf_principal"] = "GO"
    summary = collect(clean, test_database_url, tmp_path, fake)
    assert summary.failed == 1
    assert clean.execute(
        "select count(*) from core.works where source = 'obrasgov'"
    ).fetchone() == (0,)
    error = clean.execute("select last_error from ops.jobs where kind = 'projects'").fetchone()
    assert error is not None
    assert "obra 59698.53-89: UF principal 'GO', esperada DF" in error[0]


def test_failed_page_does_not_stop_the_next_one(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    fake = FakeObrasgov()
    first, second = copy.deepcopy(fake.projects[:2]), copy.deepcopy(fake.projects[2:])
    first[0]["uf_principal"] = "GO"  # structural problem: page 1 is rejected
    fake.project_pages = [first, second]
    fake.projects = first + second  # geometry still lists every work
    collect(clean, test_database_url, tmp_path, fake)
    published = {
        r[0] for r in clean.execute("select source_id from core.works where source = 'obrasgov'")
    }
    assert published == {p["id_projeto_investimento"] for p in second}


def test_inconsistent_dates_are_published_with_a_note(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    fake = FakeObrasgov()
    fake.projects = copy.deepcopy(fake.projects)
    fake.projects[0].update(dt_inicial_prevista="2025-01-10", dt_final_prevista="2024-01-10")
    summary = collect(clean, test_database_url, tmp_path, fake)
    assert summary.failed == 0
    row = clean.execute(
        "select planned_start, planned_end, quality_notes from core.works where source_id = %s",
        (fake.projects[0]["id_projeto_investimento"],),
    ).fetchone()
    assert row == (
        date(2025, 1, 10),
        date(2024, 1, 10),
        ["término previsto anterior ao início previsto, informado assim pela fonte"],
    )
