"""Registry of source adapters: name (a `core.data_source` value) → factory.

Each ingestion change adds its adapter here.
"""

from cobra_collectors.runner import SourceFactory
from cobra_collectors.sources.camara import CamaraSource
from cobra_collectors.sources.obrasgov import ObrasgovSource

REGISTRY: dict[str, SourceFactory] = {
    "camara": CamaraSource,
    "obrasgov": ObrasgovSource,
}

# Kept for the `sources` command.
SOURCES: tuple[str, ...] = tuple(sorted(REGISTRY))
