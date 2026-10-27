# Proposal

## Why

No DF não há prefeito nem vereadores: os 24 deputados distritais fazem o papel de deputado estadual e de vereador ao mesmo tempo (RF-06). Sem eles, a grade "Seus representantes" do piloto (3 senadores, 8 deputados federais e 24 distritais, DDR §3) fica incompleta. Os federais e senadores já estão no banco; esta change traz os distritais.

## What Changes

- Adaptador `cldf` para os coletores. A CLDF não tem API de deputados: o portal de dados abertos (`dados.cl.df.gov.br`, CKAN), conferido em 2026-10-26, só traz deputados misturados à lista nominal de cerca de 2.400 servidores, sem partido. Por isso a fonte é o site oficial da CLDF:
  - página "Legislatura Atual" (`/deputados-2023-2026`): nome parlamentar, partido, foto oficial e endereço do perfil de cada um dos 24;
  - página de perfil de cada deputado: nome completo, data de nascimento e partido.
- O que fica guardado, nas tabelas que já existem:
  - político com nome civil, nome parlamentar, data de nascimento e foto oficial; identificador da CLDF;
  - partido atual, quando o informado pela CLDF é um partido existente;
  - mandato de deputado distrital na CLDF, pelo DF, na legislatura 2023–2026.
- Mesmo político em outra casa: ligado pelo nome civil e pela data de nascimento, como no Senado.
- Quem sai da lista tem o mandato encerrado; lista incompleta não mexe em nada.
- Testes com páginas reais gravadas (sem rede).

Requisitos do DDR cobertos: RF-03 e RF-06 (dados dos distritais; a tela vem em `busca-geografica`), RF-09 (foto e sigla), RNF-06, RNF-09, RNF-16, §6.1 (CLDF), §6.2 (identidade única), RNF-12 (coleta mínima: não guardamos a lista de servidores).

Fora de escopo:
- Telas; proposições, votações e despesas da CLDF.
- Distinguir titular de suplente e a data exata de posse: o site não informa. Todos ficam como em exercício desde o início da legislatura, até que a change `ingestao-tse` traga os eleitos de 2022 e corrija.
- CPF.
- Agendamento automático.

## Capabilities

### New Capabilities

- `deputados-distritais`: quais dados de deputados distritais o Cobra guarda, de onde vêm, como são atualizados e quais regras valem antes de publicar.

### Modified Capabilities

(nenhuma)

## Impact

- Novo adaptador `collectors/src/cobra_collectors/sources/cldf.py` (leitura de HTML com a biblioteca padrão), registrado no `REGISTRY`.
- Páginas reais gravadas em `collectors/tests/fixtures/cldf/`.
- Sem migração.
- `docs/coleta.md` ganha a seção da CLDF.
- Item do DDR §15 "Estrutura e frequência de atualização do portal de dados abertos da CLDF" respondido: o portal não serve para deputados.
