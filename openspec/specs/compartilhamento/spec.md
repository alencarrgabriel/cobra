# compartilhamento Specification

## Purpose
Define os cards de imagem, a prévia de link e o painel de compartilhar do Cobra, sempre com fonte e data, o mesmo modelo para todos e nenhum dado pessoal de quem compartilha.

## Requirements

### Requirement: Card de imagem em três formatos
O site SHALL gerar, a partir do próprio banco, um card de imagem para o perfil de político, para "seus representantes" de um lugar, para a ficha de obra e para a votação, nos formatos stories (1080×1920), feed (1080×1350) e prévia de link (1200×630). Código ou formato inexistente SHALL responder 404; banco indisponível SHALL responder 503.

#### Scenario: Formatos
- **WHEN** alguém pede o card de um perfil existente nos formatos stories, feed e link
- **THEN** recebe imagens PNG de 1080×1920, 1080×1350 e 1200×630

#### Scenario: Código inexistente
- **WHEN** alguém pede o card de uma obra que não existe
- **THEN** recebe status 404

#### Scenario: Card da votação
- **WHEN** alguém pede o card de uma votação existente
- **THEN** recebe a imagem com a casa, a data, a proposição, o resultado e a contagem oficial

### Requirement: Card com fato, fonte, data e endereço
Todo card SHALL trazer o fato mostrado, a fonte oficial, a data de atualização e o endereço do Cobra, sem nota, ranking ou adjetivo de valor. Dado que a fonte não informa SHALL aparecer como "—".

#### Scenario: Card de obra paralisada
- **WHEN** o card é de uma obra paralisada desde 07/05/2025
- **THEN** mostra o nome, a situação "Paralisada" com o tempo de paralisação, o valor previsto, a execução física, "Fonte: Obrasgov.br" e a data de atualização

#### Scenario: Execução não informada
- **WHEN** a obra não tem percentual de execução na fonte
- **THEN** o card mostra "—" no lugar do percentual

### Requirement: Mesmo modelo para qualquer partido
Os cards SHALL usar o mesmo modelo, as mesmas cores de fundo e texto e o mesmo tamanho de elementos para qualquer partido ou político; a cor do partido SHALL aparecer só no selo da sigla, pela regra de identidade de partidos.

#### Scenario: Dois partidos
- **WHEN** são gerados os cards de dois políticos de partidos diferentes
- **THEN** a disposição, o fundo e os tamanhos são iguais e só a cor do selo muda

### Requirement: Prévia de link
O perfil, "seus representantes", a ficha da obra e a página da votação SHALL declarar prévia de link (Open Graph e cartão do X) com título, descrição factual e o card 1,91:1 em endereço absoluto.

#### Scenario: Link colado no WhatsApp
- **WHEN** alguém cola o link de um perfil numa conversa
- **THEN** a página informa `og:title`, `og:description` e `og:image` apontando para o card de prévia do mesmo perfil

### Requirement: Painel "Compartilhar"
As páginas compartilháveis SHALL ter um botão "Compartilhar" que abre um painel com a prévia do card, a escolha do formato e as opções: enviar no WhatsApp (em destaque), menu nativo do celular quando houver, baixar imagem, copiar imagem quando o navegador permitir, postar no X e copiar link.

#### Scenario: Enviar no WhatsApp
- **WHEN** a pessoa abre o painel no perfil
- **THEN** o primeiro botão é "Enviar no WhatsApp" e leva a `wa.me` com um texto factual e o link do perfil

#### Scenario: Copiar link
- **WHEN** a pessoa toca em "Copiar link"
- **THEN** o link da página vai para a área de transferência e aparece o aviso "Link copiado"

### Requirement: Nada pessoal no card ou no link
Cards e links compartilhados SHALL conter só o endereço canônico da página, sem CEP, e-mail, políticos seguidos ou outro dado de quem compartilha.

#### Scenario: Representantes vindos de um CEP
- **WHEN** a pessoa chegou a "seus representantes" pelo CEP e compartilha
- **THEN** o link usa o código IBGE do lugar e nem o link nem o card contêm o CEP
