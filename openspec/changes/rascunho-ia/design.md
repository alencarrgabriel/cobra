# Design

## Decisions

### D1. Chamada
- SDK oficial `@anthropic-ai/sdk` 0.133.0, `client.messages.create` com `model: "claude-haiku-5-5"`, `max_tokens: 1500`, sem streaming (texto curto). Pensamento adaptativo é o padrão do modelo; `output_config.effort: "low"` (resumo factual curto).
- Instruções fixas no `system` (regras do §9.1) e os dados da votação no `user`, em blocos rotulados. Sem dados do perfil de ninguém, sem histórico.
- `stop_reason === "refusal"`: aviso "o modelo recusou"; Haiku 5.5 não tem fallback do lado do servidor. Erros tipados do SDK (`Anthropic.APIError`) viram aviso "indisponível"; nada é gravado.
- Texto vazio ou fora de 40 a 4.000 caracteres: aviso, nada gravado.
- Chave por `ANTHROPIC_API_KEY`, só no servidor e opcional: sem ela o botão não aparece e a ação recusa.

### D2. Gravação
- Nova versão em `editorial.vote_summaries` com `status = 'rascunho'`, `author` = editor que pediu, `ai_model = 'claude-haiku-5-5'`; linha em `editorial.log` com `detail = 'rascunho por IA (claude-haiku-5-5)'`.

### D3. Indicação pública
- `core.published_summaries.ai_model` passa a ser o modelo da versão publicada ou, se ela foi escrita por pessoa, o da versão de IA mais recente da mesma votação. Assim, um rascunho de IA corrigido continua indicado.

### D4. Testes
- Vitest: montagem do pedido (dados oficiais, sem campos extras) e tratamento das respostas com cliente falso (texto, recusa, erro, tamanho).
- Banco: a visão indica IA quando qualquer versão veio de IA.
- Playwright: sem chave, o botão não aparece.
