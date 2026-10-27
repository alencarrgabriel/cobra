"""IBGE adapter: the municipalities of Brazil (API de localidades). See design D1 and D2 of
openspec change `municipios-ibge`."""

import re
from collections.abc import Iterable
from typing import Any

from cobra_collectors.pipeline import Context, JobSpec
from cobra_collectors.sources.senado_model import normalize_name

SOURCE = "ibge"
API = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios"
MIN_MUNICIPALITIES = 5000
CODE = re.compile(r"^\d{7}$")


def search_name(name: str) -> str:
    """Accent-free, lower case, single spaces: "São Paulo" → "sao paulo"."""
    return normalize_name(name).lower()


def validate(
    items: list[dict[str, Any]], ufs: set[str], minimum: int = MIN_MUNICIPALITIES
) -> list[str]:
    problems = []
    if len(items) < minimum:
        problems.append(f"só {len(items)} municípios na resposta (mínimo {minimum})")
    for item in items:
        code = str(item.get("municipio-id") or "")
        if not CODE.match(code) or not item.get("municipio-nome"):
            problems.append(f"município inválido: {item!r:.80}")
        elif code[:2] not in ufs:
            problems.append(f"município {code}: UF {code[:2]} não cadastrada")
    return problems


class IbgeSource:
    name = SOURCE
    rate_per_second = 1.0
    burst = 1

    def __init__(self, minimum: int = MIN_MUNICIPALITIES) -> None:
        # A short answer means a broken response, not fewer municipalities (design D1).
        self.minimum = minimum

    def plan(self) -> Iterable[JobSpec]:
        return [JobSpec("municipalities", "run", {})]

    def handle(self, ctx: Context) -> None:
        if ctx.job.kind != "municipalities":
            raise ValueError(f"unknown job kind {ctx.job.kind!r}")
        response = ctx.fetch(API, {"view": "nivelado"})
        response.raise_for_status()
        items: list[dict[str, Any]] = response.json()
        ufs = {
            r[0] for r in ctx.db.execute("select ibge_code from core.localities where kind = 'uf'")
        }
        problems = validate(items, ufs, self.minimum)
        ctx.validate(not problems, "; ".join(problems[:5]))
        for item in items:
            code, name = str(item["municipio-id"]), str(item["municipio-nome"]).strip()
            ctx.db.execute(
                """
                insert into core.localities (ibge_code, kind, name, uf_code, uf_abbr, search_name,
                  source, source_id, source_url, collected_at)
                values (%s, 'municipality', %s, %s, %s, %s, 'ibge', %s, %s, now())
                on conflict (ibge_code) do update set
                  name = excluded.name, search_name = excluded.search_name,
                  collected_at = excluded.collected_at
                """,
                (code, name, code[:2], item["UF-sigla"], search_name(name), code, API),
            )
