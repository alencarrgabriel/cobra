# identidade-visual Specification

## Purpose
Define a aparência e o comportamento visual comuns a todas as páginas do Cobra: tema claro e escuro, tipografia, contraste acessível, navegação no computador e no celular, e as regras visuais dos elementos que mostram políticos, partidos e votos, para que o produto seja consistente e trate todos os partidos da mesma forma.

## Requirements

### Requirement: Tema claro e escuro
O site SHALL seguir o tema claro ou escuro do sistema do usuário e SHALL oferecer um botão que alterna o tema e lembra a escolha no próprio aparelho, sem cadastro.

#### Scenario: Sistema em modo escuro
- **WHEN** o usuário abre o site com o sistema em modo escuro e sem escolha salva
- **THEN** a página aparece no tema escuro

#### Scenario: Escolha lembrada
- **WHEN** o usuário alterna para o tema claro e recarrega a página
- **THEN** a página volta no tema claro, mesmo com o sistema em modo escuro

#### Scenario: Sem piscar ao carregar
- **WHEN** a página é carregada com o tema escuro salvo
- **THEN** o primeiro quadro exibido já está no tema escuro

### Requirement: Contraste e acessibilidade automática
Todas as páginas SHALL passar na verificação automática de acessibilidade WCAG 2.1 AA, incluindo contraste de texto, nos dois temas.

#### Scenario: Página inicial nos dois temas
- **WHEN** a verificação automática de acessibilidade roda na página inicial em tema claro e em tema escuro
- **THEN** nenhuma violação de nível A ou AA é encontrada

#### Scenario: Catálogo de componentes
- **WHEN** a verificação automática roda na página `/design` nos dois temas
- **THEN** nenhuma violação de nível A ou AA é encontrada

### Requirement: Navegação no computador e no celular
Em telas largas o site SHALL mostrar as seções numa barra superior; em telas de celular SHALL mostrar uma barra inferior fixa com Início, Representantes, Votações e Obras. Seções ainda não disponíveis SHALL aparecer marcadas como "em breve" e não SHALL levar a página vazia.

#### Scenario: Celular
- **WHEN** o site é aberto numa tela de 360 px de largura
- **THEN** a barra inferior com as quatro seções está visível e não cobre o conteúdo final da página

#### Scenario: Seção ainda não entregue
- **WHEN** o usuário vê uma seção que ainda não existe
- **THEN** ela aparece com o selo "em breve" e não é um link ativo

### Requirement: Identidade de partido igual para todos
O selo de partido SHALL ter a mesma forma, tamanho, posição e tipografia para qualquer partido, mudando apenas a cor e a sigla, e SHALL manter contraste AA entre a sigla e a cor de fundo.

#### Scenario: Partidos diferentes no mesmo lugar
- **WHEN** dois cards de representante de partidos diferentes são exibidos lado a lado
- **THEN** os selos de partido têm as mesmas dimensões e a mesma posição, diferindo só na cor e na sigla

#### Scenario: Cor de fundo clara
- **WHEN** um partido tem cor de identificação clara
- **THEN** a sigla é exibida em cor escura para manter contraste AA

### Requirement: Cores de voto separadas das cores de partido
As opções de voto (Sim, Não e outras) SHALL usar cores próprias do design system, que não SHALL ser usadas para identificar partidos, e SHALL ser acompanhadas sempre do texto da opção, nunca só da cor.

#### Scenario: Selo de voto
- **WHEN** um voto "Não" é exibido
- **THEN** aparece o texto "Não" junto da cor de "Não" do design system

#### Scenario: Barra de placar
- **WHEN** a barra de placar de uma votação é exibida
- **THEN** cada parte da barra tem o número e o rótulo da opção visíveis ou disponíveis para leitores de tela

### Requirement: Números sempre com referência
Componentes que destacam um número sobre um político (presença, gastos, patrimônio) SHALL exibir junto a referência de comparação (mediana da casa, limite ou valor anterior) e a fonte, sem rótulos de juízo como "bom" ou "ruim".

#### Scenario: Presença com mediana
- **WHEN** o componente de destaque mostra a presença de um parlamentar
- **THEN** exibe também a mediana da casa, marcada na mesma barra

### Requirement: Painel lateral e gaveta
Detalhes abertos a partir de uma lista SHALL aparecer num painel lateral em telas largas e numa gaveta que sobe da parte de baixo no celular; em ambos, o foco do teclado SHALL ir para o painel ao abrir, a tecla Esc SHALL fechá-lo e o foco SHALL voltar ao item que o abriu.

#### Scenario: Abrir e fechar pelo teclado
- **WHEN** o usuário abre um painel com Enter sobre um card e depois pressiona Esc
- **THEN** o painel fecha e o foco volta para o card de origem

#### Scenario: Gaveta no celular
- **WHEN** o painel é aberto numa tela de 360 px de largura
- **THEN** ele aparece como gaveta presa à parte de baixo da tela, acima da barra inferior

### Requirement: Catálogo de componentes fora dos buscadores
O site SHALL ter a página `/design` com todos os componentes do design system em exemplos com dados fictícios identificados como tais, e essa página SHALL pedir aos buscadores que não a indexem.

#### Scenario: Página de catálogo
- **WHEN** `/design` é aberta
- **THEN** mostra cada componente do design system com o aviso de dados fictícios
- **AND** a resposta contém a instrução `noindex` para buscadores

### Requirement: Fotos oficiais servidas pelo próprio site
As fotos oficiais de políticos SHALL ser entregues ao visitante pelo próprio site, a partir apenas dos endereços oficiais da Câmara, do Senado e da CLDF, de modo que o navegador do visitante não faça requisições aos servidores das casas.

#### Scenario: Foto de deputado
- **WHEN** a grade de representantes mostra a foto de um deputado federal
- **THEN** a imagem é carregada de um endereço do próprio site do Cobra

#### Scenario: Endereço não oficial
- **WHEN** se pede ao site uma imagem de um endereço que não é um dos oficiais
- **THEN** o site recusa a imagem
