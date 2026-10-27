"""Small TSE-shaped ZIPs for tests: one latin-1 `;` CSV per UF, with the real column names."""

import io
import zipfile

CANDIDACY_HEADER = ("DT_GERACAO;HH_GERACAO;ANO_ELEICAO;CD_TIPO_ELEICAO;NM_TIPO_ELEICAO;NR_TURNO;"
    "CD_ELEICAO;DS_ELEICAO;DT_ELEICAO;TP_ABRANGENCIA;SG_UF;SG_UE;NM_UE;CD_CARGO;DS_CARGO;"
    "SQ_CANDIDATO;NR_CANDIDATO;NM_CANDIDATO;NM_URNA_CANDIDATO;NM_SOCIAL_CANDIDATO;"
    "NR_CPF_CANDIDATO;DS_EMAIL;CD_SITUACAO_CANDIDATURA;DS_SITUACAO_CANDIDATURA;TP_AGREMIACAO;"
    "NR_PARTIDO;SG_PARTIDO;NM_PARTIDO;SG_UF_NASCIMENTO;DT_NASCIMENTO;"
    "NR_TITULO_ELEITORAL_CANDIDATO;DS_GENERO;DS_COR_RACA;CD_SIT_TOT_TURNO;"
    "DS_SIT_TOT_TURNO")  # fmt: skip
VOTE_HEADER = ("DT_GERACAO;ANO_ELEICAO;CD_TIPO_ELEICAO;NM_TIPO_ELEICAO;NR_TURNO;SG_UF;NR_ZONA;"
               "DS_CARGO;"
               "SQ_CANDIDATO;NM_CANDIDATO;QT_VOTOS_NOMINAIS;DS_SIT_TOT_TURNO")  # fmt: skip


def candidacy(  # noqa: PLR0913 - one keyword per CSV field a test may change
    *,
    year: int,
    sq: str,
    name: str,
    birth: str,
    cpf: str = "-4",
    office: str = "DEPUTADO FEDERAL",
    uf: str = "DF",
    unit: str = "DISTRITO FEDERAL",
    party: str = "PL",
    ballot: str = "NOME DE URNA",
    number: str = "2222",
    result: str = "ELEITO",
    round_: int = 1,
    kind: str = "2",
    kind_name: str = "ELEIÇÃO ORDINÁRIA",
) -> str:
    fields = ["27/10/2026", "10:00:00", str(year), kind, kind_name, str(round_),
              "1", f"ELEIÇÕES {year}", "02/10/2022", "E", uf, uf, unit, "6", office, sq, number,
              name, ballot, "#NULO#", cpf, "email@exemplo.org", "12", "APTO", "PARTIDO ISOLADO",
              "22", party, "PARTIDO", "DF", birth, "000000000000", "FEMININO", "PARDA", "2",
              result]  # fmt: skip
    return ";".join(f'"{f}"' for f in fields)


def vote(*, sq: str, votes: int, zone: int = 1, round_: int = 1, kind: str = "2") -> str:
    name = "ELEIÇÃO ORDINÁRIA" if kind == "2" else "ELEIÇÃO SUPLEMENTAR"
    fields = ["27/10/2026", "2022", kind, name, str(round_), "DF", str(zone),
              "DEPUTADO FEDERAL", sq, "X", str(votes), "ELEITO"]  # fmt: skip
    return ";".join(f'"{f}"' for f in fields)


def tse_zip(prefix: str, header: str, rows_by_uf: dict[str, list[str]]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("leiame.pdf", b"%PDF-1.4")
        for uf, rows in rows_by_uf.items():
            text = "\n".join(['"' + header.replace(";", '";"') + '"', *rows]) + "\n"
            archive.writestr(f"{prefix}_{uf}.csv", text.encode("latin1"))
    return buffer.getvalue()


ASSET_HEADER = ("DT_GERACAO;HH_GERACAO;ANO_ELEICAO;CD_TIPO_ELEICAO;NM_TIPO_ELEICAO;CD_ELEICAO;"
    "DS_ELEICAO;DT_ELEICAO;SG_UF;SG_UE;NM_UE;SQ_CANDIDATO;NR_ORDEM_BEM_CANDIDATO;"
    "CD_TIPO_BEM_CANDIDATO;DS_TIPO_BEM_CANDIDATO;DS_BEM_CANDIDATO;VR_BEM_CANDIDATO;"
    "DT_ULT_ATUAL_BEM_CANDIDATO;HH_ULT_ATUAL_BEM_CANDIDATO")  # fmt: skip


def asset(  # noqa: PLR0913 - one keyword per CSV field a test may change
    *,
    year: int,
    sq: str,
    order: int,
    code: str,
    value: str,
    label: str = "Casa",
    description: str = "CASA NA QL 14 CONJUNTO 5",
    kind: str = "2",
) -> str:
    fields = ["27/10/2026", "10:00:00", str(year), kind, "ELEIÇÃO ORDINÁRIA", "1",
              f"ELEIÇÕES {year}", "02/10/2022", "DF", "DF", "DISTRITO FEDERAL", sq, str(order),
              code, label, description, value, "01/09/2022", "10:00:00"]  # fmt: skip
    return ";".join(f'"{f}"' for f in fields)


RECEIPT_HEADER = ("DT_GERACAO;HH_GERACAO;AA_ELEICAO;CD_TIPO_ELEICAO;NM_TIPO_ELEICAO;SG_UF;"
    "SQ_CANDIDATO;NM_CANDIDATO;CD_FONTE_RECEITA;DS_FONTE_RECEITA;CD_ORIGEM_RECEITA;"
    "DS_ORIGEM_RECEITA;NR_CPF_CNPJ_DOADOR;NM_DOADOR;NM_DOADOR_RFB;NM_MUNICIPIO_DOADOR;"
    "VR_RECEITA;DS_GENERO;DS_COR_RACA")  # fmt: skip


def receipt(
    *,
    sq: str,
    origin: str,
    value: str,
    fund: str = "1",
    donor: str = "MARIA DE TAL",
    document: str = "12345678901",
    year: int = 2022,
) -> str:
    fields = ["27/10/2026", "10:00:00", str(year), "2", "ELEIÇÃO ORDINÁRIA", "DF", sq,
              "CANDIDATA", fund, "FONTE", origin, "ORIGEM", document, donor, donor,
              "CEILÂNDIA", value, "FEMININO", "PARDA"]  # fmt: skip
    return ";".join(f'"{f}"' for f in fields)
