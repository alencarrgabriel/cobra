-- A published summary says it started from an AI draft when any version of the same vote was
-- drafted by AI, even if an editor rewrote the text afterwards (openspec change rascunho-ia,
-- design D3).

create or replace view core.published_summaries as
select s.vote_id, s.text, s.approved_at,
       coalesce(s.ai_model,
                (select a.ai_model from editorial.vote_summaries a
                 where a.vote_id = s.vote_id and a.ai_model is not null
                 order by a.version desc limit 1)) as ai_model
from editorial.vote_summaries s
where s.status = 'publicado';
