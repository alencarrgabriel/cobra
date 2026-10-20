-- Core data model: schemas, provenance convention, access roles and the
-- representatives core (localities, houses, parties, politicians, mandates).
-- See openspec change `modelo-dados-base` and docs/modelo-de-dados.md.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

create schema if not exists extensions;
-- Needed by the exclusion constraint that forbids overlapping mandates.
create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- Schemas
-- ---------------------------------------------------------------------------

-- Normalized public data. Rows land here only after validation, so `core`
-- is also the published layer the site reads. Not exposed by Supabase's REST API.
create schema core;
comment on schema core is 'Normalized, validated public data read by the site.';

-- Data used only to match sources (e.g. CPF). Never readable by the site.
create schema restricted;
comment on schema restricted is 'Restricted data used only by collectors to match sources.';

-- Official source of each row (provenance, RNF-16).
create type core.data_source as enum ('camara', 'senado', 'tse', 'cldf', 'ibge', 'cobra');

-- ---------------------------------------------------------------------------
-- Roles (no login, no password: login users are created per environment)
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'cobra_web_reader') then
    create role cobra_web_reader nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'cobra_collector') then
    create role cobra_collector nologin;
  end if;
end
$$;

comment on role cobra_web_reader is 'Site: read-only access to public data in schema core.';
comment on role cobra_collector is 'Collectors: read and write data in schemas core and restricted.';

grant usage on schema core to cobra_web_reader, cobra_collector;
grant usage on schema restricted to cobra_collector;

-- Apply to every table and sequence created later by the migration owner.
alter default privileges in schema core
  grant select on tables to cobra_web_reader;
alter default privileges in schema core
  grant select, insert, update, delete on tables to cobra_collector;
alter default privileges in schema core
  grant usage, select on sequences to cobra_collector;
alter default privileges in schema restricted
  grant select, insert, update, delete on tables to cobra_collector;
alter default privileges in schema restricted
  grant usage, select on sequences to cobra_collector;

-- ---------------------------------------------------------------------------
-- Provenance convention (every table in core and restricted):
--   source             core.data_source  not null  official source of the row
--   source_id          text                        identifier in that source
--   source_url         text                        where to check it
--   collected_at       timestamptz       not null  when we collected it
--   source_updated_at  timestamptz                 last update reported by the source
-- Tables whose rows have their own id in the source add unique (source, source_id).
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Localities and legislative houses
-- ---------------------------------------------------------------------------

create type core.locality_kind as enum ('uf', 'municipality');

create table core.localities (
  ibge_code         text primary key,
  kind              core.locality_kind not null,
  name              text not null,
  uf_code           text not null references core.localities (ibge_code) on delete restrict,
  uf_abbr           char(2) not null check (uf_abbr ~ '^[A-Z]{2}$'),
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz,
  unique (source, source_id),
  -- UFs use the 2-digit IBGE code and point to themselves; municipalities use
  -- the 7-digit code, whose first two digits are their UF.
  constraint localities_code_matches_kind check (
    (kind = 'uf' and ibge_code ~ '^[0-9]{2}$' and uf_code = ibge_code)
    or (kind = 'municipality' and ibge_code ~ '^[0-9]{7}$' and uf_code = left(ibge_code, 2))
  )
);
comment on table core.localities is 'UFs and municipalities, keyed by IBGE code.';

create type core.house_level as enum ('federal', 'state', 'district', 'municipal');

create table core.legislative_houses (
  id                bigint generated always as identity primary key,
  slug              text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name              text not null,
  level             core.house_level not null,
  locality_code     text references core.localities (ibge_code) on delete restrict,
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz,
  unique (source, source_id)
);
comment on table core.legislative_houses is 'Legislative houses; locality_code is null for federal houses.';

-- IBGE codes: https://www.ibge.gov.br/explica/codigos-dos-municipios.php
insert into core.localities
  (ibge_code, kind, name, uf_code, uf_abbr, source, source_id, source_url, collected_at)
select code, 'uf', name, code, abbr, 'ibge', code,
       'https://www.ibge.gov.br/explica/codigos-dos-municipios.php', now()
