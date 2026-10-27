"""Raw layer (spec coleta-de-dados: Resposta bruta guardada)."""

import hashlib
from pathlib import Path

import httpx
import psycopg
import pytest

from cobra_collectors.raw import RawStore

pytestmark = pytest.mark.db

URL = "https://dadosabertos.example.gov.br/api/v2/itens"


def response(content: bytes, content_type: str, url: str = URL) -> httpx.Response:
    return httpx.Response(
        200,
        content=content,
        headers={"content-type": content_type},
        request=httpx.Request("GET", url, params={"pagina": "1"}),
    )


def test_json_response_is_kept_with_metadata(
    autocommit_conn: psycopg.Connection, tmp_path: Path
) -> None:
    store = RawStore(autocommit_conn, tmp_path)
    saved = store.save_response(
        "camara", response(b'{"dados": [1, 2]}', "application/json; charset=utf-8")
    )
    row = autocommit_conn.execute(
        "select source::text, url, params, status_code, body_json, file_path, sha256 "
        "from raw.responses where id = %s",
        (saved.id,),
    ).fetchone()
    assert row == (
        "camara",
        URL,
        {"pagina": "1"},
        200,
        {"dados": [1, 2]},
        None,
        hashlib.sha256(b'{"dados": [1, 2]}').hexdigest(),
    )


def test_large_file_goes_to_disk_with_hash(
    autocommit_conn: psycopg.Connection, tmp_path: Path
) -> None:
    store = RawStore(autocommit_conn, tmp_path)
    content = b"PK\x03\x04" + b"\x00" * 2048
    saved = store.save_response(
        "tse", response(content, "application/zip", "https://cdn.example/proposta_2026_DF.zip")
    )
    assert saved.file_path is not None
    assert saved.file_path.read_bytes() == content
    assert saved.file_path.name == f"{hashlib.sha256(content).hexdigest()}.zip"
    size = autocommit_conn.execute(
        "select file_size from raw.responses where id = %s", (saved.id,)
    ).fetchone()
    assert size == (len(content),)
    assert not list(saved.file_path.parent.glob(".part-*"))


def test_same_file_is_not_written_twice(
    autocommit_conn: psycopg.Connection, tmp_path: Path
) -> None:
    store = RawStore(autocommit_conn, tmp_path)
    content = b"%PDF-1.7 fake"
    first = store.save_response(
        "tse", response(content, "application/pdf", "https://cdn.example/a.pdf")
    )
    second = store.save_response(
        "tse", response(content, "application/pdf", "https://cdn.example/a.pdf")
    )
    assert first.file_path == second.file_path
    assert len(list(tmp_path.rglob("*.pdf"))) == 1


def test_requires_autocommit(session_conn: psycopg.Connection, tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="autocommit"):
        RawStore(session_conn, tmp_path)


def test_streamed_file_goes_to_disk_with_size_and_hash(
    autocommit_conn: psycopg.Connection, tmp_path: Path
) -> None:
    content = b"PK\x03\x04" + bytes(range(256)) * 9000  # about 2.3 MB, several chunks
    url = "https://cdn.example/votacao_candidato_munzona_2022.zip"
    transport = httpx.MockTransport(
        lambda request: httpx.Response(
            200, content=content, headers={"content-type": "application/zip"}
        )
    )
    store = RawStore(autocommit_conn, tmp_path)
    with httpx.Client(transport=transport) as client, client.stream("GET", url) as streamed:
        saved = store.save_stream("tse", streamed)
    sha = hashlib.sha256(content).hexdigest()
    assert saved.sha256 == sha
    assert saved.file_path is not None
    assert saved.file_path.read_bytes() == content
    assert saved.file_path.name == f"{sha}.zip"
    row = autocommit_conn.execute(
        "select file_size, url, body_json, body_text from raw.responses where id = %s",
        (saved.id,),
    ).fetchone()
    assert row == (len(content), url, None, None)
    assert not list(saved.file_path.parent.glob(".part-*"))
