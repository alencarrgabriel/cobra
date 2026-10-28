# Rascunho de resumo por IA

## Why

O DDR permite que resumos de votações sejam rascunhados por IA, desde que só sejam publicados após aprovação humana registrada e que o rodapé indique o uso de IA (cap. 2, §6, RF-13). O painel editorial (`painel-editorial`) já tem rascunho, versão e aprovação. Decisão de 2026-10-27: rascunho pela Claude API (modelo Haiku, centavos por resumo).

## What Changes

- Botão **"Gerar rascunho com IA"** na página de edição da votação, visível só quando `ANTHROPIC_API_KEY` está configurada.
- O rascunho é gerado pela Claude API (`claude-haiku-5-5`) só com os dados oficiais da votação: proposição e ementa, descrição, resultado, contagem e orientações das lideranças. As instruções seguem as regras editoriais do DDR §9.1 (fato, sem adjetivos de valor, sem inventar argumentos, mesmo tratamento para todos).
- Ele vira uma nova versão **em rascunho**, com o modelo registrado, e vai para a trilha de auditoria. Nada é publicado sem a aprovação de um editor.
- Se uma versão da votação veio de IA, o resumo publicado mostra "a partir de um rascunho feito com IA", mesmo que o editor tenha corrigido o texto depois.
- Recusa do modelo, erro da API ou falta de chave aparecem como aviso no painel; nada é gravado.

## Fora de escopo

- Resumo de projetos; geração em lote; avaliação automática da qualidade dos rascunhos.

## Capabilities

### New Capabilities
- (nenhuma)

### Modified Capabilities
- `painel-editorial`: rascunho por IA com aprovação humana e indicação no rodapé.

## Impact

- `web`: `@anthropic-ai/sdk` 0.133.0; `lib/editorial/draft.ts`; ação no painel; variável `ANTHROPIC_API_KEY` (só no servidor, opcional).
- Migração: a visão `core.published_summaries` passa a indicar o uso de IA em qualquer versão da votação.
- Custo: por uso, centavos por rascunho (Haiku 5.5: US$ 0,10 por milhão de tokens de entrada e US$ 0,50 de saída).
