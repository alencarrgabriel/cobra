# Spec Delta

## ADDED Requirements

### Requirement: Resumo semanal
Cada inscrição ativa SHALL receber, uma vez por semana, as votações relevantes da semana anterior (até 15, da mais recente para a mais antiga) com data, casa, proposição, resultado, placar oficial, o voto de cada representante do estado informado e de cada político seguido (inclusive quem não registrou voto), link para a votação e fonte; semana sem votação relevante SHALL não gerar mensagem.

#### Scenario: Resumo com votos do estado e dos seguidos
- **WHEN** o resumo de uma semana com votações relevantes é disparado para uma inscrição ativa com estado e seguidos
- **THEN** a mensagem lista as votações da semana com o voto dos representantes do estado e dos seguidos, cada político uma vez por votação

#### Scenario: Semana sem eventos
- **WHEN** o resumo é disparado para uma semana sem votação relevante
- **THEN** nenhuma mensagem é enviada

#### Scenario: Inscrição não ativa
- **WHEN** o resumo é disparado
- **THEN** inscrições pendentes ou canceladas não recebem mensagem

### Requirement: Descadastro em toda mensagem
Toda mensagem do resumo SHALL trazer o link de saída no corpo e os cabeçalhos `List-Unsubscribe` e `List-Unsubscribe-Post` para descadastro em um clique.

#### Scenario: Cabeçalhos de descadastro
- **WHEN** um resumo é enviado
- **THEN** ele traz o link de saída e os cabeçalhos de descadastro em um clique

### Requirement: Histórico e envio único
Cada envio SHALL ficar registrado por inscrição e semana, com as votações incluídas e o resultado; a mesma semana SHALL não ser enviada duas vezes à mesma inscrição; o histórico SHALL aparecer em "Meus dados" e na exportação e ser apagado com a inscrição; o total de e-mails por dia SHALL respeitar o limite configurado.

#### Scenario: Disparo repetido
- **WHEN** o disparo da mesma semana roda de novo
- **THEN** quem já recebeu não recebe outra vez

#### Scenario: Histórico em meus dados
- **WHEN** a pessoa abre "Meus dados" depois de receber um resumo
- **THEN** vê a data do envio e as votações incluídas

### Requirement: Disparo protegido
A rota de disparo SHALL exigir o segredo configurado e SHALL responder 404 sem ele ou sem o segredo configurado.

#### Scenario: Sem o segredo
- **WHEN** alguém chama a rota de disparo sem o segredo
- **THEN** recebe 404 e nada é enviado
