-- Parliamentary amendments reaching the DF and the works they paid (DDR §4.4, RF-42, RF-43).
-- See openspec change `ingestao-emendas` and docs/modelo-de-dados.md.

alter type core.data_source add value if not exists 'transparencia';

-- Author of an amendment as known to the federal budget (Portal da Transparência).
-- Individual authors are linked to a politician when the name matches exactly one.
create table core.amendment_authors (
  id                bigint generated always as identity primary key,
  name              text not null,
  kind              text not null check (kind in ('individual', 'bancada', 'comissao', 'relator')),
  politician_id     bigint references core.politicians (id) on delete set null,
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz,
  unique (source, source_id)
);
create index on core.amendment_authors (politician_id);

-- One amendment (12-digit code: year, author, number); values summed over the source rows.
create table core.amendments (
  id                bigint generated always as identity primary key,
  year              smallint not null,
  number            text,
  type              text not null,
  author_id         bigint references core.amendment_authors (id) on delete restrict,
  locality          text not null,
  uf_code           text references core.localities (ibge_code) on delete restrict,
  municipality_code text references core.localities (ibge_code) on delete restrict,
  main_function     text,
  functions         text[] not null default '{}',
  committed         numeric(16, 2) not null default 0,
  liquidated        numeric(16, 2) not null default 0,
  paid              numeric(16, 2) not null default 0,
  rp_paid           numeric(16, 2) not null default 0,
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz,
  unique (source, source_id)
);
create index on core.amendments (uf_code, main_function);
create index on core.amendments (author_id);

-- Commitments (empenhos) of each work, as informed by Obrasgov.br.
create table core.work_commitments (
  id                bigint generated always as identity primary key,
  work_id           bigint not null references core.works (id) on delete cascade,
  issued_on         date,
  value             numeric(16, 2),
  primary_result    text,
  -- The source field as it came, and the 12-digit amendment code recognised from it (D4).
  amendment_ref_raw text,
  amendment_code    text check (amendment_code is null or amendment_code ~ '^[0-9]{12}$'),
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz,
  unique (source, source_id, work_id)
);
create index on core.work_commitments (amendment_code);

-- Work ↔ amendment links. "direto": a commitment of the work names a stored amendment.
-- A view, so the link never lags behind either source.
create view core.work_amendment_links as
select distinct on (c.work_id, a.id)
       c.work_id, a.id as amendment_id, a.author_id, au.politician_id,
       'direto'::text as confidence, c.source_id as commitment, c.issued_on
from core.work_commitments c
join core.amendments a on a.source::text = 'transparencia' and a.source_id = c.amendment_code
left join core.amendment_authors au on au.id = a.author_id
order by c.work_id, a.id, c.issued_on;

-- What reached a place by area, without linking every work to every amendment there.
create function core.amendments_by_function(uf text)
returns table (main_function text, amendments bigint, committed numeric, liquidated numeric,
               paid numeric)
language sql stable
as $$
  select main_function, count(*), sum(committed), sum(liquidated), sum(paid)
  from core.amendments where uf_code = uf
  group by main_function
  order by main_function
$$;

grant select on core.work_amendment_links to cobra_web_reader, cobra_collector;
grant execute on function core.amendments_by_function(text) to cobra_web_reader;
