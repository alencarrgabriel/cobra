-- E-mail alerts sign-up and "Seguir" (DDR RF-30, RF-50, RF-52, §10.2). See openspec change
-- `alertas-cadastro` and docs/modelo-de-dados.md.
-- People's data is personal, and followed politicians may reveal a political opinion (a
-- sensitive datum), so it lives in its own schema behind its own role, and the application
-- encrypts it: whoever reads the database, or a backup, without the key sees no e-mail,
-- place or follows.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'cobra_alerts') then
    create role cobra_alerts nologin;
  end if;
end $$;
comment on role cobra_alerts is
  'Alerts sign-up: manages subscriptions and links, appends to the access log.';

create schema alerts;
comment on schema alerts is 'Alert subscriptions, encrypted by the application; no public data.';

create table alerts.subscriptions (
  id uuid primary key default gen_random_uuid(),
  -- HMAC-SHA256 of the normalized e-mail: finds the subscription without storing the e-mail.
  email_lookup bytea not null unique,
  -- AES-256-GCM: nonce || ciphertext || tag.
  email_enc bytea not null,
  -- AES-256-GCM of {"place": code | null, "follows": [politician ids]}.
  prefs_enc bytea not null,
  status text not null default 'pendente' check (status in ('pendente', 'ativa', 'cancelada')),
  email_consent_version text,
  email_consent_at timestamptz,
  follows_consent_version text,
  follows_consent_at timestamptz,
  created_at timestamptz not null default now(),
  check ((email_consent_version is null) = (email_consent_at is null)),
  check ((follows_consent_version is null) = (follows_consent_at is null))
);
comment on table alerts.subscriptions is
  'One per e-mail; pending until the person confirms by the link sent to it (double opt-in).';

create table alerts.links (
  token_hash bytea primary key,
  subscription_id uuid not null references alerts.subscriptions (id) on delete cascade,
  purpose text not null check (purpose in ('confirmar', 'meus_dados')),
  -- What confirming applies (place, new follow, consents), encrypted like the preferences.
  payload_enc bytea,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
comment on table alerts.links is
  'Links sent by e-mail; only the SHA-256 of the token is stored; each one works once.';
create index links_subscription_idx on alerts.links (subscription_id, created_at);

create table alerts.access_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  -- Not a foreign key: the entry outlives the deleted subscription, pointing to no one.
  subscription_id uuid not null,
  action text not null check (action in ('cadastro', 'confirmacao', 'link_meus_dados', 'acesso',
    'exportacao', 'correcao', 'deixou_de_seguir', 'descadastro', 'exclusao'))
);
comment on table alerts.access_log is
  'Every action on a subscription, without the e-mail; append-only for the alerts role.';
create index access_log_day_idx on alerts.access_log (at);

-- Messages written instead of sent when there is no RESEND_API_KEY outside production
-- (development and tests read the links from here).
create table alerts.outbox_local (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  recipient text not null,
  subject text not null,
  body text not null
);
comment on table alerts.outbox_local is
  'Local outbox for development and tests; the site writes to it only outside production.';

revoke all on schema alerts from public;
grant usage on schema alerts to cobra_alerts;
grant select, insert, update, delete on alerts.subscriptions, alerts.links to cobra_alerts;
grant select, insert on alerts.access_log, alerts.outbox_local to cobra_alerts;
grant usage on schema core to cobra_alerts;
grant select on core.politicians to cobra_alerts;
