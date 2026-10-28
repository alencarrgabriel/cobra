# Feed e página da votação

## Why

Com as votações das duas casas, os critérios de relevância e os resumos aprovados no Cobra, falta o que o cidadão vê: o feed "O que aconteceu" com os votos dos seus representantes (RF-10, RF-11, RF-17) e a página de cada votação com placar por partido e por UF e a orientação das lideranças (RF-14), com link permanente (RF-60) e card de compartilhar (RF-61).

## What Changes

- **Feed `/votacoes`**: eventos das duas casas, do mais recente para o mais antigo, 20 por página: votação relevante (com o critério em palavras, o resultado, a contagem e o resumo aprovado, se houver) e votação simbólica (evento da proposição, sem voto individual). Filtro por casa.
- **Com um lugar** (`/votacoes?lugar=<código IBGE>`, também lembrado no aparelho e ligado a partir de "Seus representantes"): cada votação relevante mostra o voto de cada representante daquele lugar que tinha mandato na data, em ordem alfabética: sim, não, abstenção, obstrução, art. 17, presidente, presente sem voto, ausente com motivo (Senado) ou "não registrou voto" (Câmara, quando não há voto do deputado em exercício).
- **Página `/votacoes/<id>`**: proposição e ementa com link oficial, data, casa, resultado, contagem oficial e barra de placar; critérios de relevância; resumo aprovado com "revisado por pessoas" (e a indicação de IA), ou "o resumo ainda não foi revisado" — nada não revisado é mostrado (RF-13); orientações das lideranças; placar por partido e por UF; e a lista de votos em ordem alfabética. Simbólica e secreta: só a contagem, com a explicação.
- **Card da votação** nos três formatos e prévia de link; painel "Compartilhar" na página.
- "Votações" deixa de ser "em breve" na navegação; endereço de votação inexistente responde 404.

## Fora de escopo

- Feed de projetos apresentados (RF-12) e de faltas e gastos (RF-16); filtro por tema (RF-15, precisa do tesauro); alertas (change 25).

## Capabilities

### New Capabilities
- `feed-e-votacao`: o feed e a página da votação.

### Modified Capabilities
- `compartilhamento`: card e prévia de link também para a votação.

## Impact

- `web`: `/votacoes`, `/votacoes/[id]`, `/cartao/votacao/[id]/[formato]`, consultas `lib/votes/**`, Proxy, navegação; seed e testes.
- Sem mudança no banco nem nos coletores.
