-- Campaign receipts of the candidacies in the registry, summed by origin and fund (DDR RF-26).
-- See openspec change `ingestao-tse-doadores` and docs/modelo-de-dados.md.
-- Private persons appear only as a count and a total: no name, CPF, CNPJ or address of any
-- donor is stored (decision of 2026-10-27, design D2).

create table core.campaign_receipts (
  id               bigint generated always as identity primary key,
  politician_id    bigint not null references core.politicians (id) on delete restrict,
  election_year    smallint not null check (election_year between 2018 and 2100),
  tse_candidate_id text not null,
  origin           text not null check (origin in ('proprios', 'pessoas_fisicas', 'partidos',
                     'financiamento_coletivo', 'outros_candidatos', 'outras')),
  fund             text not null check (fund in ('fefc', 'fundo_partidario', 'outros')),
  -- Only for origin 'partidos': the party directory as registered at the Receita Federal.
  donor_name       text check (donor_name is null or origin = 'partidos'),
  receipts         integer not null check (receipts > 0),
  -- Only for origin 'pessoas_fisicas': distinct donors, counted during collection.
  donors           integer check (donors is null or origin = 'pessoas_fisicas'),
  total            numeric(16, 2) not null,
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz,
  unique (source, source_id)
);
create index on core.campaign_receipts (politician_id, election_year);
comment on table core.campaign_receipts is
  'Campaign receipts summed by origin and fund; private persons only as count and total.';
