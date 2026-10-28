# Design

## Context

O perfil hoje é `app/politicos/[slug]/page.tsx`, com 1.090 linhas e todas as seções numa página só. Os dados já existem e estão em consultas separadas (`lib/politicians/queries.ts`: votos, presença, gastos, trajetória, patrimônio, receitas, emendas). O Proxy redireciona o endereço para a forma canônica `/politicos/<id>-<nome>`.

A skill `frontend-design` (anthropics/skills) orienta:
- deixar um elemento memorável e o resto quieto;
- estrutura que carrega informação;
- evitar caixa-alta, metadados com "·", setas e cartões idênticos.

O DDR §13.1 fixa a serifa nas manchetes, a sem serifa nos dados, o fundo claro quente, os cartões arredondados, os botões em pílula, os números grandes com unidade compacta e a comparação sempre presente.

## Decisions

### D1. Abas com rota
- **Rotas**: `/politicos/[slug]` (Resumo), `/votos`, `/presenca`, `/gastos`, `/emendas`, `/trajetoria` e `/patrimonio`.
- **Layout** (`layout.tsx`): cabeçalho e barra de abas, compartilhados entre as abas.
- **Barra de abas**:
  - `<nav aria-label="Seções do perfil">` com links e `aria-current="page"`;
  - rola na horizontal no celular, com a aba atual visível;
  - não é um tablist em JavaScript, porque cada aba é uma página e funciona sem JS.
- **Abas sem dado**: uma aba sem dado para aquele político aparece com "—" e o motivo (regra do §9.1). Por exemplo, deputados distritais ainda não têm votos.
- **Proxy**: a canonização aceita o sufixo da aba e preserva a aba no redirecionamento.
- **Links e cards**: cada aba tem `shareMetadata` próprio. O card do perfil continua o mesmo.
- Alternativa rejeitada: abas por `?aba=`. Endereços com parâmetro de consulta são piores de compartilhar e de indexar, e o Apuração também usa subcaminhos.

### D2. Cabeçalho e resumo
```
Celular (390 px)                     Computador (1440 px)
┌──────────────────────────┐         ┌──────────────────────────────────────────────┐
│ [foto] Danilo Forte      │         │ [foto]  Danilo Forte                          │
│        [PP] [CE] Dep.fed │         │         [PP] [bandeira CE] Deputado federal   │
│        Em exercício      │         │         Em exercício desde 01/02/2023         │
│ [Seguir] [Compartilhar]  │         │         [Seguir] [Compartilhar]               │
├──────────────────────────┤         ├──────────────────────────────────────────────┤
│ Resumo Votos Presença >  │         │ Resumo  Votos  Presença  Gastos  Emendas ...  │
├──────────────────────────┤         ├───────────┬───────────┬───────────┬──────────┤
│ 75%  presença            │         │ 75%       │ 1.128     │ R$ 312 mil│ R$ 18 mi │
│ mediana da casa 81%      │         │ presença  │ votações  │ gastos    │ emendas  │
│ ...                      │         │ mediana   │ com voto  │ em 2026   │ empenhado│
│                          │         │ 81%       │           │ cota      │          │
├──────────────────────────┤         ├───────────┴───────────┴───────────┴──────────┤
│ Votações recentes        │         │ Votações recentes                Ver todas    │
│ [Sim] PLP 281/2019 ...   │         │ [Sim]  PLP 281/2019  Regimes de resolução ... │
│ [Não] PL 1123/2025 ...   │         │ [Não]  PL 1123/2025  Exames no SUS ...        │
└──────────────────────────┘         └──────────────────────────────────────────────┘
```
- **Cabeçalho**: foto quadrada de 96 px no celular e 120 px no computador, sem a faixa azul de hoje. O nome fica em serifa. Partido (RF-32) e bandeira da UF usam o mesmo tamanho para todos.
- **"Seguir" e "Compartilhar"**: lado a lado. "É você nesta página?" e "Reportar erro" ficam no rodapé do perfil, com o mesmo texto de hoje.
- **`StatStrip`**: até 5 números grandes, cada um com unidade compacta, a referência na linha de baixo (mediana da casa, ano) e a fonte com a data.
  - Cada número é um link para a sua aba.
  - Número sem dado vira "—" com o motivo.
  - A ordem é fixa, igual para todos os políticos.
