-- Accent-free, lower-case name for the "CEP, cidade ou UF" search (RF-01).
-- Filled by the `ibge` collector for municipalities; set here for the 27 UFs.
-- See openspec change `municipios-ibge`.

alter table core.localities add column search_name text;
create index on core.localities (search_name);

update core.localities set search_name = lower(translate(name,
  'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
  'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'))
where kind = 'uf';
