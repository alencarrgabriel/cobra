"""Small quota-expense files shaped like the Câmara ZIP and the Senado JSON, for tests."""

import io
import zipfile
from typing import Any

CAMARA_HEADER = ["txNomeParlamentar", "cpf", "ideCadastro", "nuCarteiraParlamentar",
                 "nuLegislatura", "sgUF", "sgPartido", "codLegislatura", "numSubCota",
                 "txtDescricao", "numEspecificacaoSubCota", "txtDescricaoEspecificacao",
                 "txtFornecedor", "txtCNPJCPF", "txtNumero", "indTipoDocumento", "datEmissao",
                 "vlrDocumento", "vlrGlosa", "vlrLiquido", "numMes", "numAno", "numParcela",
                 "txtPassageiro", "txtTrecho", "numLote", "numRessarcimento",
                 "datPagamentoRestituicao", "vlrRestituicao", "nuDeputadoId", "ideDocumento",
                 "urlDocumento"]  # fmt: skip


def camara_row(  # noqa: PLR0913 - one argument per CSV field a test changes
    member: str,
    doc: str,
    category: str,
    supplier: str,
    document: str,
    value: str,
    *,
    passenger: str = "",
    month: str = "6",
) -> dict[str, str]:
    return {"txNomeParlamentar": "Deputada Teste", "cpf": "11111111111", "ideCadastro": member,
            "sgUF": "DF", "txtDescricao": category, "txtFornecedor": supplier,
            "txtCNPJCPF": document, "datEmissao": "2026-06-10T00:00:00", "vlrLiquido": value,
            "numMes": month, "numAno": "2026", "txtPassageiro": passenger,
            "txtTrecho": "BSB/GRU" if passenger else "", "ideDocumento": doc,
            "urlDocumento": f"https://www.camara.leg.br/cota-parlamentar/{doc}.pdf"}  # fmt: skip


def camara_zip(rows: list[dict[str, str]]) -> bytes:
    lines = [";".join(f'"{h}"' for h in CAMARA_HEADER)]
    lines += [";".join(f'"{r.get(h, "")}"' for h in CAMARA_HEADER) for r in rows]
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("Ano-2026.csv", ("﻿" + "\r\n".join(lines)).encode("utf-8"))
    return buffer.getvalue()


def senado_item(item_id: int, member: int, supplier: str, document: str,
                value: float) -> dict[str, Any]:  # fmt: skip
    return {"id": item_id, "tipoDocumento": "Nota Fiscal", "ano": 2026, "mes": 7,
            "codSenador": member, "nomeSenador": "SENADORA TESTE",
            "tipoDespesa": "Locomoção, hospedagem, alimentação, combustíveis e lubrificantes",
            "cpfCnpj": document, "fornecedor": supplier, "documento": "4349",
            "data": "2026-07-02", "detalhamento": "Viagem a Taguatinga com JOSE",
            "valorReembolsado": value}  # fmt: skip
