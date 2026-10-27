-- Senate plenary votes in the same tables as the Câmara's (openspec change
-- `ingestao-senado-votacoes`): secret votes and the absences the Senate records.

-- A secret vote keeps only the official totals: no ballot, not even who voted (design D2).
alter table core.votes add column secret boolean not null default false;
alter table core.votes add constraint votes_secret_not_nominal check (not (secret and nominal));

-- The Senate code behind an absence (AP, MIS, LS, LP, NCom); null at the Câmara.
alter table core.vote_ballots add column option_detail text;
alter table core.vote_ballots drop constraint vote_ballots_option_check;
alter table core.vote_ballots add constraint vote_ballots_option_check check (option in (
  'sim', 'nao', 'abstencao', 'obstrucao', 'art17', 'presidente', 'presente_sem_voto', 'ausente',
  'nao_informado'));
