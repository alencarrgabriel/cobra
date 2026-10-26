# Proposal

## Why

O DDR 2.2 (cap. 13, RNF-20) define a identidade visual do Cobra e o protótipo navegável com dados fictícios foi aprovado em 2026-10-26. Todas as páginas seguintes (busca, mapa, perfil, votação, obras) vão reutilizar as mesmas peças: cores, fontes, card de político, barra de placar, painel lateral e gaveta. Se cada change criar as suas, o visual se fragmenta e a regra de tratamento igual para todos os partidos (§9.1) fica difícil de garantir. Esta change transforma o protótipo num design system no código, antes das páginas com dados.

## What Changes

- Tokens de design (cores, tipografia, espaçamento, raios, sombras) em CSS, com modo claro e escuro que segue o sistema e um botão para alternar, sem piscar a tela ao carregar.
- Fontes do protótipo servidas pelo próprio site (Newsreader para manchetes, Onest para interface e números).
- Estrutura de navegação: barra superior com seções no computador e barra inferior no celular (Início, Representantes, Votações, Obras), com as seções ainda não entregues marcadas como "em breve".
- Componentes reutilizáveis, sem dados reais: card, botão, pílula de filtro, abas, número de destaque com referência (KPI), barra de placar Sim × Não, selo de opção de voto, selo de partido, retrato com bandeira, card de representante, painel lateral que vira gaveta no celular, aviso (toast).
- Página interna `/design` (fora dos buscadores) mostrando todos os componentes em claro e escuro, para revisão.
- Página inicial refeita no novo visual (manchete, explicação, campo de busca ainda inativo com "em breve").
- Protótipo aprovado guardado em `docs/prototipo/` como referência.
- Testes: componentes (Vitest), tema e navegação (Playwright) e acessibilidade automática com axe nas páginas `/` e `/design`.

Requisitos do DDR cobertos: RNF-20 (design system), RNF-13 (WCAG 2.1 AA; base), RNF-15 (mobile first), RF-32 e §9.1 (identidade de partido com a mesma forma para todos; base visual), RF-09 (card de representante e gaveta; base visual), cap. 13 (padrões adotados).

Fora de escopo: dados reais e busca por CEP (`busca-geografica`), mapa do Brasil (`mapa-do-brasil`), tabela de cores e logotipos de partidos e bandeiras reais (`identidade-de-partidos-e-ufs`), painel de compartilhar e cards de imagem (`compartilhamento`), perfil e páginas de votação e obras.

## Capabilities

### New Capabilities

- `identidade-visual`: aparência e comportamento comuns a todas as páginas: tema claro e escuro, tipografia, contraste, navegação, e as regras visuais dos componentes que mostram políticos, partidos e votos.

### Modified Capabilities

(nenhuma: a nova página inicial continua cumprindo os requisitos de `aplicacao-web-base`, que são genéricos quanto ao conteúdo)

## Impact

- Código: `web/src/app/layout.tsx`, `web/src/app/page.tsx`, `web/src/app/globals.css` (substituído por tokens), novo `web/src/components/`, nova rota `web/src/app/design/`, novos testes em `web/src/components/**` e `web/e2e/`.
- Dependências novas (dev): `@axe-core/playwright`.
- `docs/prototipo/` com o HTML do protótipo e a malha de UFs do IBGE usada nele.
- Sem mudança em banco, coletores ou configuração.
