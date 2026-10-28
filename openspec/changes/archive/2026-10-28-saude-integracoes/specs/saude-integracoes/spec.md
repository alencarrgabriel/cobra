# Spec Delta

## Purpose

Define o painel de saúde das integrações do Cobra e o alerta de falha para a equipe: situação de cada fonte calculada por regra fixa a partir das execuções e da fila do coletor, falhas recentes, volume e e-mail diário quando algo está errado.

## ADDED Requirements

### Requirement: Painel de saúde
O painel editorial SHALL ter uma página, só para editores, com cada fonte em ordem alfabética e sua situação ("em dia", "atrasada", "com falha" ou "sem coleta"), a última execução, o último sucesso, a fila, as falhas dos últimos 7 dias com o erro e o volume de respostas brutas; a situação SHALL ser mostrada em texto, não só por cor.

#### Scenario: Fonte com falha
- **WHEN** a última execução de uma fonte falhou
- **THEN** o painel mostra a fonte como "com falha" e a falha na lista, com o erro

#### Scenario: Fonte atrasada
- **WHEN** o último sucesso de uma fonte passou da meta dela (1 dia; 30 dias para TSE e IBGE)
- **THEN** o painel mostra a fonte como "atrasada"

#### Scenario: Sem acesso
- **WHEN** alguém sem sessão de editor abre o painel de saúde
- **THEN** é levado à entrada do painel

### Requirement: Alerta de falha para a equipe
A manutenção diária SHALL enviar, no máximo uma vez por dia, um e-mail para o endereço da equipe configurado quando alguma fonte estiver "com falha" ou "atrasada"; sem endereço configurado, SHALL registrar no log.

#### Scenario: Alerta uma vez por dia
- **WHEN** a manutenção roda duas vezes no mesmo dia com uma fonte com falha
- **THEN** a equipe recebe um único e-mail com as fontes e o link do painel
