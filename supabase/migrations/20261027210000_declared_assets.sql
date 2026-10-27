-- Assets declared to the TSE by the candidacies of politicians in the registry (DDR RF-26,
-- RF-37). See openspec change `ingestao-tse-patrimonio` and docs/modelo-de-dados.md.
-- Only the type and the value of each asset: the TSE description carries addresses and
-- details of private life and is never stored (design D1).

create table core.declared_assets (
  id               bigint generated always as identity primary key,
  politician_id    bigint not null references core.politicians (id) on delete restrict,
  election_year    smallint not null check (election_year between 2006 and 2100),
  tse_candidate_id text not null,
  item_order       integer not null check (item_order > 0),
  type_code        smallint,
  type_label       text not null,
  category         text not null check (category in ('imoveis', 'veiculos', 'dinheiro', 'outros')),
  -- As declared; a few TSE records are negative and are kept as the source informs them.
  value            numeric(16, 2) not null,
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz,
  unique (source, source_id)
);
create index on core.declared_assets (politician_id, election_year);
comment on table core.declared_assets is
  'Assets declared to the TSE (type and value only) by candidacies linked to the registry.';
