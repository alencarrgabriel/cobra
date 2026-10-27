-- Test data for browser tests only (fictitious works with the real shape). Loaded into
-- the throwaway database cobra_e2e by e2e/db/setup.ts.
insert into core.works
  (name, address, nature, species, axis, type, subtype, status, uf_code, responsible_org,
   transferors, recipients, executors, planned_value, planned_start, planned_end,
   actual_start, actual_end, latitude, longitude, has_photos, physical_progress,
   progress_updated_on, quality_notes, source, source_id, source_url, collected_at,
   source_updated_at)
values
  ('Escola Classe de Teste 1', 'Quadra 1, Ceilândia - DF', 'Obra', 'Construção', 'Social', 'Educação', 'Educação',
   'completed', '53', 'SECRETARIA DE EDUCAÇÃO DE TESTE',
   '[{"name": "MINISTÉRIO DA EDUCAÇÃO", "cnpj": null}]', '[{"name": "GOVERNO DE TESTE", "cnpj": null}]', '[]',
   2000000, '2023-01-10', '2024-06-30', '2023-02-01', '2024-08-15', -15.8200, -48.1000, true, 100, '2024-08-20', '{}',
   'obrasgov', '900001.53-01', 'https://api-publica.obrasgov.gestao.gov.br/obras/projeto-investimento?id_projeto_investimento=900001.53-01',
   now(), '2026-10-23'),
  ('UBS de Teste do Sol Nascente', 'Trecho 2, Sol Nascente - DF', 'Obra', 'Construção', 'Social', 'Saúde', 'UBS',
   'stopped', '53', 'SECRETARIA DE SAÚDE DE TESTE',
   '[{"name": "MINISTÉRIO DA SAÚDE", "cnpj": null}]', '[]', '[{"name": "CONSTRUTORA DE TESTE LTDA", "cnpj": null}]',
   5900000, '2021-07-17', '2024-02-17', '2021-10-17', null, -15.8300, -48.1300, false, 42, '2025-05-01', '{}',
   'obrasgov', '900002.53-02', 'https://api-publica.obrasgov.gestao.gov.br/obras/projeto-investimento?id_projeto_investimento=900002.53-02',
   now(), '2026-10-23'),
  ('Ampliação de Hospital de Teste', 'Setor Hospitalar, Taguatinga - DF', 'Obra', 'Ampliação', 'Social', 'Saúde', 'Hospital',
   'in_progress', '53', 'SECRETARIA DE SAÚDE DE TESTE', '[]', '[]', '[]',
   15900000, '2025-03-01', '2027-03-01', '2025-04-01', null, -15.8400, -48.0500, false, 30, '2026-09-30', '{}',
   'obrasgov', '900003.53-03', 'https://api-publica.obrasgov.gestao.gov.br/obras/projeto-investimento?id_projeto_investimento=900003.53-03',
   now(), '2026-10-23'),
  ('Pavimentação de Via de Teste', 'Via Leste, Ceilândia - DF', 'Obra', 'Reforma', 'Infraestrutura', 'Rodovia', 'Rodovia',
   'in_progress', '53', 'SECRETARIA DE OBRAS DE TESTE', '[]', '[]', '[]',
   3200000, '2026-01-10', '2026-12-20', '2026-02-01', null, -15.8000, -48.0800, false, 23, '2026-10-01', '{}',
   'obrasgov', '900004.53-04', 'https://api-publica.obrasgov.gestao.gov.br/obras/projeto-investimento?id_projeto_investimento=900004.53-04',
   now(), '2026-10-23'),
  ('Creche de Teste Sem Localização', 'Setor P Sul, Ceilândia - DF', 'Obra', 'Construção', 'Social', 'Educação', 'Creche',
   'registered', '53', 'SECRETARIA DE EDUCAÇÃO DE TESTE', '[]', '[]', '[]',
   1800000, '2026-03-01', '2027-03-01', null, null, null, null, false, null, null, '{}',
   'obrasgov', '900005.53-05', 'https://api-publica.obrasgov.gestao.gov.br/obras/projeto-investimento?id_projeto_investimento=900005.53-05',
   now(), '2026-10-23'),
  ('Quadra de Teste com Datas Trocadas', 'QNM 28, Ceilândia - DF', 'Obra', 'Construção', 'Social', 'Esporte', 'Esporte',
   'registered', '53', 'ADMINISTRAÇÃO DE TESTE', '[]', '[]', '[]',
   600000, '2025-01-10', '2024-01-10', null, null, -15.8100, -48.1100, false, null, null,
   '{"término previsto anterior ao início previsto, informado assim pela fonte"}',
   'obrasgov', '900006.53-06', 'https://api-publica.obrasgov.gestao.gov.br/obras/projeto-investimento?id_projeto_investimento=900006.53-06',
   now(), '2026-10-23'),
  ('Centro Cultural de Teste Inacabado', 'Setor O, Ceilândia - DF', 'Obra', 'Construção', 'Social', 'Cultura', 'Cultura',
   'unfinished', '53', 'SECRETARIA DE CULTURA DE TESTE', '[]', '[]', '[]',
   4100000, '2019-05-01', '2021-05-01', '2019-06-01', null, -15.8150, -48.1150, false, 61, '2022-01-10', '{}',
   'obrasgov', '900007.53-07', 'https://api-publica.obrasgov.gestao.gov.br/obras/projeto-investimento?id_projeto_investimento=900007.53-07',
   now(), '2026-10-23'),
  ('Passarela de Teste Cancelada', 'EPCL, Ceilândia - DF', 'Obra', 'Construção', 'Infraestrutura', 'Rodovia', 'Rodovia',
   'cancelled', '53', 'SECRETARIA DE OBRAS DE TESTE', '[]', '[]', '[]',
   900000, '2022-01-01', '2022-12-31', null, null, -15.8050, -48.0900, false, null, null, '{}',
   'obrasgov', '900008.53-08', 'https://api-publica.obrasgov.gestao.gov.br/obras/projeto-investimento?id_projeto_investimento=900008.53-08',
   now(), '2026-10-23');

