-- Error reports and contestation (DDR RF-59, RF-64, §9.1 "correção pública", §10.5). See
-- openspec change `reporte-de-erro` and docs/correcoes.md.
-- The description may carry personal data and the e-mail is personal data: both stay in the
-- `reports` schema. The site reads only the public view in core.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'cobra_reports') then
    create role cobra_reports nologin;
  end if;
end $$;
comment on role cobra_reports is
  'Public report form: inserts reports and counts today''s; reads nothing else.';

create schema reports;
comment on schema reports is 'Error reports and contestations, with their triage history.';

create table reports.reports (
  -- Also the protocol number shown to the person.
  id bigint generated always as identity primary key,
  page_path text not null check (page_path ~ '^/' and length(page_path) <= 300),
  kind text not null check (kind in ('erro', 'contestacao')),
  description text not null check (length(description) between 20 and 2000),
  -- AES-256-GCM (nonce || ciphertext || tag), optional; erased 90 days after closing.
  email_enc bytea,
  email_purged_at timestamptz,
  status text not null default 'recebido'
    check (status in ('recebido', 'em_analise', 'corrigido', 'sem_alteracao')),
  public_note text check (public_note is null or length(public_note) between 20 and 2000),
  created_at timestamptz not null default now(),
  -- Five business days after sending (Monday to Friday, Brasília).
  due_on date not null,
  closed_at timestamptz,
  closed_by text,
  check ((status in ('corrigido', 'sem_alteracao')) = (closed_at is not null)),
  check (closed_at is null or public_note is not null)
);
comment on table reports.reports is
  'One per report; the id is the protocol. Description and e-mail are never public.';
create index reports_created_idx on reports.reports (created_at);

-- Append-only triage history (who changed what and when).
create table reports.history (
  id bigint generated always as identity primary key,
  report_id bigint not null references reports.reports (id),
  at timestamptz not null default now(),
  editor text not null,
  status text not null,
  public_note text,
  replied boolean not null default false
);
comment on table reports.history is 'Every triage step of a report; append-only for editors.';

-- What the public queue shows: no description, no contact.
create view core.public_reports as
select id, page_path, kind, status, public_note, created_at, due_on, closed_at
from reports.reports;
comment on view core.public_reports is
  'Public correction queue (RF-64): protocol, page, status, deadline and the team''s note.';

revoke all on schema reports from public;
grant usage on schema reports to cobra_reports, cobra_editor;
grant insert (page_path, kind, description, email_enc, due_on) on reports.reports
  to cobra_reports;
grant select (id, created_at) on reports.reports to cobra_reports;
grant select, update on reports.reports to cobra_editor;
grant select, insert on reports.history to cobra_editor;
grant select on core.public_reports to cobra_web_reader, cobra_editor;
