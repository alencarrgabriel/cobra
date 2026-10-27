# Design

## Context

Tabelas `core.government_plans` (com o PDF em `bytea`), `core.government_plan_pages` (texto por página e `tsvector` em português), `core.plan_themes` (11 temas, palavras sem acento e áreas de obra) e `core.plan_page_themes`. No banco local: plano do governador do DF (72 páginas) e do presidente (21 páginas). As obras do DF têm `type` igual às áreas do Obrasgov.br.

## Goals / Non-Goals

**Goals:** ler o plano por tema com trecho literal e página do PDF; buscar uma palavra; ver obras da mesma área sem juízo de cumprimento.

**Non-Goals:** resumo do plano, avaliação de promessa, prefeitos, comparador.

## Decisions

### D1. Endereço
- `/planos/<ano>-<cargo>` para presidente e `/planos/<ano>-<cargo>-<uf>` para governador, em minúsculas (`2022-presidente`, `2022-governador-df`). Legível e estável.
- O Proxy confere a existência; endereço desconhecido responde 404.
- Tema e busca vão na query string (`?tema=saude`, `?q=creche`), para links compartilháveis.

### D2. Trecho literal (`lib/plans/excerpt.ts`, função pura)
- As palavras dos temas estão sem acento e em minúsculas; o texto das páginas tem acentos. Comparamos numa cópia "dobrada" do texto (sem acento, minúsculas) com **o mesmo comprimento** do original, e cortamos o trecho do original: o texto mostrado é exatamente o do PDF.
- Trecho: até 3 por página, cerca de 160 caracteres de cada lado, cortado em espaço, com "…" quando corta. Espaços e quebras de linha seguidas viram um espaço (só apresentação).
- Palavra de tema: casa a palavra inteira. Palavra da busca: casa palavras que começam pela raiz (a palavra sem o "s" final), para achar plural.
- Alternativa considerada: `ts_headline` do Postgres. Rejeitada porque o dicionário português não ignora acentos ("saude" não casa "saúde"), e a extensão `unaccent` deixaria o texto mostrado sem acentos.

### D3. Busca (RF-81)
- Uma página entra no resultado se casa a busca do Postgres (`websearch_to_tsquery('portuguese', q)`, que acha variações da palavra) **ou** a busca sem acento do D2. Os destaques vêm do D2; se a página casou só pelo Postgres, o trecho é o início da página.
- Busca com até 80 caracteres; vazia mostra os temas.

### D4. Obras da mesma área (RF-82)
- Para o tema escolhido: obras do DF cujo `type` está nas áreas do tema, em ordem alfabética, até 8, com situação e o total; links "ver todas" para `/obras?area=<área>`.
- O DF é a localidade do piloto, também para o plano do presidente (dito na tela).
- Frase fixa: "O Cobra mostra as obras da mesma área lado a lado com o plano. Não afirma se uma promessa foi cumprida." Tema sem área (Moradia): diz que nenhuma área do Obrasgov.br corresponde.

### D5. Neutralidade
- Temas em ordem alfabética, nunca por quantidade. Nome da chapa e do partido como o TSE registrou.
- Sem resumo, sem IA, sem adjetivo; as palavras de cada tema aparecem na tela.

### D6. PDF oficial
- `GET /planos/<plano>/pdf`: os bytes guardados, `application/pdf`, `inline`, cache de 1 dia. O hash mostrado na página é o guardado (igual ao do TSE, spec `planos-de-governo`).
- O link de cada trecho é `/planos/<plano>/pdf#page=N`, que os leitores de PDF dos navegadores abrem na página.

### D7. Consultas (`lib/plans/queries.ts`)
- `listPlans()`, `getPlan(slug)` (plano, páginas com temas, temas com contagem), `searchPlan(id, q)` e `worksForTypes(types)`, todas com `'use cache'` e o padrão de indisponibilidade; `planPdf(slug)` sem cache de dados (o arquivo é grande), com cache HTTP.

### D8. Testes
- Vitest: `excerpt` (acentos, palavra inteira, raiz, junção de trechos, corte), `planSlug`.
- Playwright com plano fictício no seed (PDF mínimo de 2 páginas): lista, tema com trecho e link da página, obras da área com a frase fixa, busca com plural e sem acento, PDF com `application/pdf`, 404, axe.

## Risks / Trade-offs

- Casamento por raiz é simples (só tira o "s") → o Postgres cobre as variações; o destaque pode faltar e então o trecho é o início da página.
- PDF de quase 1 MB lido do banco a cada pedido sem cache → cache HTTP de 1 dia.
