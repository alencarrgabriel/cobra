-- Plenary deliberative sessions of the Câmara and who has a recorded presence in each.
-- See openspec change `ingestao-presenca` and docs/modelo-de-dados.md.

create table core.sessions (
  id          bigint generated always as identity primary key,
  house_id    bigint not null references core.legislative_houses (id) on delete restrict,
  held_on     date not null,
  started_at  timestamptz,
  kind        text not null,
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz,
  unique (source, source_id)
);
create index on core.sessions (house_id, held_on);

create table core.session_attendance (
  id            bigint generated always as identity primary key,
  session_id    bigint not null references core.sessions (id) on delete cascade,
  external_id   text not null,
  politician_id bigint references core.politicians (id) on delete restrict,
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz,
  unique (session_id, external_id)
);
create index on core.session_attendance (politician_id);
