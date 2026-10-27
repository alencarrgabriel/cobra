-- Parliamentary quota expenses of the Câmara (CEAP) and the Senado (CEAPS).
-- See openspec change `ingestao-despesas` and docs/modelo-de-dados.md.
-- A supplier with a CPF is a private person: neither name nor CPF is stored; passenger names
-- and trips are never read (design D2, same line as the donors decision of 2026-10-27).

create table core.expenses (
  id            bigint generated always as identity primary key,
  house_id      bigint not null references core.legislative_houses (id) on delete restrict,
  external_id   text not null,
  politician_id bigint references core.politicians (id) on delete restrict,
  year          smallint not null check (year between 2000 and 2100),
  month         smallint not null check (month between 1 and 12),
  category      text not null,
  supplier_kind text not null check (supplier_kind in ('empresa', 'pessoa_fisica',
                                                       'nao_informado')),
  supplier_name text check (supplier_name is null or supplier_kind <> 'pessoa_fisica'),
  supplier_cnpj text check (supplier_cnpj is null or (supplier_kind = 'empresa'
                                                       and supplier_cnpj ~ '^\d{14}$')),
  issued_on     date,
  -- Net value as the house informs it; refunds come negative.
  value         numeric(14, 2) not null,
  document_url  text,
  source            core.data_source not null,
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null,
  source_updated_at timestamptz
);
create index on core.expenses (politician_id, year);
create index on core.expenses (house_id, year);
comment on table core.expenses is
  'Parliamentary quota expenses; private-person suppliers only as kind and value.';
