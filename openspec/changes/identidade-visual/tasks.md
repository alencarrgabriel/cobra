# Tasks

## 1. Fundamentos

- [x] 1.1 Guardar o protótipo em `docs/prototipo/cobra-prototipo.html` com `docs/prototipo/README.md` (origem, aviso de dados fictícios, fonte da malha do IBGE); verificar que o arquivo abre localmente no navegador
- [x] 1.2 Substituir `globals.css` pelos tokens do protótipo (claro, escuro por sistema e por `data-theme`), incluindo tokens de voto e de situação de obra; adicionar teste Vitest que falha com cor literal em qualquer `*.module.css`; verificar `pnpm --filter web test`
- [x] 1.3 Configurar Newsreader e Onest com `next/font/google` como variáveis CSS no layout; verificar `pnpm --filter web build` e que o HTML gerado não referencia `fonts.googleapis.com`
- [x] 1.4 Script inline de tema no `<head>` e componente `ThemeToggle`; testes Playwright: segue o sistema, lembra a escolha após recarregar e `data-theme` já está aplicado no primeiro quadro

## 2. Componentes básicos

- [x] 2.1 `Button`, `Card`, `FilterChip` com testes de renderização e estado `aria-pressed`
- [x] 2.2 `Tabs` (padrão ARIA com setas do teclado); teste Vitest de navegação por teclado
- [x] 2.3 `Kpi` com referência obrigatória e fonte; teste que confere a marca da referência na barra e a ausência de rótulos de juízo
- [x] 2.4 `VoteBadge` e `VoteSplitBar` com tokens de voto e rótulos acessíveis; testes do texto da opção e do `aria-label` da barra
- [x] 2.5 `readableTextOn` (contraste WCAG) e `PartyBadge`; testes com cor clara, média e escura garantindo razão ≥ 4,5:1 e dimensões iguais para siglas curtas e longas
- [x] 2.6 `Portrait` (foto ou ilustração com iniciais, espaço para bandeira) e `RepresentativeCard`; teste que cards de partidos diferentes têm a mesma estrutura

## 3. Estrutura e interação

- [x] 3.1 `AppShell` com barra superior e barra inferior (Início, Representantes, Votações, Obras; "em breve" nas indisponíveis) aplicado ao layout; teste Playwright a 360 px e a 1440 px
- [x] 3.2 `SidePanel` com `<dialog>` (painel lateral ≥ 1080 px, gaveta no celular, Esc, retorno de foco) e `Toast`; testes Playwright de teclado e de posição da gaveta
- [x] 3.3 Página inicial no novo visual (manchete serifada, explicação, campo de busca inativo com "em breve", texto sobre eleição pelo estado inteiro); atualizar os testes de `aplicacao-web-base` se algum seletor mudar e verificar que continuam passando

## 4. Catálogo e acessibilidade

- [x] 4.1 Página `/design` com todos os componentes, dados fictícios sinalizados e `noindex`; teste Playwright do aviso e da meta `robots`
- [x] 4.2 Adicionar `@axe-core/playwright` e testes de acessibilidade em `/` e `/design` nos dois temas (tags WCAG 2.1 A e AA); corrigir o que aparecer

## 5. Integração final

- [x] 5.1 Rodar `pnpm check` e `pnpm check:secrets`; comparar `/` e `/design` com o protótipo nos dois temas e registrar no resumo da change o que difere de propósito

## Workflow follow-up

- Revisar com o responsável e só então arquivar a change.
