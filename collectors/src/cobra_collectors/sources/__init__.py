"""Registry of source adapters: name (a `core.data_source` value) → factory.

Each ingestion change adds its adapter here.
"""

from cobra_collectors.runner import SourceFactory
from cobra_collectors.sources.camara import CamaraSource
from cobra_collectors.sources.cldf import CldfSource
from cobra_collectors.sources.obrasgov import ObrasgovSource
from cobra_collectors.sources.senado import SenadoSource
from cobra_collectors.sources.transparencia import TransparenciaSource

REGISTRY: dict[str, SourceFactory] = {
    "camara": CamaraSource,
    "cldf": CldfSource,
    "obrasgov": ObrasgovSource,
    "senado": SenadoSource,
    "transparencia": TransparenciaSource,
}

# Kept for the `sources` command.
SOURCES: tuple[str, ...] = tuple(sorted(REGISTRY))
