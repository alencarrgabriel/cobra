-- Government plans registered at the TSE by the elected tickets (DDR §4.4c, RF-80 to RF-82).
-- See openspec change `ingestao-planos-de-governo` and docs/modelo-de-dados.md.

create table core.government_plans (
  id                bigint generated always as identity primary key,
  election_year     smallint not null,
  office            text not null check (office in ('presidente', 'governador')),
  -- Null for the president (national ticket).
  uf_code           text references core.localities (ibge_code) on delete restrict,
  holder_name       text not null,
  running_mate_name text,
  party             text,
  tse_candidate_id  text not null,
  -- The official PDF, byte for byte (design D3); the site serves it to open a given page.
  pdf               bytea not null,
  pdf_sha256        text not null check (pdf_sha256 ~ '^[0-9a-f]{64}$'),
  pdf_pages         integer not null check (pdf_pages > 0),
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz,
  unique (source, source_id),
  unique nulls not distinct (election_year, office, uf_code)
);

create table core.government_plan_pages (
  plan_id  bigint not null references core.government_plans (id) on delete cascade,
  page     integer not null check (page > 0),
  text     text not null,
  has_text boolean not null,
  search   tsvector generated always as (to_tsvector('portuguese', text)) stored,
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz,
  primary key (plan_id, page)
);
create index on core.government_plan_pages using gin (search);
comment on table core.government_plan_pages is 'Text of each page as extracted from the official PDF.';

-- Fixed list of themes, each mapped to the Obrasgov work areas it covers (RF-82).
create table core.plan_themes (
  slug       text primary key,
  label      text not null,
  work_types text[] not null default '{}',
  keywords   text[] not null,
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz
);
comment on table core.plan_themes is 'Curated themes (no AI): keywords and matching work areas.';

create table core.plan_page_themes (
  plan_id bigint not null,
  page    integer not null,
  theme   text not null references core.plan_themes (slug) on delete cascade,
  hits    integer not null check (hits > 0),
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz,
  primary key (plan_id, page, theme),
  foreign key (plan_id, page) references core.government_plan_pages (plan_id, page)
    on delete cascade
);

-- Keywords are matched on accent-free, lower-case text (design D4).
insert into core.plan_themes (slug, label, work_types, keywords, source, source_id, source_url,
                              collected_at)
select slug, label, work_types::text[], keywords::text[], 'cobra', slug,
       'https://github.com/alencarrgabriel/cobra/blob/main/supabase/migrations', '2026-10-26T12:00:00-03:00'
from (values
  ('saude', 'Saúde', '{"Saúde"}',
   '{"saude","hospital","hospitais","ubs","sus","medico","medicos","vacina","atendimento medico","upa"}'),
  ('educacao', 'Educação', '{"Educação"}',
   '{"educacao","escola","escolas","creche","creches","ensino","professor","professores","aluno","alunos"}'),
  ('seguranca', 'Segurança', '{"Segurança Pública","Defesa Civil"}',
   '{"seguranca publica","policia","policial","violencia","crime","criminalidade","bombeiro"}'),
  ('mobilidade', 'Mobilidade e transporte', '{"Infraestrutura Urbana e Mobilidade","Rodovia","Aviação Civil"}',
   '{"mobilidade","transporte","metro","onibus","brt","rodovia","rodovias","estrada","viaduto","ciclovia"}'),
  ('agua-saneamento', 'Água e saneamento', '{"Infraestrutura Hídrica, Portos, Hidrovia"}',
   '{"saneamento","esgoto","agua potavel","abastecimento de agua","drenagem","residuos"}'),
  ('assistencia-social', 'Assistência social', '{"Assistência Social","Previdência Social"}',
   '{"assistencia social","fome","pobreza","vulnerabilidade","bolsa familia","cras","renda minima"}'),
  ('cultura', 'Cultura', '{"Cultura"}',
   '{"cultura","cultural","culturais","patrimonio historico","artistas"}'),
  ('esporte', 'Esporte', '{"Esporte"}',
   '{"esporte","esportes","esportivo","esportiva","atletas","lazer"}'),
  ('meio-ambiente', 'Meio ambiente', '{"Meio Ambiente"}',
   '{"meio ambiente","ambiental","sustentabilidade","clima","desmatamento","preservacao"}'),
  ('economia-emprego', 'Economia e emprego',
   '{"Desenvolvimento","Trabalho e Emprego","Indústria, Serviços e Comércio Exterior","Agricultura e Organização Agrária","Energia"}',
   '{"emprego","empregos","economia","renda","industria","agricultura","empreendedor","investimento","energia"}'),
  ('moradia', 'Moradia', '{}',
   '{"moradia","habitacao","habitacional","casa propria","regularizacao fundiaria"}')
) as themes (slug, label, work_types, keywords);