- **Quem é**: a frase de modelo fixo e o nome civil vêm depois dos números, em texto menor.

### D3. Votos em linhas
- **`VoteRow`**:
  - chip do voto: Sim, Não, Abstenção, Obstrução, Ausente ou "Não registrou", com as cores de voto e o rótulo em texto;
  - proposição com link para a página da votação;
  - ementa limitada a 2 linhas;
  - data e resultado à direita no computador e abaixo no celular;
  - relevância e resumo revisado num `<details>`.
- **Aba Votos**:
  - contagem por opção no topo, em texto e com barra;
  - filtros por casa, quando houver mais de uma, e por "só relevantes";
  - paginação de 20.
- **Resumo**: as 5 mais recentes, com "Ver todas as votações", sem seta.

### D4. Busca única por nome
- **Campo**: o mesmo campo aceita CEP, cidade, UF ou nome. A partir de 3 letras, mostra até 8 sugestões de políticos, cada uma com nome, partido e UF.
- **Sugestões**:
  - lidas de `GET /api/busca?q=` (`core.politicians`, por `search_name`), com cache curto;
  - as do servidor não usam JavaScript; as de fora seguem o padrão combobox da WAI-ARIA (`role="combobox"`, `aria-expanded`, navegação por setas).
- **Enviar o formulário**: com um nome que bate com exatamente um político, vai ao perfil. Com vários, mostra a lista. Com CEP, cidade ou UF, segue o fluxo de hoje.
- **`/representantes` sem lugar**: busca, mapa e lista de estados, como a página inicial, em vez de uma página vazia.
- **Card de representante**:
  - o clique continua abrindo o painel (§13.1);
  - o painel abre com "Ver perfil completo" como botão principal;
  - o nome no card vira um link direto para o perfil.

### D5. Bandeiras no mapa
- **Opinião**: colocar a bandeira de todos os 27 estados de uma vez deixa o mapa bonito em tela grande, mas atrapalha nos outros casos:
  - estados pequenos (DF, SE, AL, RN, PB, ES, RJ) viram manchas sem forma reconhecível;
  - as fronteiras se perdem entre as cores das bandeiras;
  - o mapa vira um mosaico que disputa atenção com o resto da página e com as cores de partido;
  - o modo escuro fica pesado.
- **Recomendação**: mapa neutro em repouso, e a bandeira aparece recortada no contorno do estado sob o ponteiro, com foco ou selecionado, com uma transição curta. Sem movimento, se a pessoa pedir menos animação.
  - No celular, onde não há ponteiro, a bandeira aparece no estado tocado.
  - A lista de estados ao lado continua com a bandeira pequena.
  - Isso mantém a regra "Mapa neutro" e dá o efeito visual no momento de interação.
- **Técnica**: um `<pattern>` por estado com a imagem da bandeira já servida pelo site (`/bandeiras/<uf>.svg`), aplicado como `fill` só no estado ativo. Nada carrega antes da interação.
- **Alternativa, se o usuário preferir**: todas as bandeiras sempre visíveis, com 35% de opacidade sobre a cor neutra e contorno reforçado. Exige mudar o requisito "Mapa neutro".

### D6. Acabamento visual
- **Caixa-alta**: o rótulo em caixa-alta (`.eyebrow`) fica só onde orienta, como o cargo no cabeçalho do perfil. Sai de cima dos títulos de seção.
- **Metadados**: data, casa e resultado viram elementos próprios, com peso e cor diferentes, em vez de "A · B · C". Isso vale no feed, nas linhas de voto e nos cards.
- **Links**:
  - as setas saem de "← Votações", "Mais antigas →" e similares;
  - "voltar" vira trilha de navegação (`Votações › PLP 186/2026`);
  - os links de texto corrido ficam sublinhados, e os links de navegação, não.
- **Cartões**: três variações com função clara.
  - Destaque: o número do resumo.
  - Lista: linhas separadas por fio, sem caixa.
  - Painel: borda e fundo, para formulários e o painel editorial.
  - O perfil e o feed deixam de empilhar cartões iguais.
