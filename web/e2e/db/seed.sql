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

-- Profile (change perfil-do-politico): an amendment by Senadora Teste Um paying a seeded work.
insert into core.amendment_authors (name, kind, politician_id, source, source_id, collected_at)
select 'SENADORA TESTE UM', 'individual', id, 'transparencia', '9901', now()
from core.politicians where source_id = '9001';

insert into core.amendments (year, number, type, author_id, locality, uf_code, main_function,
  functions, committed, liquidated, paid, source, source_id, collected_at)
select 2025, '0001', 'Emenda Individual - Transferências com Finalidade Definida', id,
       'DISTRITO FEDERAL (UF)', '53', 'Saúde', '{Saúde}', 1500000, 900000, 600000,
       'transparencia', '202599010001', now()
from core.amendment_authors where source_id = '9901';

insert into core.work_commitments (work_id, issued_on, value, primary_result, amendment_ref_raw,
  amendment_code, source, source_id, collected_at)
select id, '2025-03-10', 1500000, '6', '99010001', '202599010001', 'obrasgov', '2025NE000001',
       now()
from core.works where source_id = '900002.53-02';

-- Government plan (change plano-de-governo): a fictitious ticket with two pages of text.
insert into core.government_plans (election_year, office, uf_code, holder_name,
  running_mate_name, party, tse_candidate_id, pdf, pdf_sha256, pdf_pages, source, source_id,
  source_url, collected_at)
select 2022, 'governador', '53', 'GOVERNADORA TESTE', 'VICE TESTE', 'PL', '990000000001', b,
       encode(sha256(b), 'hex'), 2, 'tse', 'teste-plano-df', null, now()
from (select convert_to('%PDF-1.4 plano de governo de teste', 'UTF8') as b) as pdf;

insert into core.government_plan_pages (plan_id, page, text, has_text, source, source_id,
  collected_at)
select id, p.page, p.text, true, 'tse', 'teste-plano-df-' || p.page, now()
from core.government_plans,
  (values
    (1, E'Mais Saúde para o DF: novas UBS\ne um hospital regional.'),
    (2, 'Educação em tempo integral, com novas creches e escolas.')
  ) as p (page, text)
where source_id = 'teste-plano-df';

insert into core.plan_page_themes (plan_id, page, theme, hits, source, source_id, collected_at)
select id, t.page, t.theme, t.hits, 'tse', 'teste-plano-df-' || t.page || '-' || t.theme, now()
from core.government_plans,
  (values (1, 'saude', 3), (2, 'educacao', 3)) as t (page, theme, hits)
where source_id = 'teste-plano-df';

-- Electoral history (change ingestao-tse-candidaturas): Senadora Teste Um.
insert into core.candidacies (politician_id, election_year, round, office, uf, unit_name,
  party_acronym, ballot_name, ballot_number, candidacy_status, result, votes, tse_candidate_id,
  match_rule, source, source_id, collected_at)
select p.id, c.year, 1, c.office, 'DF', 'DISTRITO FEDERAL', c.party, 'SENADORA TESTE UM',
       c.number, 'APTO', c.result, c.votes, c.sq, 'nome-e-nascimento', 'tse', c.sq || '-1', now()
from core.politicians p,
  (values
    (2022, 'SENADOR', 'PL', '222', 'ELEITO', 714562::bigint, '990000000022'),
    (2014, 'DEPUTADO FEDERAL', 'PSB', '4040', 'SUPLENTE', 30120::bigint, '990000000014'),
    (2010, 'DEPUTADO DISTRITAL', 'PSB', '40123', 'NÃO ELEITO', null, '990000000010')
  ) as c (year, office, party, number, result, votes, sq)
where p.source_id = '9001';

-- Declared assets (change ingestao-tse-patrimonio): Senadora Teste Um, 2014 and 2022.
insert into core.declared_assets (politician_id, election_year, tse_candidate_id, item_order,
  type_code, type_label, category, value, source, source_id, collected_at)
