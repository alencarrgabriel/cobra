"""Senate votes shaped like the API answers, for tests."""

from typing import Any

DESCRIPTIONS = {"LS": "Licença saúde", "MIS": "Missão da Casa no País/exterior"}


def ballot(code: int, vote: str, *, party: str = "PL", uf: str = "DF") -> dict[str, Any]:
    return {"codigoParlamentar": code, "nomeParlamentar": f"Senador {code}",
            "siglaPartidoParlamentar": party, "siglaUFParlamentar": uf,
            "siglaVotoParlamentar": vote,
            "descricaoVotoParlamentar": DESCRIPTIONS.get(vote)}  # fmt: skip


def vote(
    code: int,
    seq: int,
    votes: list[dict[str, Any]],
    *,
    secret: bool = False,
    totals: tuple[int, int, int] | None = None,
    day: str = "2026-06-09",
) -> dict[str, Any]:
    yes, no, abst = totals or (None, None, None)
    return {"casaSessao": "SF", "codigoSessaoVotacao": code, "sequencialVotacao": seq,
            "codigoSessao": 564647, "dataSessao": day, "descricaoVotacao": f"Votação {code}",
            "identificacao": "PLP 55/2026", "sigla": "PLP", "codigoMateria": 173694,
            "ementa": "Estabelece condições de teste.", "resultadoVotacao": "A",
            "votacaoSecreta": "S" if secret else "N", "totalVotosSim": yes,
            "totalVotosNao": no, "totalVotosAbstencao": abst, "votos": votes}  # fmt: skip


def official(seq: int, yes: int, no: int, orientations: dict[str, str | None]) -> dict[str, Any]:
    return {"sequencialVotacao": seq, "qtdVotosSim": yes, "qtdVotosNao": no,
            "dataInicioVotacao": "2026-06-09T18:19:28",
            "orientacoesLideranca": [
                {"partido": p, "voto": v} for p, v in orientations.items()
            ]}  # fmt: skip
