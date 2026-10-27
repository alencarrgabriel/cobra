"""Spec receitas-de-campanha: origins, funds and aggregation (pure)."""

import io
import zipfile
from decimal import Decimal

from cobra_collectors.sources.tse_receitas_model import Summary, rows_of, summarize
from tests.tse_files import RECEIPT_HEADER, receipt, tse_zip

PF, PARTY, OWN = "10010200", "10020000", "10010100"


def summaries(rows: list[str], wanted: set[str]) -> list[Summary]:
    data = tse_zip("receitas_candidatos_2022", RECEIPT_HEADER, {"BRASIL": rows})
    return summarize(rows_of(zipfile.ZipFile(io.BytesIO(data)), 2022), 2022, wanted)


def test_private_persons_are_only_counted_and_summed() -> None:
    result = summaries(
        [receipt(sq="1", origin=PF, value="100,00", document="11111111111"),
         receipt(sq="1", origin=PF, value="50,00", document="11111111111"),
         receipt(sq="1", origin="10010400", value="10,00", document="22222222222",
                 donor="JOSE")],
        {"1"},
    )  # fmt: skip
    assert result == [Summary("1", "pessoas_fisicas", "outros", None, 3, 2, Decimal("160.00"))]
    assert "MARIA" not in repr(result) and "11111111111" not in repr(result)


def test_party_donors_keep_the_directory_name_and_the_fund() -> None:
    result = summaries(
        [receipt(sq="1", origin=PARTY, fund="2", value="100000,00", donor="PARTIDO X - DF",
                 document="00000000000100"),
         receipt(sq="1", origin=OWN, value="5000,00", donor="A PROPRIA")],
        {"1"},
    )  # fmt: skip
    assert result == [
        Summary("1", "partidos", "fefc", "PARTIDO X - DF", 1, None, Decimal("100000.00")),
        Summary("1", "proprios", "outros", None, 1, None, Decimal("5000.00")),
    ]


def test_ignores_candidacies_outside_the_registry_and_unknown_origins_go_to_other() -> None:
    result = summaries(
        [receipt(sq="9", origin=PF, value="1,00"), receipt(sq="1", origin="-1", value="2,00")],
        {"1"},
    )
    assert [(s.tse_id, s.origin) for s in result] == [("1", "outras")]