select p.id, a.year, a.sq, a.ord, a.code, a.label, a.category, a.value, 'tse',
       a.year || '-' || a.sq || '-' || a.ord, now()
from core.politicians p,
  (values
    (2022, '990000000022', 1, 11, 'Apartamento', 'imoveis', 1200000.00),
    (2022, '990000000022', 2, 21, 'Veículo automotor terrestre', 'veiculos', 300000.00),
    (2014, '990000000014', 1, 45, 'Aplicação de renda fixa', 'dinheiro', 1000000.00)
  ) as a (year, sq, ord, code, label, category, value)
where p.source_id = '9001';

-- Campaign receipts (change ingestao-tse-doadores): Senadora Teste Um, 2022.
insert into core.campaign_receipts (politician_id, election_year, tse_candidate_id, origin,
  fund, donor_name, receipts, donors, total, source, source_id, collected_at)
select p.id, 2022, '990000000022', r.origin, r.fund, r.donor, r.n, r.donors, r.total, 'tse',
       '2022-990000000022-' || r.k, now()
from core.politicians p,
  (values
    (1, 'partidos', 'fefc', 'PARTIDO TESTE - DF', 1, null::int, 1000000.00),
    (2, 'pessoas_fisicas', 'outros', null, 25, 20, 50000.00)
  ) as r (k, origin, fund, donor, n, donors, total)
where p.source_id = '9001';

-- Plenary votes (change ingestao-camara-votacoes): Deputado Teste A voted "Não" on one.
insert into core.votes (house_id, occurred_on, registered_at, organ, description, approved, yes,
  no, other, nominal, proposition_external_id, proposition_label, proposition_type,
  proposition_summary, proposition_url, source, source_id, source_url, collected_at)
select h.id, v.day::date, (v.day || 'T14:00:00-03:00')::timestamptz, 'PLEN', v.descr, true,
       v.yes, v.no, 0, v.nominal, '555', 'PL 11/2003', 'PL', 'Proíbe peças publicitárias de teste.',
       'https://www.camara.leg.br/propostas-legislativas/555', 'camara', v.sid, null, now()
from core.legislative_houses h,
  (values
    ('9100-1', '2026-06-10', 'Aprovado o projeto de teste.', 300, 150, true),
    ('9100-2', '2026-06-11', 'Aprovado requerimento simbólico de teste.', 0, 0, false)
  ) as v (sid, day, descr, yes, no, nominal)
where h.slug = 'camara';

insert into core.vote_ballots (vote_id, external_id, name, party_acronym, uf, option, voted_at,
  politician_id, source, source_id, collected_at)
select v.id, '8001', 'Deputado Teste A', 'PL', 'DF', 'nao', now(), p.id, 'camara',
       '9100-1:8001', now()
from core.votes v, core.politicians p
where v.source_id = '9100-1' and p.source_id = '8001';

-- Senate plenary votes (change ingestao-senado-votacoes): Senadora Teste Um on sick leave in a
-- nominal vote; a secret vote has no ballot.
insert into core.votes (house_id, occurred_on, organ, description, approved, yes, no, other,
  nominal, secret, proposition_label, source, source_id, collected_at)
select h.id, v.day::date, 'PLEN', v.descr, true, v.yes, v.no, 0, v.nominal, v.secret,
       'PLP 55/2026', 'senado', v.sid, now()
from core.legislative_houses h,
  (values
    ('97001', '2026-06-09', 'Votação nominal do projeto de teste.', 58, 1, true, false),
    ('97002', '2026-06-10', 'Votação secreta de autoridade de teste.', 41, 1, false, true)
  ) as v (sid, day, descr, yes, no, nominal, secret)
where h.slug = 'senado';

insert into core.vote_ballots (vote_id, external_id, name, party_acronym, uf, option,
  option_detail, politician_id, source, source_id, collected_at)
select v.id, '9001', 'Senadora Teste Um', 'PL', 'DF', 'ausente', 'Licença saúde', p.id, 'senado',
       '97001:9001', now()
from core.votes v, core.politicians p
where v.source_id = '97001' and v.source = 'senado' and p.source_id = '9001';
