# Design

## Context

O site hoje tem só a página inicial mínima, a 404 e `/api/health`, com um `globals.css` simples. A referência aprovada é o protótipo publicado em 2026-10-26 (HTML único com tokens CSS, Newsreader + Onest, componentes em CSS puro). O site usa Next.js 16 com `cacheComponents`, CSP sem nonce (permite script inline) e testes com Vitest e Playwright. Motivação: ver proposal.md.

## Goals / Non-Goals

**Goals:**
- Tokens e componentes que as próximas changes usam sem reinventar estilo.
- Acessibilidade verificada automaticamente desde o primeiro componente.
- Mesma aparência do protótipo aprovado, nos dois temas.

**Non-Goals:**
- Dados reais, busca, mapa, painel de compartilhar e páginas de perfil, votação e obras.
- Tabela real de cores de partido, logotipos e bandeiras (change `identidade-de-partidos-e-ufs`).
- Testes de regressão visual por imagem (avaliar quando houver mais páginas).

## Decisions

### D1. Tokens em CSS custom properties e componentes com CSS Modules
- `globals.css` define os tokens em `:root` (tema claro), redefine em `[data-theme="dark"]` e em `@media (prefers-color-scheme: dark)` com `:root:not([data-theme="light"])`, como no protótipo.
- Cada componente tem seu `.module.css` usando só tokens: nenhuma cor literal fora de `globals.css`.
- Tokens: `--bg`, `--surface`, `--surface-2`, `--line`, `--fg`, `--muted`, `--accent`, `--accent-fg`, `--focus`; voto `--vote-yes`, `--vote-no`, `--vote-other`; situação de obra `--work-done`, `--work-exec`, `--work-stop`, `--work-idle`; `--font-display`, `--font-ui`; escala de espaço e raios. Os valores vêm do protótipo.
- Um teste lê os módulos CSS e falha se encontrar cor literal (hex, `rgb(`, `hsl(`) fora de `globals.css`. É a garantia do RNF-20.
- Alternativa: Tailwind. Rejeitada por ora: o protótipo já está em tokens CSS, CSS Modules não têm custo em tempo de execução e mantêm o HTML legível para contribuidores. Pode ser revisto se o volume de componentes crescer.

### D2. Tema sem piscar
- Um script inline e síncrono no `<head>` lê `localStorage["cobra-theme"]` e aplica `data-theme` no `<html>` antes da primeira pintura. Sem escolha salva, não aplica nada e o CSS segue `prefers-color-scheme`.
- O botão de tema é um componente cliente que alterna entre claro e escuro e salva a escolha. Erros de `localStorage` (navegação privada) são ignorados.
- `<html suppressHydrationWarning>` para o atributo aplicado antes da hidratação.
- A CSP atual (`script-src 'self' 'unsafe-inline'`) já permite o script inline (design D5 da fundação).

### D3. Fontes servidas pelo próprio site
`next/font/google` com Newsreader (500 e 600, eixo óptico) e Onest (400 a 800), subconjunto `latin`, `display: swap`, expostas como variáveis CSS. As fontes são baixadas no build e servidas pelo domínio do Cobra, então a CSP `font-src 'self'` continua valendo e nenhum dado do visitante vai ao Google.
- Alternativa: arquivos de fonte no repositório. Rejeitada: o `next/font` faz o mesmo sem versionar binários. O custo é o build precisar de internet (o CI tem).

### D4. Componentes
Em `web/src/components/<Nome>/` (`<Nome>.tsx`, `<Nome>.module.css`, `<Nome>.test.tsx`). Servidor por padrão; cliente só onde há interação.

