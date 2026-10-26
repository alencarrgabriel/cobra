-- Federal-funded public works from Obrasgov.br (DDR §4.4, RF-39 to RF-48).
-- See openspec change `ingestao-obrasgov` and docs/modelo-de-dados.md.

alter type core.data_source add value if not exists 'obrasgov';

-- The DF has a single municipality; works of the pilot point to it. Other
-- municipalities arrive with change `busca-geografica`.
insert into core.localities
  (ibge_code, kind, name, uf_code, uf_abbr, source, source_id, source_url, collected_at)
values
  ('5300108', 'municipality', 'Brasília', '53', 'DF', 'ibge', '5300108',
   'https://www.ibge.gov.br/explica/codigos-dos-municipios.php', now())
on conflict (ibge_code) do nothing;

create type core.work_status as enum (
  'registered', 'in_progress', 'completed', 'stopped', 'unfinished', 'cancelled'
);

create table core.works (
  id                  bigint generated always as identity primary key,
  name                text not null,
  description         text,
  social_function     text,
  address             text,
  postal_code         text,
  nature              text,
  species             text,
  axis                text,
  type                text,
  subtype             text,
  status              core.work_status not null,
  uf_code             text not null references core.localities (ibge_code) on delete restrict,
  responsible_org     text,
  -- [{"name": ..., "cnpj": ...}] as published by the source; only displayed in the MVP.
  transferors         jsonb not null default '[]'::jsonb,
  recipients          jsonb not null default '[]'::jsonb,
  executors           jsonb not null default '[]'::jsonb,
  planned_value       numeric(16, 2) check (planned_value is null or planned_value >= 0),
  planned_start       date,
  planned_end         date,
  actual_start        date,
  actual_end          date,
  latitude            numeric(9, 6) check (latitude is null or latitude between -90 and 90),
  longitude           numeric(9, 6) check (longitude is null or longitude between -180 and 180),
  has_photos          boolean not null default false,
  -- Latest physical execution record, repeated here so lists need no aggregation.
  physical_progress   numeric(5, 2) check (physical_progress is null or physical_progress between 0 and 100),
  progress_updated_on date,
  registered_on       date,
  -- Inconsistencies kept as informed by the source, described for the reader (design D4).
  quality_notes       text[] not null default '{}',
  source              core.data_source not null,
  source_id           text,
  source_url          text,
  collected_at        timestamptz not null,
  source_updated_at   timestamptz,
  unique (source, source_id)
);
create index on core.works (uf_code, status);
comment on table core.works is 'Public works funded with federal money (Obrasgov.br).';

create table core.work_progress (
  id                bigint generated always as identity primary key,
  work_id           bigint not null references core.works (id) on delete cascade,
  percent           numeric(5, 2) not null check (percent between 0 and 100),
  started_on        date,
  ended_on          date,
  updated_on        date,
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz,
  unique (source, source_id)
);
create index on core.work_progress (work_id);

create table core.work_status_events (
  id                bigint generated always as identity primary key,
  work_id           bigint not null references core.works (id) on delete cascade,
  status            text not null,
  occurred_on       date,
  justification     text,
  in_negotiation    boolean,
  negotiation_phase text,
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz,
  -- The source repeats identical events under different ids; keep each once.
  unique nulls not distinct (work_id, status, occurred_on, justification)
);

create table core.work_localities (
  work_id           bigint not null references core.works (id) on delete cascade,
  locality_code     text not null references core.localities (ibge_code) on delete restrict,
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz,
  primary key (work_id, locality_code)
);
create index on core.work_localities (locality_code);
