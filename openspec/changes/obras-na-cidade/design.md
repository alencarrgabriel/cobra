# Design

## Context

Dados: `core.works`, `core.work_progress`, `core.work_status_events`, `core.work_localities` (change `ingestao-obrasgov`). Visual: design system da `identidade-visual` (tokens, `Card`, `Kpi`, `FilterChip`, `Button`) e a tela "Obras" do protótipo. Next 16 com `cacheComponents`: dados lidos em tempo de requisição precisam ficar dentro de `<Suspense>`; `use cache` dá tempo de vida às consultas. Motivação: ver proposal.md.

## Goals / Non-Goals

**Goals:** primeira tela com dados reais, rápida no celular, acessível, sem depender do banco no build.

**Non-Goals:** CEP e outras cidades, emendas e parlamentar da obra, compartilhamento, fotos (a fonte não traz as imagens).

## Decisions

### D1. Acesso ao banco
- Driver `postgres` (postgres.js): leve, sem ORM, com consultas parametrizadas por template.
- `web/src/lib/db.ts` (`server-only`) cria um único cliente a partir de `WEB_DATABASE_URL`, com pool pequeno (5) e `statement_timeout` de 5 s. Em produção, o usuário do banco pertence a `cobra_web_reader` (somente leitura, design D6 de `modelo-dados-base`).
- `WEB_DATABASE_URL` é opcional no esquema de configuração: a rota de saúde e as páginas sem dados continuam funcionando sem ele (spec `aplicacao-web-base`). Sem ela, as consultas lançam `DataUnavailableError` e a página mostra o aviso.

### D2. Renderização e cache
- `/obras`: cabeçalho e explicação são estáticos. Os resultados ficam num componente dentro de `<Suspense>` que primeiro lê `searchParams` (dado da requisição) e então chama as consultas. Assim nenhuma consulta roda no build.
- As consultas usam `'use cache'` com `cacheLife('hours')`: os dados mudam uma vez por dia e o cache absorve picos (RNF-08). A chave inclui os filtros.
- Erros lançados dentro de `'use cache'` chegam à página mascarados em produção. Por isso cada leitura em cache devolve o resultado como valor (`tryDb`): dados por horas; banco indisponível por segundos (`cacheLife('seconds')`). A função exportada transforma a indisponibilidade em `DataUnavailableError` fora do cache, e a página mostra o aviso.
- "há N meses" depende da data de hoje: a página chama `connection()` antes de calcular, para renderizar por requisição.
- `/obras/[codigo]`: mesmo padrão com `params`; `generateMetadata` busca o nome da obra. A página chega em partes: primeiro a moldura estática, depois o conteúdo. Depois que a moldura sai, o status HTTP não muda mais. Por isso o código inexistente é tratado antes, em `src/proxy.ts`: o código é conferido pelo formato e por uma consulta ao banco, e o código desconhecido vai para a página "não encontrada" com status 404. Com o banco fora do ar, o proxy deixa passar e a ficha mostra o aviso de dados indisponíveis. `notFound()` na página fica só como segurança.

### D3. Filtros na URL
`?situacao=<status>&area=<tipo>&ordem=valor|nome&pagina=N`. Os valores de situação usam os nomes em português sem acento (`concluida`, `em-execucao`, `paralisada`, `inacabada`, `cadastrada`, `cancelada`), convertidos para o enum do banco. Valores inválidos são ignorados (voltam ao padrão), nunca causam erro. Os filtros são links (`<a>`), sem JavaScript: funcionam e podem ser compartilhados.

### D4. Ordem e paginação
Padrão: valor previsto, do maior para o menor, com empate por nome; alternativa: nome A–Z. O critério aparece escrito acima da lista. Página de 30 obras, com links "anterior" e "próxima".

### D5. Mapa
- Limite do DF a partir da malha de UFs do IBGE (código 53), simplificado e guardado em `web/src/lib/geo/df-boundary.json` em longitude e latitude.
- Projeção equirretangular com correção pelo cosseno da latitude média, calculada no servidor. O mapa é um SVG renderizado no servidor, sem biblioteca. Cada pino é um link para a ficha, com `aria-label` (nome e situação), cor pelo token `--work-*` e tamanho fixo.
- Abaixo do mapa: legenda das cores e "N obras sem localização não aparecem no mapa".
- Coordenadas fora do retângulo do DF, como vieram da fonte (9 de 1.136 na carga real), também não viram pino. O mapa informa quantas são.
- Alternativa: biblioteca de mapas com fundo de ruas (Leaflet ou MapLibre). Rejeitada por ora: pesaria no celular e exigiria provedor de mapas externo (CSP e privacidade). Pode entrar quando houver bairros.

### D6. Textos e situações
| Banco | Rótulo | Cor |
|---|---|---|
| completed | Concluída | `--work-done` |
| in_progress | Em execução | `--work-exec` |
| stopped | Paralisada | `--work-stop` |
| unfinished | Inacabada | `--work-stop` |
| registered | Cadastrada | `--work-idle` |
| cancelled | Cancelada | `--work-idle` |

"Cadastrada" ganha a explicação "registrada pelo gestor, sem início informado". Paralisada mostra "há N meses", contado do evento de paralisação mais recente. Valores em reais compactos ("R$ 1,2 mi") na lista e completos na ficha.

### D7. Testes com banco próprio
- `web/e2e/db/setup.ts` (globalSetup do Playwright): conecta em `E2E_ADMIN_DATABASE_URL` (padrão: Supabase local), recria o banco `cobra_e2e`, aplica `supabase/migrations/*.sql` em ordem e carrega `web/e2e/db/seed.sql` (obras de exemplo cobrindo cada situação, uma sem coordenadas, uma com nota de qualidade, uma paralisada com evento).
- O servidor de teste recebe `WEB_DATABASE_URL` apontando para `cobra_e2e`.
- CI: o job do site ganha um serviço `postgres:17`. Localmente, `pnpm check:web` passa a exigir o banco local ligado, como o `check:db`.

## Risks / Trade-offs

- [Consultas lentas com mais UFs] → Índices de `core.works (uf_code, status)` já existem; quando houver todo o Brasil, paginar no banco já está pronto.
- [Mapa sem ruas pode ser pouco informativo] → Endereço na lista e na ficha; mapa com ruas avaliado com a busca por bairro.
- [`'use cache'` em memória não sobrevive entre instâncias] → Aceitável no MVP; `use cache: remote` quando houver hospedagem definida.

## Migration Plan

Sem migração de banco. Deploy precisa de `WEB_DATABASE_URL` com usuário de leitura.