| Componente | Tipo | Observação |
|---|---|---|
| `AppShell` (barra superior, barra inferior) | servidor + `ThemeToggle` cliente | Itens sem página viram `<span aria-disabled>` com "em breve" |
| `Button`, `Card`, `FilterChip`, `Tabs` | servidor / `Tabs` cliente | `Tabs` segue o padrão ARIA de abas (setas do teclado) |
| `Kpi` | servidor | Exige `reference` (rótulo e valor) e `source`; a barra marca a referência |
| `VoteSplitBar` | servidor | Partes com `aria-label` "312 Sim, 141 Não, 9 outros" |
| `VoteBadge` | servidor | Sempre texto + cor do token de voto |
| `PartyBadge` | servidor | Recebe `{ acronym, color }`; cor do texto escolhida por contraste |
| `Portrait` | servidor | `photoUrl` opcional; sem foto, ilustração neutra com iniciais; espaço para bandeira (`flag: ReactNode`) |
| `RepresentativeCard` | servidor | Retrato, nome, `PartyBadge`, UF; mesma estrutura para todos |
| `SidePanel` | cliente | Painel lateral (≥ 1080 px) ou gaveta (menor) |
| `Toast` | cliente | `role="status"` |

### D5. Contraste do selo de partido calculado
`readableTextOn(color)` calcula a luminância relativa (WCAG) e escolhe texto claro ou escuro, garantindo razão ≥ 4,5:1; se nenhuma das duas atingir, escurece a cor de fundo até atingir. Testado com cores claras (amarelo), médias e escuras. Assim a change de partidos pode cadastrar qualquer cor sem quebrar o AA.

### D6. Painel com `<dialog>` nativo
`SidePanel` usa `<dialog>`: no celular, `showModal()` (gaveta modal, com o fundo bloqueado e o foco preso nativamente); em telas largas, `show()` (painel não modal ao lado do conteúdo, posicionado por CSS). Esc fecha nos dois casos (o evento `cancel` é tratado no não modal). Ao fechar, o foco volta ao elemento que abriu, guardado no `open()`.
- Alternativa: biblioteca de diálogo (Radix). Rejeitada: o `<dialog>` cobre os casos com menos código e sem dependência.

### D7. Catálogo `/design`
Página de servidor com `metadata.robots = { index: false, follow: false }`, mostrando cada componente com dados fictícios e o aviso "dados fictícios". As cores de partido de exemplo são fictícias (três tons quaisquer), para não antecipar a tabela real.

### D8. Testes
- Componentes: Vitest com Testing Library em ambiente `jsdom` (anotação por arquivo; o padrão continua `node`).
- Playwright:
  - tema pelo `colorScheme` emulado e pela escolha salva;
  - ausência de piscar: um teste confere `data-theme` antes do `load`, com JavaScript de componentes ainda não hidratado;
  - barra inferior a 360 px;
  - abrir e fechar o painel pelo teclado em `/design`.
- Acessibilidade: `@axe-core/playwright` com as tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` em `/` e `/design`, nos dois temas.

### D9. Protótipo guardado como referência
`docs/prototipo/cobra-prototipo.html` (o arquivo publicado, com dados fictícios) e `docs/prototipo/README.md` explicando a origem, o aviso de dados fictícios e a fonte da malha das UFs (IBGE, API de malhas, qualidade intermediária, obtida em 2026-10-26).

## Risks / Trade-offs

- [Build depende de baixar fontes do Google] → O CI tem internet; localmente o `next dev` também baixa. Em caso de falha, o fallback das pilhas de fontes mantém a página legível.
- [Script inline de tema] → Pequeno, sem dados do usuário; continua coberto pela CSP atual. Se a CSP ganhar nonce no futuro, o script recebe o nonce.
- [`<dialog>` não modal posicionado ao lado] → Comportamento de foco testado no Playwright; se algum navegador falhar, cai para modal em todas as larguras.
- [Teste de "cor literal" pode reprovar casos legítimos (ex.: `transparent`)] → A regra considera só hex, `rgb()`, `rgba()`, `hsl()` e `hsla()`.

## Migration Plan

Troca visual sem dados. Rollback: reverter os commits da change.
