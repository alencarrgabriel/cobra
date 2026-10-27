"""Small Câmara vote files with the real column names, for tests (UTF-8 with BOM, `;`)."""

from pathlib import Path

VOTES_HEADER = ['id', 'uri', 'data', 'dataHoraRegistro', 'idOrgao', 'uriOrgao', 'siglaOrgao',
                'idEvento', 'uriEvento', 'aprovacao', 'votosSim', 'votosNao', 'votosOutros',
                'descricao', 'ultimaApresentacaoProposicao_idProposicao']  # fmt: skip
BALLOTS_HEADER = ['idVotacao', 'uriVotacao', 'dataHoraVoto', 'voto', 'deputado_id',
                  'deputado_uri', 'deputado_nome', 'deputado_siglaPartido',
                  'deputado_uriPartido', 'deputado_siglaUf', 'deputado_idLegislatura',
                  'deputado_urlFoto']  # fmt: skip
ORIENTATIONS_HEADER = ['idVotacao', 'uriVotacao', 'siglaOrgao', 'descricao', 'siglaBancada',
                       'uriBancada', 'orientacao']  # fmt: skip
PROPOSITIONS_HEADER = ['idVotacao', 'uriVotacao', 'data', 'descricao', 'proposicao_id',
                       'proposicao_uri', 'proposicao_titulo', 'proposicao_ementa',
                       'proposicao_codTipo', 'proposicao_siglaTipo', 'proposicao_numero',
                       'proposicao_ano']  # fmt: skip


def vote(vid: str, *, organ: str = "PLEN", yes: int = 0, no: int = 0, approved: str = "1",
         day: str = "2026-06-10", prop: str = "0") -> dict[str, str]:  # fmt: skip
    return {"id": vid, "data": day, "dataHoraRegistro": f"{day}T14:00:00", "siglaOrgao": organ,
            "aprovacao": approved, "votosSim": str(yes), "votosNao": str(no),
            "votosOutros": "0", "descricao": f"Votação {vid}",
            "ultimaApresentacaoProposicao_idProposicao": prop}  # fmt: skip


def ballot(vid: str, dep: str, option: str, *, party: str = "PL", uf: str = "DF") -> dict[str, str]:
    return {"idVotacao": vid, "dataHoraVoto": "2026-06-10T14:46:15", "voto": option,
            "deputado_id": dep, "deputado_nome": f"Deputado {dep}",
            "deputado_siglaPartido": party, "deputado_siglaUf": uf}  # fmt: skip


def write(path: Path, header: list[str], rows: list[dict[str, str]]) -> bytes:
    lines = [";".join(f'"{h}"' for h in header)]
    lines += [";".join(f'"{r.get(h, "")}"' for h in header) for r in rows]
    data = ("﻿" + "\r\n".join(lines) + "\r\n").encode("utf-8")
    path.write_bytes(data)
    return data
