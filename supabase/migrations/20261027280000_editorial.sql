-- Editorial panel: editors, vote summaries with versions, an append-only audit log and the
-- published view the site reads (DDR RF-62, RF-63, RNF-11). See openspec change
-- `painel-editorial` and docs/modelo-de-dados.md.
-- Editorial work is not data from an official source, so it lives in its own schema, which
-- the site cannot read; the site reads only the published view in core.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'cobra_editor') then
    create role cobra_editor nologin;
  end if;
end $$;
comment on role cobra_editor is
  'Editorial panel: reads core and writes only summaries, the audit log and curation.';

create schema editorial;
comment on schema editorial is 'Editorial panel work: editors, summary versions, audit log.';

-- Only these e-mails may use the panel, besides holding a verified second factor (design D1).
create table editorial.editors (
  email      text primary key check (email = lower(email)),
  name       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table editorial.vote_summaries (
  id          bigint generated always as identity primary key,
  vote_id     bigint not null references core.votes (id) on delete cascade,
  version     integer not null check (version > 0),
  text        text not null check (length(text) between 40 and 4000),
  status      text not null check (status in ('rascunho', 'publicado', 'substituido')),
  author      text not null,
  -- Model that drafted the text, when it was drafted by AI (change rascunho-ia).
  ai_model    text,
  created_at  timestamptz not null default now(),
  approved_by text,
  approved_at timestamptz,
  unique (vote_id, version),
  check ((status = 'rascunho') = (approved_at is null))
);
create unique index vote_summaries_one_published on editorial.vote_summaries (vote_id)
  where status = 'publicado';

-- Append-only: the editor role may insert, never update or delete (design D2).
create table editorial.log (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  editor  text not null,
  action  text not null check (action in ('rascunho', 'aprovacao', 'curadoria',
                                          'retirada_curadoria')),
  vote_id bigint references core.votes (id) on delete set null,
  version integer,
  detail  text
);

-- What the site reads: approved summaries only.
create view core.published_summaries as
select vote_id, text, approved_at, ai_model
from editorial.vote_summaries
where status = 'publicado';
grant select on core.published_summaries to cobra_web_reader;

grant usage on schema core, editorial to cobra_editor;
grant select on all tables in schema core to cobra_editor;
grant select on all tables in schema editorial to cobra_editor;
grant insert, update on editorial.vote_summaries to cobra_editor;
grant insert on editorial.log to cobra_editor;
grant insert, delete on core.vote_curation to cobra_editor;