- **Espaço**: uma escala só entre seções (`--space-5` no celular, `--space-6` no computador). As medidas soltas nos módulos CSS dão lugar aos tokens.
- **Feed de votações**: o título vira o tema da votação, que é a ementa curta, e a proposição vira metadado. O placar ganha números maiores ao lado da barra. A fonte vai para o rodapé do cartão, em texto menor.
- **Sem mudança de tokens de cor ou de fonte**: o contraste AA é conferido de novo pelos testes que já existem.

### D7. Estrutura inspirada no Politicômetro, visual próprio
O que se adota, e como o Cobra faz diferente e melhor:

| Padrão deles | No Cobra |
|---|---|
| Número gigante no topo da página inicial | Número gigante em serifa da identidade do Cobra, com a divisão por cargo em texto e a fonte e a data logo abaixo. Só mostra o que está no banco |
| Faixa de números no perfil | `StatStrip` com o mesmo conjunto, mais a referência (mediana da casa) e a fonte em cada número. Ordem fixa, sem destaque por partido |
| Votos em linha do tempo com chips verdes | `VoteRow` com chip em texto e cor de voto, e o resultado ao lado. O chip nunca é só cor (§9.1, contraste AA) |
| Foto redonda com a bandeira ao fundo | Foto em quadrado arredondado com a bandeira da UF e a sigla do partido no mesmo tamanho para todos (RF-32) |
| Perfil numa página só com ~20 seções | Abas com endereço próprio (D1): mais leve no celular, e cada aba carrega só o que mostra |
| "Me representa" com círculos concêntricos | Diagrama próprio de três níveis (cidade, estado, Brasília), acessível por teclado, com a lista em texto logo ao lado |
| "Ouvir esta página" | Mesmo recurso, só no navegador (`speechSynthesis`), com pausa e velocidade |
| Mapa em pontos coloridos por região | Mapa de estados neutro com a bandeira no estado ativo (D5) |

O que o Cobra faz além, para ficar melhor:
- **Data e fonte em todo número**, não só no rodapé do bloco.
- **Neutralidade verificável**: a mesma ordem e os mesmos campos para todos os políticos, e a metodologia aberta.
- **Obras, emendas e planos de governo** no perfil e na cidade, que o concorrente não tem.
- **Celular primeiro**: barra de abas rolável, faixa de números em duas colunas e votos em linhas de altura fixa.
- **Estados vazios que explicam**: onde falta dado, "—" com o motivo e o link para a metodologia.

### D8. Espaço do salário e níveis ainda sem cobertura
- A faixa do Resumo reserva o lugar do salário (RF-87). Sem fonte coletada, mostra "—" e "salário ainda não coletado" com link para a metodologia; nunca zero.
- "Me representa" sempre mostra os três níveis. Um nível sem cobertura vira um cartão com "—" e o que falta ("prefeito e vereadores entram com os eleitos pelo TSE"), em vez de sumir.

### D9. Número da página inicial
- `getCoverage()`: contagem de mandatos em exercício por cargo (`core.mandates`, sem encerrados), com a data da última coleta (`max(collected_at)`), em cache de uma hora.
- Em tela, número grande em serifa, e a divisão por cargo numa linha de texto. Sem banco, a página mostra o texto sem o número.

### D10. Ouvir esta página
- Botão no cabeçalho de cada página de conteúdo. Lê o elemento `main` pelo `speechSynthesis` do navegador, em português do Brasil, com botões de pausa e de velocidade (1x, 1,25x, 1,5x).
- Só aparece quando o navegador oferece síntese de voz. Nenhum texto sai do aparelho.
- Teste: o botão existe e alterna entre ler e pausar (com a API simulada); o axe passa.

### D11. Processo e testes
- **Protótipo antes de mexer em tudo**: o perfil do Resumo, em celular e computador, aprovado pelo usuário antes das outras abas.
- **Playwright**:
  - as abas, com endereço, `aria-current` e "—" sem dado;
  - a busca por nome: sugestões e um resultado que leva ao perfil;
  - `/representantes` com mapa;
  - a bandeira no estado ativo e só nele;
  - axe em todas as abas.
- **Capturas de tela**: das telas principais em 390 e 1440 px, guardadas como referência para a revisão visual. Não entram como teste de regressão por pixel.
