"""Registry of source adapters. The adapter interface arrives with change `infra-coleta`."""

# Names of registered sources, e.g. "camara". Empty until the first ingestion change.
SOURCES: tuple[str, ...] = ()
