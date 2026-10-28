# Design

## Context

`core.events` (relevantes e simbólicas), `core.vote_relevance` (critérios), `core.votes`, `core.vote_ballots` (votos com partido e UF na data, inclusive de quem não está no cadastro), `core.vote_orientations` e `core.published_summaries` já existem. Mandatos (`core.mandates`) dão quem estava em exercício em cada data.

## Decisions

### D1. Feed
- Lê `core.events` com a votação, os critérios e o resumo publicado; 20 por página (`?pagina=`), filtro `?casa=camara|senado`.
- Ordem: data da votação, mais recente primeiro; empate pelo registro e pelo id. Nenhuma ordenação por partido ou resultado.

### D2. Votos do lugar
- `?lugar=<código IBGE>` (UF ou município, validado como em "Seus representantes"): representantes da UF do lugar com mandato na Câmara ou no Senado aberto na data da votação.
- Voto: a linha de `core.vote_ballots` do político; sem linha, na Câmara, "Não registrou voto" (o arquivo da Câmara só traz quem votou); no Senado, toda presença e ausência vem do próprio Senado. Distritais não entram (a Câmara Legislativa não está no Cobra).
- O lugar escolhido é lembrado no aparelho (mesma chave de "Seus representantes"), e o feed oferece o link quando há um lugar lembrado. O CEP nunca entra.

### D3. Página da votação
- `/votacoes/<id>`: id do Cobra. Placar por partido e por UF agregados de `core.vote_ballots` (só votações nominais com votos conferidos): sim, não e outros por sigla e por UF, em ordem alfabética. Lista de votos com nome, partido, UF e opção, em ordem alfabética, com link ao perfil quando o político está no cadastro.
- Resumo: só de `core.published_summaries`; sem resumo publicado, "O resumo desta votação ainda não foi revisado pela equipe."
- Critérios em palavras (mesmo texto do perfil) e a explicação de cada um.
- Proxy: id inexistente responde 404.

### D4. Card e prévia
- `/cartao/votacao/<id>/<formato>`: casa, data, proposição (título), resultado e contagem oficial; fonte e data de coleta. Mesmo modelo dos outros cards.
- `generateMetadata` com Open Graph e X apontando para o card `link`.

### D5. Neutralidade
- Cores de Sim e Não só pelos tokens de voto (nunca de partido). Placar por partido em ordem alfabética, sem destacar "quem ganhou".

### D6. Testes
- Vitest: agregação do placar, rótulos de opção.
- Playwright (seed): feed com relevante e simbólica; votos do lugar com "Não registrou voto"; página com placar por partido, por UF, orientações e resumo publicado; simbólica sem votos; 404; card PNG; axe.
