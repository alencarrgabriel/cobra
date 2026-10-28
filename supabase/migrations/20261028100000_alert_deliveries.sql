-- Weekly summary deliveries (DDR RF-51, entity EnvioDeAlerta in §8). See openspec change
-- `resumo-semanal` and docs/alertas.md.
-- One row per subscription and week: it keeps the same week from being sent twice, shows in
-- "Meus dados" and goes away with the subscription.

create table alerts.deliveries (
  id bigint generated always as identity primary key,
  subscription_id uuid not null references alerts.subscriptions (id) on delete cascade,
  -- Monday of the week the summary covers (America/Sao_Paulo).
  week_start date not null check (extract(isodow from week_start) = 1),
  vote_ids bigint[] not null,
  status text not null check (status in ('enviado', 'falhou')),
  sent_at timestamptz not null default now(),
  unique (subscription_id, week_start)
);
comment on table alerts.deliveries is
  'Weekly summaries sent (or failed) per subscription and week, with the votes included.';
create index deliveries_sent_idx on alerts.deliveries (sent_at);

grant select, insert, update on alerts.deliveries to cobra_alerts;

-- The local outbox keeps the headers too, so tests can check the unsubscribe headers.
alter table alerts.outbox_local add column headers jsonb;
