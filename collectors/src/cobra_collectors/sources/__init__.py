"""Registry of source adapters: name (a `core.data_source` value) → factory.

Each ingestion change adds its adapter here.
"""

from cobra_collectors.runner import SourceFactory
from cobra_collectors.sources.camara import CamaraSource
from cobra_collectors.sources.cldf import CldfSource
from cobra_collectors.sources.obrasgov import ObrasgovSource
from cobra_collectors.sources.senado import SenadoSource
from cobra_collectors.sources.transparencia import TransparenciaSource
from cobra_collectors.sources.tse_planos import TsePlanosSource

REGISTRY: dict[str, SourceFactory] = {
    "camara": CamaraSource,
    "cldf": CldfSource,
    "obrasgov": ObrasgovSource,
    "senado": SenadoSource,
    "transparencia": TransparenciaSource,
    "tse": TsePlanosSource,
}

# Kept for the `sources` command.
SOURCES: tuple[str, ...] = tuple(sorted(REGISTRY))
