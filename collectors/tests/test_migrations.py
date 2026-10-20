"""Static checks on SQL migrations (spec acesso-ao-banco)."""

import re
from pathlib import Path

import pytest

from cobra_collectors.config import REPO_ROOT

MIGRATIONS = sorted((REPO_ROOT / "supabase" / "migrations").glob("*.sql"))

LINE_COMMENT = re.compile(r"--[^\n]*")
BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.DOTALL)
FORBIDDEN = re.compile(r"\bpassword\b|(?<!no)\blogin\b", re.IGNORECASE)


def strip_comments(source: str) -> str:
    return LINE_COMMENT.sub("", BLOCK_COMMENT.sub("", source))


def test_there_are_migrations() -> None:
    assert MIGRATIONS


@pytest.mark.parametrize("migration", MIGRATIONS, ids=lambda p: p.name)
def test_migrations_never_set_passwords_or_login(migration: Path) -> None:
    code = strip_comments(migration.read_text(encoding="utf-8"))
    assert not FORBIDDEN.findall(code), "roles must be NOLOGIN without password"


@pytest.mark.parametrize(
    ("code", "flagged"),
    [
        ("create role x nologin;", False),
        ("create role x login password 'p';", True),
        ("alter role x with login;", True),
        ("-- create role x login password 'p'\ncreate role y nologin;", False),
    ],
)
def test_detector(code: str, flagged: bool) -> None:
    assert bool(FORBIDDEN.findall(strip_comments(code))) is flagged
