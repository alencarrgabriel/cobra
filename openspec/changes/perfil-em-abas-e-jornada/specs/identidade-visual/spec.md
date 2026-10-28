# Spec Delta

## ADDED Requirements

### Requirement: Acabamento sem vícios genéricos
A interface SHALL usar rótulo em caixa-alta só onde orienta (não acima de todo título), estruturar metadados em elementos próprios em vez de cadeias separadas por "·", não acrescentar setas ao texto de links e botões, usar trilha de navegação para voltar, e variar os cartões conforme a função (destaque, lista, painel).

#### Scenario: Trilha em vez de seta
- **WHEN** alguém abre a página de uma votação
- **THEN** vê a trilha "Votações › <proposição>" e nenhum link com seta no texto

### Requirement: Número da cobertura na página inicial
A página inicial SHALL mostrar, em destaque, o total de mandatos em exercício que o Cobra cobre, lido do banco, com a divisão por cargo e a data da última atualização.

#### Scenario: Número lido do banco
- **WHEN** alguém abre a página inicial
- **THEN** vê o total de mandatos em exercício e a data da última atualização, iguais aos do banco

### Requirement: Ouvir esta página
As páginas de conteúdo SHALL oferecer a leitura em voz alta do conteúdo principal pelo recurso de síntese de voz do navegador, com pausa e velocidade, sem enviar texto a servidor.

#### Scenario: Leitura em voz alta
- **WHEN** alguém aciona "Ouvir esta página" num navegador com síntese de voz
- **THEN** o conteúdo principal é lido e o botão passa a pausar a leitura
