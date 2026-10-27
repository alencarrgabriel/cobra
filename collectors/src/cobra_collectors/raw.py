"""Raw layer: every response is kept exactly as the source returned it (RNF-16, DDR §6.2)."""

import hashlib
import json
import os
import tempfile
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx
import psycopg
from psycopg.types.json import Jsonb

# Bodies above this size, or binary ones, go to disk instead of the database.
MAX_INLINE_BYTES = 2_000_000
TEXT_TYPES = ("text/", "application/xml", "application/csv")
MAX_EXTENSION_LENGTH = 6  # ".json", ".zip"; longer suffixes are not real extensions
CHUNK_BYTES = 1 << 20


@dataclass(frozen=True)
class SavedRaw:
    id: int
    sha256: str
    file_path: Path | None


class RawStore:
    """Writes raw responses using its own autocommit connection, so a rolled-back
    normalization never loses the evidence of what the source returned."""

    def __init__(self, conn: psycopg.Connection, files_dir: Path) -> None:
        if not conn.autocommit:
            raise ValueError("RawStore needs an autocommit connection")
        self._conn = conn
        self._files_dir = files_dir

    def save_response(
        self, source: str, response: httpx.Response, *, job_id: int | None = None
    ) -> SavedRaw:
        content = response.content
        content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
        sha = hashlib.sha256(content).hexdigest()
        body_json: Any = None
        body_text: str | None = None
        file_path: Path | None = None
        if len(content) <= MAX_INLINE_BYTES and content_type.endswith("json"):
            body_json = json.loads(content)
        elif len(content) <= MAX_INLINE_BYTES and content_type.startswith(TEXT_TYPES):
            body_text = response.text
        else:
            file_path = self._write_file(
                source, sha, _extension(content_type, response.url), content
            )
        row = self._conn.execute(
            """
            insert into raw.responses (source, method, url, params, status_code, content_type,
                                       sha256, body_json, body_text, file_path, file_size, job_id)
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            returning id
            """,
            (
                source,
                response.request.method,
                str(response.url.copy_with(query=None)),
                Jsonb(dict(response.url.params)),
                response.status_code,
                content_type or None,
                sha,
                Jsonb(body_json) if body_json is not None else None,
                body_text,
                str(file_path) if file_path else None,
                len(content) if file_path else None,
                job_id,
            ),
        ).fetchone()
        if row is None:  # pragma: no cover - insert ... returning always yields a row
            raise RuntimeError("insert into raw.responses returned nothing")
        return SavedRaw(int(row[0]), sha, file_path)

    def save_stream(
        self, source: str, response: httpx.Response, *, job_id: int | None = None
    ) -> SavedRaw:
        """Copies a streamed body to disk in chunks, hashing it on the way (large files)."""
        content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
        ext = _extension(content_type, response.url)
        now = datetime.now(UTC)
        folder = self._files_dir / source / f"{now:%Y}" / f"{now:%m}"
        folder.mkdir(parents=True, exist_ok=True)
        digest = hashlib.sha256()
        size = 0
        fd, tmp = tempfile.mkstemp(dir=folder, prefix=".part-")
        try:
            with os.fdopen(fd, "wb") as handle:
                for chunk in response.iter_bytes(CHUNK_BYTES):
                    digest.update(chunk)
                    size += len(chunk)
                    handle.write(chunk)
            sha = digest.hexdigest()
            target = folder / f"{sha}{ext}"
            if target.exists():
                Path(tmp).unlink()
            else:
                Path(tmp).replace(target)
        except BaseException:
            Path(tmp).unlink(missing_ok=True)
            raise
        row = self._conn.execute(
            """
            insert into raw.responses (source, method, url, params, status_code, content_type,
                                       sha256, file_path, file_size, job_id)
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            returning id
            """,
            (
                source,
                response.request.method,
                str(response.url.copy_with(query=None)),
                Jsonb(dict(response.url.params)),
                response.status_code,
                content_type or None,
                sha,
                str(target),
                size,
                job_id,
            ),
        ).fetchone()
        if row is None:  # pragma: no cover - insert ... returning always yields a row
            raise RuntimeError("insert into raw.responses returned nothing")
        return SavedRaw(int(row[0]), sha, target)

    def _write_file(self, source: str, sha: str, ext: str, content: bytes) -> Path:
        now = datetime.now(UTC)
        target = self._files_dir / source / f"{now:%Y}" / f"{now:%m}" / f"{sha}{ext}"
        if target.exists():
            return target  # same content already stored
        target.parent.mkdir(parents=True, exist_ok=True)
        # Atomic: write to a temporary file in the same directory, then rename.
        fd, tmp = tempfile.mkstemp(dir=target.parent, prefix=".part-")
        try:
            with os.fdopen(fd, "wb") as handle:
                handle.write(content)
            Path(tmp).replace(target)
        except BaseException:
            Path(tmp).unlink(missing_ok=True)
            raise
        return target


def _extension(content_type: str, url: httpx.URL) -> str:
    suffix = Path(url.path).suffix.lower()
    if suffix and len(suffix) <= MAX_EXTENSION_LENGTH:
        return suffix
    return {"application/zip": ".zip", "application/pdf": ".pdf"}.get(content_type, ".bin")
