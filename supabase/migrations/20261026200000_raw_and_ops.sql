-- Collection infrastructure: raw responses as fetched from official sources, the job
-- queue and the run log. Only collectors can read or write these schemas.
-- See openspec change `infra-coleta` and docs/coleta.md.

create schema raw;
comment on schema raw is 'Responses exactly as returned by official sources, kept before normalization.';

create schema ops;
comment on schema ops is 'Collector operations: job queue and run log.';

grant usage on schema raw, ops to cobra_collector;
alter default privileges in schema raw grant select, insert, update, delete on tables to cobra_collector;
alter default privileges in schema raw grant usage, select on sequences to cobra_collector;
alter default privileges in schema ops grant select, insert, update, delete on tables to cobra_collector;
alter default privileges in schema ops grant usage, select on sequences to cobra_collector;

-- ---------------------------------------------------------------------------
-- Job queue
-- ---------------------------------------------------------------------------

create type ops.job_status as enum ('queued', 'running', 'done', 'failed');

create table ops.jobs (
  id            bigint generated always as identity primary key,
  source        core.data_source not null,
  kind          text not null,
  payload       jsonb not null default '{}'::jsonb,
  dedupe_key    text not null,
  status        ops.job_status not null default 'queued',
  attempts      smallint not null default 0 check (attempts >= 0),
  max_attempts  smallint not null default 5 check (max_attempts > 0),
  run_after     timestamptz not null default now(),
  locked_at     timestamptz,
  last_error    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- The same pending task is never queued twice.
create unique index jobs_one_pending_per_key
  on ops.jobs (source, kind, dedupe_key) where status in ('queued', 'running');
create index jobs_ready on ops.jobs (run_after) where status = 'queued';

-- ---------------------------------------------------------------------------
-- Run log (feeds the integrations health panel, RF-66)
-- ---------------------------------------------------------------------------

create type ops.run_status as enum ('running', 'ok', 'partial', 'failed');

create table ops.runs (
  id           bigint generated always as identity primary key,
  source       core.data_source,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  status       ops.run_status not null default 'running',
  jobs_done    integer not null default 0,
  jobs_failed  integer not null default 0,
  notes        text
);
create index on ops.runs (source, started_at desc);

-- ---------------------------------------------------------------------------
-- Raw responses
-- ---------------------------------------------------------------------------

create table raw.responses (
  id            bigint generated always as identity primary key,
  source        core.data_source not null,
  method        text not null default 'GET',
  url           text not null,
  params        jsonb not null default '{}'::jsonb,
  status_code   smallint,
  fetched_at    timestamptz not null default now(),
  content_type  text,
  sha256        char(64) not null check (sha256 ~ '^[0-9a-f]{64}$'),
  body_json     jsonb,
  body_text     text,
  -- Large files (ZIP, PDF) live on disk under RAW_DATA_DIR; only metadata here.
  file_path     text,
  file_size     bigint check (file_size is null or file_size >= 0),
  job_id        bigint references ops.jobs (id) on delete set null,
  check (num_nonnulls(body_json, body_text, file_path) <= 1)
);
create index on raw.responses (source, fetched_at desc);
create index on raw.responses (sha256);
