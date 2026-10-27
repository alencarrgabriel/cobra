# busca-de-representantes Specification

## Purpose
Define como o cidadão informa onde mora (CEP, cidade ou UF) e vê os representantes desse lugar, o que a página mostra em cada nível e o que o site guarda, ou não, dessa busca.

## Requirements

### Requirement: Busca por CEP, cidade ou UF sem cadastro
O cidadão SHALL poder informar um CEP, o nome de uma cidade ou uma UF, sem cadastro, e ir para a página dos representantes desse lugar. Um CEP do DF SHALL levar ao município de Brasília; um CEP de outra UF SHALL levar à UF; um nome de cidade SHALL levar ao município, e havendo mais de um com o mesmo nome a pessoa SHALL escolher entre eles.

#### Scenario: CEP do DF
- **WHEN** o cidadão informa o CEP 72210-000
- **THEN** ele vai para a página dos representantes de Brasília (código 5300108)

#### Scenario: Cidade com homônimos
- **WHEN** o cidadão informa "Bom Jesus"
- **THEN** ele vê a lista dos municípios com esse nome, com a UF de cada um, e escolhe

#### Scenario: Lugar não encontrado
- **WHEN** o cidadão informa um texto que não é CEP, cidade nem UF
- **THEN** ele vê uma mensagem explicando o que pode digitar e continua na busca

### Requirement: CEP não guardado
O CEP SHALL ser enviado no corpo do formulário, convertido no código IBGE e descartado. Ele SHALL não aparecer no endereço de nenhuma página, no banco, nos registros do site nem nos links compartilháveis.

#### Scenario: Endereço da página
- **WHEN** o cidadão busca pelo CEP 72210-000
- **THEN** o endereço da página de resultado contém só o código IBGE, sem o CEP

### Requirement: Representantes por nível
A página de um lugar SHALL mostrar, com fonte e data de atualização de cada casa: os 3 senadores e os deputados federais da UF em exercício, com a explicação de que são eleitos pelo estado inteiro; no DF, os deputados distritais em exercício, com a explicação de que fazem o papel de deputado estadual e de vereador; e, fora do DF, um aviso de que deputados estaduais e vereadores ainda não estão no Cobra.

#### Scenario: Brasília
- **WHEN** o cidadão abre a página de Brasília
- **THEN** vê os 3 senadores, os 8 deputados federais e os 24 deputados distritais do DF

#### Scenario: Outra UF
- **WHEN** o cidadão abre a página de São Paulo
- **THEN** vê os senadores e os deputados federais de SP e o aviso de que deputados estaduais e vereadores ainda não estão no Cobra

### Requirement: Card de representante
Cada representante SHALL aparecer num card com foto oficial, nome, bandeira da UF e o selo do partido (sigla e cor), igual para todos os partidos. Tocar no card SHALL abrir um painel com o resumo: cargo, situação, desde quando está em exercício, partido, link para a fonte oficial e link para o perfil completo no Cobra.

#### Scenario: Abrir o resumo
- **WHEN** o cidadão toca no card de uma senadora
- **THEN** abre o painel com o cargo, o partido, a situação, a data de início do mandato e o link para a página dela no Senado

#### Scenario: Ir para o perfil
- **WHEN** o cidadão escolhe "Ver perfil completo" no painel
- **THEN** ele vai para o perfil do político no Cobra

### Requirement: Filtro por partido
A página SHALL permitir filtrar os representantes por partido, com o filtro guardado no endereço.

#### Scenario: Só um partido
- **WHEN** o cidadão escolhe o partido PL na página de Brasília
- **THEN** só os representantes do PL aparecem, e o endereço tem o filtro

### Requirement: Lugar lembrado no aparelho
O site SHALL lembrar, só no aparelho do cidadão e sem conta, o último lugar visto (código IBGE e nome), e SHALL oferecer voltar a ele na página inicial. O cidadão SHALL poder apagar essa lembrança.

#### Scenario: Voltar ao lugar
- **WHEN** o cidadão já viu a página de Brasília neste aparelho e abre a página inicial
- **THEN** vê o atalho "Ver seus representantes em Brasília (DF)" e a opção de esquecer o lugar
