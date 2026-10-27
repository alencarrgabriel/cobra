-- Candidacies of the politicians in Cobra's registry, from the TSE open data (DDR RF-36).
-- See openspec change `ingestao-tse-candidaturas` and docs/modelo-de-dados.md.
-- Only public facts of the candidacy are kept: no CPF, e-mail, voter id, gender, race,
-- marital status or education from the TSE files (design D4).

create table core.candidacies (
  id               bigint generated always as identity primary key,
  politician_id    bigint not null references core.politicians (id) on delete restrict,
  election_year    smallint not null check (election_year between 1994 and 2100),
  round            smallint not null check (round in (1, 2)),
  -- As written by the TSE, e.g. "DEPUTADO FEDERAL".
  office           text not null,
  uf               text check (uf ~ '^[A-Z]{2}$'),
  unit_name        text,
  party_acronym    text,
  ballot_name      text,
  ballot_number    text,
  candidacy_status text,
  result           text,
  -- Sum of nominal votes over every zone of this round; null until the votes job runs
  -- or when the TSE file does not have the candidacy.
  votes            bigint check (votes >= 0),
  tse_candidate_id text not null,
  match_rule       text not null check (match_rule in ('cpf', 'nome-e-nascimento')),
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz,
  unique (source, source_id)
);
create index on core.candidacies (politician_id, election_year desc);
create index on core.candidacies (election_year, tse_candidate_id);
comment on table core.candidacies is
  'TSE candidacies (ordinary elections since 1994) linked to politicians in the registry.';
