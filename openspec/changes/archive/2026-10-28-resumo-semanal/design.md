# Design

## Context

O site já cifra as inscrições e envia pelo Resend, ou grava na caixa de saída local quando não há chave (`lib/alerts`). As votações relevantes estão em `core.events`, e os votos de cada parlamentar em `core.vote_ballots`. O ambiente de produção ainda não tem agendador definido.

## Decisions

### D1. Onde roda
- O resumo é montado no próprio site, numa rota que reusa a cifra e o envio já testados, em vez de no coletor Python. Isso evita duas implementações da mesma criptografia.
- `GET` e `POST /api/alertas/resumo-semanal` exigem `Authorization: Bearer <CRON_SECRET>` e comparam o valor em tempo constante. Sem `CRON_SECRET`, a rota responde 404.
- O GET existe porque agendadores como o cron da Vercel chamam por GET.
- A resposta é um JSON com quantos resumos foram enviados, quantas inscrições ficaram sem eventos, quantos envios falharam, quantos ficaram para depois pelo limite, e a semana.

### D2. Semana e conteúdo
- A semana vai de segunda a domingo, no fuso de Brasília. O resumo de uma execução cobre a semana anterior à data da execução. `weekOf(date)` é uma função pura, testada.
- **Votações**: as de `core.events` com `kind = 'votacao_relevante'` e data dentro da semana, das duas casas, da mais recente para a mais antiga, até 15.
- **Votos**:
  - Representantes do estado: a consulta do feed (`getPlaceVotes`).
  - Seguidos: o voto registrado ou, se o político tinha mandato naquela casa na data e não votou, "Não registrou voto". Votação cujos votos não conferem com o placar não mostra votos individuais.
- O mesmo político aparece uma vez por votação, mesmo que seja representante do estado e seguido ao mesmo tempo.
- **Texto puro**, pt-BR e sem juízo de valor (§9.1):
  - assunto: "Cobra: o que aconteceu de <dd/mm> a <dd/mm>";
  - cada votação com data, casa, proposição, resultado, placar, votos e link;
  - ao fim, a fonte, o link de "Meus dados" e o link de saída.
- Sem nenhuma votação relevante na semana, não há envio, e a inscrição conta como "sem eventos".

### D3. Histórico e idempotência
- `alerts.deliveries` guarda:
  - `id`, `subscription_id`, `week_start`, `vote_ids`;
  - `status`, que pode ser `enviado` ou `falhou`;
  - `sent_at`.
- O id do Resend não é guardado: o registro da semana e a `Idempotency-Key` bastam.
- `subscription_id` referencia a inscrição com `on delete cascade`, e há unicidade em (`subscription_id`, `week_start`).
- **Fluxo**:
  1. Cada execução lista as inscrições ativas sem envio `enviado` na semana.
  2. Para cada uma, grava ou atualiza o registro antes de enviar.
  3. O envio leva `Idempotency-Key = <subscription>:<semana>`.
  4. Um envio que falhou volta a ser tentado na execução seguinte.
- **Limite diário**: o total do dia soma os links de cadastro e meus dados (`access_log`) e os resumos enviados nas últimas 24 h. Ao chegar a `ALERTS_DAILY_CAP`, a execução para.
- **Ritmo**: no máximo 8 envios por segundo. Num 429, espera o `retry-after` (até 5 s) e tenta uma vez.
- "Meus dados" e a exportação mostram a data de cada resumo enviado e as votações incluídas.

### D4. Descadastro
- Cabeçalhos:
  - `List-Unsubscribe: <{site}/alertas/sair/<token>/um-clique>`;
  - `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.
- No corpo vai o link `/alertas/sair/<token>`, a página com botão. O token é o permanente da change anterior.
- `sendMail` grava os cabeçalhos também na caixa de saída local (coluna `headers` nova em `alerts.outbox_local`), para os testes conferirem.

### D5. Testes
- **Vitest**:
  - `weekOf` em segunda, domingo e virada de ano;
  - o texto: votos do estado e dos seguidos sem repetição, "Não registrou voto", e o link de saída.
- **Banco**: o papel dos alertas grava `deliveries`; a exclusão da inscrição apaga os envios.
- **Playwright**, com o seed de votações de junho de 2026 e disparo para a semana de 08 a 14/06/2026:
  - sem o segredo, 404;
  - uma inscrição ativa do DF que segue a Senadora Teste Um recebe o resumo com os votos e os cabeçalhos de descadastro;
  - uma segunda execução não reenvia;
  - inscrição cancelada não recebe;
  - "Meus dados" mostra o envio.
- Para isso, a rota aceita `?semana=AAAA-MM-DD` fora de produção.
