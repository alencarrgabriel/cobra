"""Registry of source adapters: name (a `core.data_source` value) → factory.

Each ingestion change adds its adapter here.
"""

from cobra_collectors.runner import SourceFactory

REGISTRY: dict[str, SourceFactory] = {}

# Kept for the `sources` command.
SOURCES: tuple[str, ...] = tuple(sorted(REGISTRY))
