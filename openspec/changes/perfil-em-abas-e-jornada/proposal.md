# Perfil em abas, jornada e acabamento visual

## Why

Com dados reais carregados, o site funciona mas é difícil de usar e pouco bonito (avaliação de 2026-10-28):

- **Perfil**: uma página única e longa, com cartões iguais empilhados. Os votos são listas de parágrafos densos e não há um resumo do mandato no topo. "Seguir" e "Compartilhar" ficam empilhados um sobre o outro. A página também é pesada: carrega tudo de uma vez, e foi a primeira a estourar o tempo de consulta.
- **Jornada**:
  - `/representantes` no computador é só um campo de busca numa página vazia;
  - o mapa da página inicial fica abaixo da dobra, todo cinza;
  - não há busca pelo nome do político, apesar de o DDR prever "CEP, cidade ou nome do político" (§13.1);
  - chegar ao perfil exige dois toques (card → painel → "Ver perfil completo").
- **Visual**: repete vícios de interface genérica que a skill oficial `frontend-design` (anthropics/skills, consultada em 2026-10-28) manda evitar:
  - rótulo em caixa-alta acima de todo título;
  - metadados separados por "·";
  - cartões idênticos com a mesma borda;
  - setas em links ("← Votações", "Mais antigas →");
  - links sublinhados por toda parte;
  - parágrafos longos onde caberia um número.

Referências pedidas pelo usuário: a página de parlamentar do Apuração Brasil e, depois, o Politicômetro (navegado em 2026-10-28), que o usuário quer igualar em funcionalidade e superar em acabamento. Do Politicômetro adotamos a estrutura de informação (número grande no topo, faixa de números no perfil, linha do tempo de votos, três níveis em "Me representa", leitura em voz alta), nunca o visual, o texto ou a marca, que ele reserva ("código, design e textos: todos os direitos reservados"). O DDR §13 já exige identidade própria.

O Apuração Brasil tem Ela tem cabeçalho com foto e partido, seções por assunto (presença, votos, gastos, emendas, projetos), números grandes com o detalhe logo abaixo e um "ver todos" em cada seção. Adotamos o padrão de organização, com identidade própria (DDR §13) e sem o que fere a neutralidade: nada de "mais e menos presentes", nem rankings (§9.1).

## What Changes

- **Perfil em abas com endereço próprio**: Resumo, Votos, Presença, Gastos, Emendas e obras, Trajetória, Patrimônio e campanha.
  - Cada aba é uma rota (`/politicos/<id>-<nome>/votos`…), que dá para compartilhar e carrega só o que mostra.
  - O cabeçalho é compacto e fixo em todas as abas: foto, nome, partido, bandeira da UF, cargo e situação, com "Seguir" e "Compartilhar" lado a lado.
  - O Resumo traz uma faixa de números, cada um com sua referência e link para a aba: presença com a mediana da casa, votações com voto registrado, gastos no ano, emendas e patrimônio declarado. Abaixo vêm as 5 votações mais recentes, em linhas compactas.
- **Votos legíveis**: cada votação vira uma linha com o voto do político em destaque (um chip na cor de voto, nunca na cor de partido), a proposição, um título curto de até 2 linhas, o resultado e a data. O detalhe completo abre ao tocar.
- **Número grande na página inicial**: abaixo do título, o total de mandatos que o Cobra cobre hoje, lido do banco, com a divisão por cargo e a data da última atualização. O número cresce sozinho conforme novas fontes entram, e é sempre o que está no banco, nunca uma meta.
- **Salário na faixa de números**: o espaço do salário mensal entra na faixa desde já, mostrando "—" com o motivo até a change `salarios` trazer a fonte oficial (RF-87). Assim a faixa não muda de forma depois.
- **"Me representa" em três níveis**: "na sua cidade", "no seu estado" e "em Brasília", com um diagrama próprio. Os níveis ainda sem cobertura (prefeito e vereadores) aparecem com "—" e a explicação, até a change dos eleitos pelo TSE (RF-85).
- **Ouvir esta página**: botão que lê o conteúdo principal em voz alta pelo recurso de síntese de voz do próprio navegador, sem enviar nada a servidor. Acessibilidade para quem lê com dificuldade.
- **Busca única**: o mesmo campo aceita CEP, cidade, UF ou nome do político, com sugestões de nomes enquanto a pessoa digita. O nome leva direto ao perfil.
- **Jornada**:
  - `/representantes` sem lugar mostra o mapa e a lista de estados;
  - a página inicial sobe o mapa e mostra exemplos reais;
  - o card de representante ganha um link direto para o perfil, além do painel.
- **Mapa com bandeiras**: a bandeira do estado aparece dentro do contorno quando o estado está sob o ponteiro, com foco ou selecionado. O resto do mapa fica neutro, como pede a regra do mapa (design D5 e a pergunta em aberto).
- **Acabamento visual** em todo o site:
  - os rótulos em caixa-alta ficam só onde orientam;
  - metadados ganham estrutura (data e casa em elementos próprios, não "A · B · C");
  - os links deixam de ter seta;
  - os cartões variam conforme a função: resumo, lista ou destaque;
  - o espaço entre seções fica mais consistente;
  - os tokens atuais continuam (fundo claro quente e cartões arredondados, pelo DDR §13.1), mas com mais contraste de hierarquia.

## Fora de escopo

- Salários, eleitos pelo TSE, Executivo, STF, comparador e "Como atualizamos" público: cada um é uma change própria (DDR 4.0 e 4.1), com a fonte oficial conferida antes. Esta change só deixa o espaço pronto.
- Novos dados (projetos de lei de autoria, votos em comissões): o Apuração mostra, mas o Cobra ainda não coleta.
- Mudança da paleta ou da tipografia base, que o DDR §13 fixou com o seuimposto.com como referência.

## Capabilities

### New Capabilities
- (nenhuma)

### Modified Capabilities
- `perfil-do-politico`: abas com endereço próprio, cabeçalho compacto, resumo em números, votos em linhas.
- `busca-de-representantes`: busca por nome; `/representantes` sem lugar com mapa.
- `mapa-do-brasil`: bandeira do estado sob ponteiro, foco ou seleção.
- `identidade-visual`: regras de acabamento (caixa-alta, metadados, links, variação de cartões).

## Impact

- **`web`**:
  - o perfil se divide em `app/politicos/[slug]/` com layout e páginas por aba, e as consultas existentes passam a ser chamadas por aba;
  - componentes `ProfileHeader`, `StatStrip`, `VoteRow` e `Tabs` (este já existe);
  - busca com sugestões (`/api/busca`), lendo o próprio banco;
  - estilos dos componentes atuais.
- **Testes**: os Playwright de perfil, representantes, mapa e navegação mudam de seletor; capturas de tela de referência em celular e computador para a revisão visual.
- Sem mudança no banco.
