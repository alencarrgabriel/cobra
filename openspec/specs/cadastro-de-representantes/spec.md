# cadastro-de-representantes Specification

## Purpose
Define o que o banco do Cobra guarda sobre quem representa cada lugar: localidades, casas legislativas, partidos, políticos com identidade única entre as fontes oficiais, filiações partidárias e mandatos, com as regras que mantêm esses dados coerentes.

## Requirements

### Requirement: Unidades da federação disponíveis
O banco SHALL conter as 27 unidades da federação, cada uma identificada pelo código IBGE de 2 dígitos, com nome e sigla.

#### Scenario: Distrito Federal
- **WHEN** a localidade de código IBGE `53` é consultada
- **THEN** ela existe, é do tipo UF, tem sigla `DF` e nome `Distrito Federal`

#### Scenario: Total de UFs
- **WHEN** as localidades do tipo UF são contadas
- **THEN** o total é 27

### Requirement: Casas legislativas do MVP
O banco SHALL conter a Câmara dos Deputados e o Senado Federal como casas de nível federal e a Câmara Legislativa do Distrito Federal (CLDF) como casa de nível distrital ligada à UF 53.

#### Scenario: CLDF é distrital e pertence ao DF
- **WHEN** a casa legislativa CLDF é consultada
- **THEN** seu nível é distrital e sua localidade é a UF de código `53`

### Requirement: Identidade única de político entre fontes
Cada político SHALL ter um único registro interno, ligado aos identificadores de cada sistema de origem (Câmara, Senado, TSE, CLDF). Um identificador de um sistema SHALL apontar para no máximo um político.

#### Scenario: Mesmo político na Câmara e no TSE
- **WHEN** um político tem identificador na Câmara e sequencial no TSE registrados
- **THEN** a busca por qualquer um dos dois identificadores retorna o mesmo político interno

#### Scenario: Identificador duplicado
- **WHEN** se tenta ligar um identificador da Câmara já usado a um segundo político
- **THEN** o banco rejeita a gravação

### Requirement: Histórico de filiações partidárias
O banco SHALL guardar cada filiação de um político a um partido com data de início e, se encerrada, data de fim. Um político SHALL ter no máximo uma filiação sem data de fim.

#### Scenario: Troca de partido
- **WHEN** um político tem uma filiação encerrada e uma nova filiação aberta
- **THEN** as duas ficam registradas e a filiação atual é a que não tem data de fim

#### Scenario: Duas filiações abertas
- **WHEN** se tenta registrar uma segunda filiação sem data de fim para o mesmo político
- **THEN** o banco rejeita a gravação

#### Scenario: Data de fim antes do início
- **WHEN** se tenta registrar uma filiação cuja data de fim é anterior à de início
- **THEN** o banco rejeita a gravação

### Requirement: Mandatos ligam político, cargo, casa e localidade
Cada mandato SHALL registrar político, cargo, casa legislativa, localidade representada, data de início, data de fim (quando houver) e situação (titular, suplente ou licenciado).

#### Scenario: Deputado federal pelo DF
- **WHEN** um mandato de deputado federal na Câmara pela UF 53 é registrado para um político
- **THEN** a consulta de mandatos da UF 53 na Câmara retorna esse político com o cargo, as datas e a situação

#### Scenario: Mandatos sobrepostos no mesmo cargo
- **WHEN** se tenta registrar para o mesmo político dois mandatos do mesmo cargo e casa com períodos sobrepostos
- **THEN** o banco rejeita a gravação

#### Scenario: Localidade inexistente
- **WHEN** se tenta registrar um mandato com um código de localidade que não existe
- **THEN** o banco rejeita a gravação

### Requirement: Partidos identificados pela sigla
Cada partido SHALL ter sigla única e nome; o número eleitoral SHALL ser guardado quando conhecido, sem exigência de unicidade, porque números são reaproveitados por partidos novos.

#### Scenario: Sigla repetida
- **WHEN** se tenta cadastrar um segundo partido com uma sigla já existente
- **THEN** o banco rejeita a gravação

### Requirement: Municípios disponíveis
O banco SHALL conter todos os municípios informados pelo IBGE, cada um identificado pelo código IBGE de 7 dígitos, com nome, UF e um nome de busca sem acentos e em minúsculas.

#### Scenario: Brasília
- **WHEN** a localidade de código `5300108` é consultada
- **THEN** ela é um município chamado Brasília, da UF `53`, com nome de busca `brasilia`

#### Scenario: Busca sem acento
- **WHEN** se procura o município de nome de busca `sao paulo`
- **THEN** o resultado é São Paulo, código `3550308`, da UF `35`

#### Scenario: Total
- **WHEN** os municípios são contados depois da coleta
- **THEN** o total é igual ao informado pela API do IBGE
