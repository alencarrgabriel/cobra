# Página de metodologia

## Why

O DDR pede uma página pública de metodologia com as fontes, os critérios de relevância e a frequência de atualização (RF-65), e diz que a regra de temas dos planos de governo é publicada nela (§4.4c). Hoje essas regras estão espalhadas em textos de ajuda e na documentação técnica. O reporte de erro vem na change seguinte (`reporte-de-erro`).

## What Changes

- **`/metodologia`**, em linguagem simples, com âncoras por seção:
  - **Fontes**: cada fonte oficial, com o que o Cobra usa dela, o link e a data da última coleta, lida do banco.
  - **Atualização**: as metas do DDR (votações em até 6 h; gastos, presença, obras e emendas todo dia; TSE a cada publicação) e o aviso de que a data mostrada em cada dado é a que vale.
  - **Votação relevante**: os quatro critérios do §9.2, com os números exatos, e como votações simbólicas e secretas aparecem.
  - **Regras editoriais**: as do §9.1, incluindo resumos com revisão humana, rascunho por IA sinalizado e a regra do "—".
  - **Temas dos planos de governo**: a lista de palavras de cada tema, lida do banco, e a regra de duas ocorrências por página.
  - **Ligação obra–emenda**: os graus de confiança.
  - **O que o Cobra não faz**: não dá nota, não faz ranking e não consulta o governo em tempo real.
- **Links**: rodapé, ajuda de relevância no feed e na página da votação, e página de planos.

## Capabilities

### New Capabilities
- `metodologia`: página pública com fontes, atualização, critérios e regras.

### Modified Capabilities
- (nenhuma)

## Impact

- `web`: página `/metodologia` e consulta das últimas coletas e dos temas, com leitura somente pelo papel do site; links nas páginas citadas.
- Testes Playwright: seções, critérios, temas, data de coleta e axe.