from (values
  ('11', 'RO', 'Rondônia'),
  ('12', 'AC', 'Acre'),
  ('13', 'AM', 'Amazonas'),
  ('14', 'RR', 'Roraima'),
  ('15', 'PA', 'Pará'),
  ('16', 'AP', 'Amapá'),
  ('17', 'TO', 'Tocantins'),
  ('21', 'MA', 'Maranhão'),
  ('22', 'PI', 'Piauí'),
  ('23', 'CE', 'Ceará'),
  ('24', 'RN', 'Rio Grande do Norte'),
  ('25', 'PB', 'Paraíba'),
  ('26', 'PE', 'Pernambuco'),
  ('27', 'AL', 'Alagoas'),
  ('28', 'SE', 'Sergipe'),
  ('29', 'BA', 'Bahia'),
  ('31', 'MG', 'Minas Gerais'),
  ('32', 'ES', 'Espírito Santo'),
  ('33', 'RJ', 'Rio de Janeiro'),
  ('35', 'SP', 'São Paulo'),
  ('41', 'PR', 'Paraná'),
  ('42', 'SC', 'Santa Catarina'),
  ('43', 'RS', 'Rio Grande do Sul'),
  ('50', 'MS', 'Mato Grosso do Sul'),
  ('51', 'MT', 'Mato Grosso'),
  ('52', 'GO', 'Goiás'),
  ('53', 'DF', 'Distrito Federal')
) as ufs (code, abbr, name);

insert into core.legislative_houses
  (slug, name, level, locality_code, source, source_id, source_url, collected_at)
values
  ('camara', 'Câmara dos Deputados', 'federal', null, 'cobra', 'camara',
   'https://www.camara.leg.br', now()),
  ('senado', 'Senado Federal', 'federal', null, 'cobra', 'senado',
   'https://www.senado.leg.br', now()),
  ('cldf', 'Câmara Legislativa do Distrito Federal', 'district', '53', 'cobra', 'cldf',
   'https://www.cl.df.gov.br', now());

-- ---------------------------------------------------------------------------
-- Parties and politicians
-- ---------------------------------------------------------------------------

create table core.parties (
  id                bigint generated always as identity primary key,
  acronym           text not null unique,
  name              text not null,
  -- Not unique: electoral numbers are reused by newer parties (e.g. 25).
  electoral_number  smallint check (electoral_number between 10 and 99),
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz,
  unique (source, source_id)
);

-- One row per person, whatever the number of sources that describe them (DDR §6.2).
create table core.politicians (
  id                 bigint generated always as identity primary key,
  civil_name         text not null,
  parliamentary_name text not null,
  birth_date         date,
  photo_url          text,
  source             core.data_source not null,
  source_id          text,
  source_url         text,
  collected_at       timestamptz not null,
  source_updated_at  timestamptz,
  unique (source, source_id)
);
comment on table core.politicians is
  'Unified politician identity; provenance refers to the record the displayed fields came from.';

create type core.external_system as enum ('camara', 'senado', 'tse', 'cldf');

-- Links each politician to their identifiers in each source system. TSE issues a
-- new sequential per election, so a politician may have several `tse` ids.
create table core.politician_external_ids (
  id                bigint generated always as identity primary key,
  politician_id     bigint not null references core.politicians (id) on delete restrict,
  system            core.external_system not null,
  external_id       text not null,
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz,
  unique (system, external_id)
);
create index on core.politician_external_ids (politician_id);

-- CPF is the stable link between TSE, Câmara and Senado, but is never shown (DDR §10.1).
create table restricted.politician_private_ids (
  politician_id     bigint primary key references core.politicians (id) on delete restrict,
  cpf               text not null unique check (cpf ~ '^[0-9]{11}$'),
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Party affiliations and mandates
-- ---------------------------------------------------------------------------

create table core.party_affiliations (
  id                bigint generated always as identity primary key,
  politician_id     bigint not null references core.politicians (id) on delete restrict,
  party_id          bigint not null references core.parties (id) on delete restrict,
  started_on        date,
  ended_on          date,
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz,
  unique (source, source_id),
  check (ended_on is null or started_on is null or ended_on >= started_on)
);
-- At most one current (open) affiliation per politician.
create unique index party_affiliations_one_open_per_politician
  on core.party_affiliations (politician_id) where ended_on is null;
create index on core.party_affiliations (party_id);

create type core.office as enum ('deputado_federal', 'senador', 'deputado_distrital');
create type core.mandate_status as enum ('titular', 'suplente', 'licenciado');

create table core.mandates (
  id                bigint generated always as identity primary key,
  politician_id     bigint not null references core.politicians (id) on delete restrict,
  house_id          bigint not null references core.legislative_houses (id) on delete restrict,
  office            core.office not null,
  locality_code     text not null references core.localities (ibge_code) on delete restrict,
  legislature       smallint,
  started_on        date not null,
  ended_on          date,
  status            core.mandate_status not null,
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz,
  unique (source, source_id),
  check (ended_on is null or ended_on >= started_on),
  -- The same person cannot hold two overlapping terms of the same office.
  constraint mandates_no_overlap exclude using gist (
    politician_id with =,
    office with =,
    daterange(started_on, ended_on, '[]') with &&
  )
);
create index on core.mandates (locality_code, house_id);
