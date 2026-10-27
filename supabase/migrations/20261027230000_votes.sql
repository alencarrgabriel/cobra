-- Plenary votes, individual ballots and leadership orientations (DDR §6, RF-11, RF-14).
-- See openspec change `ingestao-camara-votacoes` and docs/modelo-de-dados.md.

create table core.votes (
  id                      bigint generated always as identity primary key,
  house_id                bigint not null references core.legislative_houses (id) on delete restrict,
  occurred_on             date not null,
  registered_at           timestamptz,
  organ                   text not null,
  description             text not null,
  approved                boolean,
  yes                     integer not null check (yes >= 0),
  no                      integer not null check (no >= 0),
  other                   integer not null check (other >= 0),
  -- False for a symbolic vote: it never has ballots (DDR §9.2).
  nominal                 boolean not null,
  quality_notes           text[] not null default '{}',
  proposition_external_id text,
  proposition_label       text,
  proposition_type        text,
  proposition_summary     text,
  proposition_url         text,
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz,
  unique (source, source_id)
);
create index on core.votes (house_id, occurred_on desc);

create table core.vote_ballots (
  id            bigint generated always as identity primary key,
  vote_id       bigint not null references core.votes (id) on delete cascade,
  -- The member's id at the house; ballots of members outside the registry are kept for the
  -- party and state scoreboards.
  external_id   text not null,
  name          text not null,
  party_acronym text,
  uf            text check (uf ~ '^[A-Z]{2}$'),
  option        text not null check (option in ('sim', 'nao', 'abstencao', 'obstrucao', 'art17',
                                                'nao_informado')),
  voted_at      timestamptz,
  politician_id bigint references core.politicians (id) on delete restrict,
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz,
  unique (vote_id, external_id)
);
create index on core.vote_ballots (politician_id, vote_id);

create table core.vote_orientations (
  id          bigint generated always as identity primary key,
  vote_id     bigint not null references core.votes (id) on delete cascade,
  bench       text not null,
  orientation text not null check (orientation in ('sim', 'nao', 'liberado', 'obstrucao', 'abstencao',
                                                    'nao_informada')),
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz,
  unique (vote_id, bench)
);
