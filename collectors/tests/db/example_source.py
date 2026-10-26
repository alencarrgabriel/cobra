"""A fake source used only by tests: fetches parties from a mocked API and publishes them."""

import json
from collections.abc import Iterable
from typing import Any

import httpx

from cobra_collectors.pipeline import Context, JobSpec

API = "https://dados.exemplo.gov.br/api/partidos"


class ExampleSource:
    name = "cobra"  # an existing core.data_source value; this source never runs in production
    rate_per_second = 1000.0
    burst = 1000

    def plan(self) -> Iterable[JobSpec]:
        return [JobSpec("partidos", f"pagina-{n}", {"pagina": n}) for n in (1, 2)]

    def handle(self, ctx: Context) -> None:
        page = ctx.job.payload["pagina"]
        response = ctx.fetch(API, {"pagina": page})
        response.raise_for_status()
        for item in response.json()["dados"]:
            ctx.validate(bool(item["sigla"]), f"partido {item['id']} sem sigla")
            ctx.db.execute(
                """
                insert into core.parties
                  (acronym, name, source, source_id, source_url, collected_at)
                values (%s, %s, 'cobra', %s, %s, now())
                on conflict (source, source_id) do update
                  set acronym = excluded.acronym, name = excluded.name,
                      collected_at = excluded.collected_at
                """,
                (item["sigla"], item["nome"], str(item["id"]), f"{API}/{item['id']}"),
            )


def transport(pages: dict[int, list[dict[str, Any]]], status: int = 200) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        page = int(request.url.params["pagina"])
        return httpx.Response(
            status,
            content=json.dumps({"dados": pages.get(page, [])}).encode(),
            headers={"content-type": "application/json"},
        )

    return httpx.MockTransport(handler)
