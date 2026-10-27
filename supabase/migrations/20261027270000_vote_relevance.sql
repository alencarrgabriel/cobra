-- Objective criteria of a relevant vote (DDR §9.2) and the events the feed reads.
-- See openspec change `relevancia-e-eventos` and docs/modelo-de-dados.md.

-- Manual inclusion with a published justification, written by the editorial panel.
create table core.vote_curation (
  vote_id       bigint primary key references core.votes (id) on delete cascade,
  justification text not null check (length(justification) >= 20),
  curated_by    text not null,
  curated_at    timestamptz not null,
  source            core.data_source not null default 'cobra',
  source_id         text,
  source_url        text,
  collected_at      timestamptz not null default now(),
  source_updated_at timestamptz
);

-- Nominal votes only: symbolic and secret votes have no individual vote to show (design D1).
create view core.vote_relevance as
select v.id as vote_id,
       array_remove(array[
         case when g.orientation in ('sim', 'nao', 'obstrucao')
                and o.orientation in ('sim', 'nao', 'obstrucao')
                and g.orientation <> o.orientation then 'divergencia' end,
         case when v.yes + v.no + v.other > 0
                and abs(v.yes - v.no) < 0.2 * (v.yes + v.no + v.other)
              then 'placar_disputado' end,
         case when v.proposition_type in ('PEC', 'MPV', 'PLP', 'PLN', 'VET')
              then 'tipo_de_materia' end,
         case when c.vote_id is not null then 'curadoria' end
       ], null) as criteria,
       g.orientation as government,
       o.orientation as opposition,
       abs(v.yes - v.no) as margin,
       v.yes + v.no + v.other as voters
from core.votes v
left join core.vote_orientations g on g.vote_id = v.id and g.bench = 'Governo'
left join core.vote_orientations o on o.vote_id = v.id and o.bench = 'Oposição'
left join core.vote_curation c on c.vote_id = v.id
where v.nominal;

-- What the feed reads (change 24): relevant nominal votes, and symbolic votes as events of
-- their proposition, with no individual vote.
create view core.events as
select 'votacao_relevante'::text as kind, v.occurred_on, h.slug as house, v.id as vote_id,
       r.criteria
from core.vote_relevance r
join core.votes v on v.id = r.vote_id
join core.legislative_houses h on h.id = v.house_id
where cardinality(r.criteria) > 0
union all
select 'votacao_simbolica', v.occurred_on, h.slug, v.id, '{}'::text[]
from core.votes v
join core.legislative_houses h on h.id = v.house_id
where not v.nominal and not v.secret and v.proposition_label is not null;

grant select on core.vote_relevance, core.events to cobra_web_reader;
