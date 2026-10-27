-- Identification color of each party in activity (DDR §6.1, §9.1, RF-32).
-- Curated by Cobra: the TSE defines no official colors. Each row records what the choice was
-- based on; sites were checked on 2026-10-26. See openspec change `identidade-de-partidos-e-ufs`.

create table core.party_colors (
  acronym           text primary key,
  color             text not null check (color ~ '^#[0-9a-f]{6}$'),
  -- theme_color: declared by the party's official site; site_css: dominant color on the
  -- official site; known_identity: the party's known identity, still to be confirmed.
  basis             text not null check (basis in ('theme_color', 'site_css', 'known_identity')),
  source            core.data_source not null default 'cobra',
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz
);
comment on table core.party_colors is
  'Curated identification color per party acronym; parties without a row use the neutral color.';

insert into core.party_colors (acronym, color, basis, source_id, source_url, collected_at)
select acronym, color, basis, acronym, url, '2026-10-26T12:00:00-03:00'
from (values
  ('AVANTE',        '#d27901', 'site_css',       'https://avante70.org.br'),
  ('CIDADANIA',     '#ca0088', 'site_css',       'https://cidadania23.org.br'),
  ('MDB',           '#003399', 'site_css',       'https://mdb.org.br'),
  ('NOVO',          '#f28c00', 'known_identity', 'https://novo.org.br'),
  ('PCdoB',         '#bf1522', 'site_css',       'https://pcdob.org.br'),
  ('PDT',           '#c1272d', 'known_identity', 'https://pdt.org.br'),
  ('PL',            '#013a71', 'site_css',       'https://partidoliberal.org.br'),
  ('PODE',          '#6b2fb3', 'theme_color',    'https://podemos.org.br'),
  ('PP',            '#0a5da8', 'known_identity', 'https://progressistas.org.br'),
  ('PRD',           '#026fc2', 'theme_color',    'https://prd25.org.br'),
  ('PSB',           '#c41d23', 'theme_color',    'https://psb40.org.br'),
  ('PSD',           '#022a59', 'theme_color',    'https://psd.org.br'),
  ('PSDB',          '#004997', 'site_css',       'https://psdb.org.br'),
  ('PSOL',          '#ffc200', 'site_css',       'https://psol50.org.br'),
  ('PT',            '#c8102e', 'known_identity', 'https://pt.org.br'),
  ('PV',            '#00843d', 'known_identity', 'https://pv.org.br'),
  ('REDE',          '#00a19a', 'known_identity', 'https://redesustentabilidade.org.br'),
  ('REPUBLICANOS',  '#005daa', 'known_identity', 'https://republicanos10.org.br'),
  ('SOLIDARIEDADE', '#ff7c33', 'theme_color',    'https://solidariedade.org.br'),
  ('UNIÃO',         '#1f3c88', 'known_identity', 'https://uniaobrasil.org.br')
) as colors (acronym, color, basis, url);