insert into core.work_status_events
  (work_id, status, occurred_on, justification, in_negotiation, source, source_id, source_url, collected_at, source_updated_at)
select id, 'Paralisada', '2025-05-07',
       'Problemas de execução apontados no relatório de acompanhamento levaram à paralisação da obra.',
       false, 'obrasgov', '7000001', source_url, now(), '2026-10-23'
from core.works where source_id = '900002.53-02';

insert into core.work_progress
  (work_id, percent, started_on, ended_on, updated_on, source, source_id, source_url, collected_at, source_updated_at)
select id, physical_progress, actual_start, actual_end, progress_updated_on, 'obrasgov',
       '80000' || right(source_id, 1), source_url, now(), '2026-10-23'
from core.works where physical_progress is not null;

-- Representatives (change busca-geografica): fictitious people with the real shape.
insert into core.localities (ibge_code, kind, name, uf_code, uf_abbr, search_name, source,
  source_id, source_url, collected_at)
values
  ('2201903', 'municipality', 'Bom Jesus', '22', 'PI', 'bom jesus', 'ibge', '2201903', null, now()),
  ('4302303', 'municipality', 'Bom Jesus', '43', 'RS', 'bom jesus', 'ibge', '4302303', null, now()),
  ('3550308', 'municipality', 'São Paulo', '35', 'SP', 'sao paulo', 'ibge', '3550308', null, now())
on conflict (ibge_code) do nothing;
update core.localities set search_name = 'brasilia' where ibge_code = '5300108';

insert into core.parties (acronym, name, source, source_id, collected_at) values
  ('PL', 'Partido Liberal', 'camara', 'teste-pl', now()),
  ('PT', 'Partido dos Trabalhadores', 'camara', 'teste-pt', now()),
  ('PSB', 'Partido Socialista Brasileiro', 'camara', 'teste-psb', now());

insert into core.politicians (civil_name, parliamentary_name, source, source_id, collected_at)
values
  ('Senadora Teste Um', 'Senadora Teste Um', 'senado', '9001', now()),
  ('Senador Teste Dois', 'Senador Teste Dois', 'senado', '9002', now()),
  ('Senadora Teste Três', 'Senadora Teste Três', 'senado', '9003', now()),
  ('Deputado Federal Teste A', 'Deputado Teste A', 'camara', '8001', now()),
  ('Deputada Federal Teste B', 'Deputada Teste B', 'camara', '8002', now()),
  ('Deputada Distrital Teste C', 'Distrital Teste C', 'cldf', 'distrital-teste-c', now()),
  ('Deputado Distrital Teste D', 'Distrital Teste D', 'cldf', 'distrital-teste-d', now()),
  ('Deputado Paulista Teste', 'Paulista Teste', 'camara', '8003', now());

insert into core.politician_external_ids (politician_id, system, external_id, source, source_id,
  collected_at)
select id, source::text::core.external_system, source_id, source, source_id, now()
from core.politicians where source_id in ('9001','9002','9003','8001','8002','8003',
  'distrital-teste-c','distrital-teste-d');

insert into core.mandates (politician_id, house_id, office, locality_code, legislature,
  started_on, status, source, source_id, source_url, collected_at)
select p.id, h.id, o.office::core.office, o.uf, o.leg, o.started::date, o.status::core.mandate_status,
       p.source, p.source_id || '-m', o.url, now()
from (values
  ('9001', 'senado', 'senador', '53', 57, '2023-02-01', 'titular', null),
  ('9002', 'senado', 'senador', '53', 56, '2019-02-01', 'titular', null),
  ('9003', 'senado', 'senador', '53', 57, '2026-10-06', 'suplente', null),
  ('8001', 'camara', 'deputado_federal', '53', 57, '2023-02-01', 'titular', null),
  ('8002', 'camara', 'deputado_federal', '53', 57, '2023-02-01', 'titular', null),
  ('distrital-teste-c', 'cldf', 'deputado_distrital', '53', 2023, '2023-01-01', 'titular',
   'https://www.cl.df.gov.br/distrital-teste-c'),
  ('distrital-teste-d', 'cldf', 'deputado_distrital', '53', 2023, '2023-01-01', 'titular',
   'https://www.cl.df.gov.br/distrital-teste-d'),
  ('8003', 'camara', 'deputado_federal', '35', 57, '2023-02-01', 'titular', null)
) as o (sid, house, office, uf, leg, started, status, url)
join core.politicians p on p.source_id = o.sid
join core.legislative_houses h on h.slug = o.house;

insert into core.party_affiliations (politician_id, party_id, source, source_id, collected_at)
select p.id, pa.id, 'camara', p.source_id || '-f', now()
from (values ('9001','PL'), ('9002','PT'), ('9003','PSB'), ('8001','PL'), ('8002','PT'),
             ('distrital-teste-c','PL'), ('distrital-teste-d','PSB'), ('8003','PT')) as f (sid, party)
join core.politicians p on p.source_id = f.sid
join core.parties pa on pa.acronym = f.party;
