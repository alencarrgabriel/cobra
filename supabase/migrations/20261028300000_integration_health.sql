-- Integrations health panel and failure alert for the team (DDR RF-66, RNF-17). See
-- openspec change `saude-integracoes` and docs/saude.md.
-- Editors read the collector's run log and queue, and only the metadata of raw responses
-- (never their bodies or files). The public site keeps no access to ops or raw.

grant usage on schema ops, raw to cobra_editor;
grant select on ops.runs, ops.jobs to cobra_editor;
grant select (source, fetched_at, status_code) on raw.responses to cobra_editor;

-- One failure alert per day at most (design D4).
create table ops.alerts_sent (
  day date primary key,
  sent_at timestamptz not null default now(),
  sources text[] not null
);
comment on table ops.alerts_sent is 'Days on which the team was alerted, and about which sources.';
grant select, insert on ops.alerts_sent to cobra_editor;
