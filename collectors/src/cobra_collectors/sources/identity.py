"""One politician across sources (DDR §6.2, spec cadastro-de-representantes).

Used by adapters whose source has no CPF (Senado, CLDF): a new record is linked to a
politician from another source when the civil name and birth date match exactly one.
"""

from datetime import date

import psycopg
import structlog

from cobra_collectors.sources.senado_model import normalize_name

log = structlog.get_logger()


def same_person(
    db: psycopg.Connection, system: str, civil_name: str, birth_date: date | None
) -> int | None:
    """A politician from another source, not yet linked to `system`, with the same civil
    name (normalized) and birth date; None when there is none or more than one."""
    if birth_date is None or not civil_name:
        return None
    rows = db.execute(
        """
        select p.id, p.civil_name from core.politicians p
        where p.birth_date = %s and p.source::text <> %s
          and not exists (select 1 from core.politician_external_ids e
                          where e.politician_id = p.id and e.system::text = %s)
        """,
        (birth_date, system, system),
    ).fetchall()
    target = normalize_name(civil_name)
    matches = [int(r[0]) for r in rows if normalize_name(r[1]) == target]
    if len(matches) > 1:
        log.warning("identity.ambiguous", system=system, name=civil_name, count=len(matches))
    return matches[0] if len(matches) == 1 else None
