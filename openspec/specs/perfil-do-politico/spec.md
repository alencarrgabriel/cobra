# perfil-do-politico Specification

## Purpose
Define o que a página de cada político mostra, de onde vem cada bloco e como o site trata o que ainda não foi coletado, sempre com fonte oficial e sem nota, ranking ou adjetivo de valor.

## Requirements

### Requirement: Perfil com endereço permanente
Cada político do cadastro SHALL ter uma página em endereço permanente formado pelo identificador do Cobra e o nome, com foto oficial, nome, bandeira da UF, selo do partido, cargo e situação. Um identificador inexistente SHALL responder com a página "não encontrada" e status 404; um nome diferente com o identificador certo SHALL levar ao endereço correto.

#### Scenario: Endereço com nome desatualizado
- **WHEN** alguém abre o perfil com o identificador certo e outro nome no endereço
- **THEN** é levado ao endereço com o nome atual

#### Scenario: Identificador inexistente
- **WHEN** alguém abre o perfil de um identificador que não existe
- **THEN** recebe a página "não encontrada" com status 404

### Requirement: Frase "Quem é" de modelo fixo
O topo do perfil SHALL ter uma frase "Quem é" montada só com dados oficiais por um modelo fixo, sem IA, com a casa, a UF, o partido e o início do mandato atual, em forma que não dependa do gênero (o Cobra não guarda esse dado). Dado ausente SHALL ser omitido da frase, nunca inventado.

#### Scenario: Senadora
- **WHEN** o perfil é de uma senadora titular pelo DF, filiada ao Republicanos, no mandato desde 01/02/2023
- **THEN** a frase é "Damares Alves tem mandato no Senado Federal pelo Distrito Federal, pelo Republicanos, desde 01/02/2023."

#### Scenario: Sem partido
- **WHEN** o político não tem filiação atual informada
- **THEN** a frase não cita partido

### Requirement: Mandatos e partidos
O perfil SHALL listar os mandatos guardados do político, com casa, cargo, UF, início, fim e situação, e o histórico de filiações com as datas informadas pela fonte, do mais recente para o mais antigo.

#### Scenario: Troca de partido
- **WHEN** o político tem duas filiações, uma encerrada
- **THEN** as duas aparecem, com as datas, e a atual primeiro

### Requirement: Emendas e obras do político
O perfil SHALL listar as emendas de autoria do político guardadas pelo Cobra (no piloto, as com destino ao DF ou citadas por obras do DF), com ano, área, valores e a soma, dizendo na tela qual é esse recorte; e SHALL listar as obras ligadas a essas emendas, com a situação de cada obra e o grau de confiança do vínculo.

#### Scenario: Emendas e obra ligada
- **WHEN** o político é autor de uma emenda ligada a uma obra do DF com grau "direto"
- **THEN** o perfil mostra a emenda com os valores e a obra com a situação e o grau "direto", com link para a ficha da obra

#### Scenario: Sem emendas no recorte
- **WHEN** o político não tem emendas no recorte do Cobra
- **THEN** o perfil diz que não há emendas com destino ao DF guardadas, sem mostrar zero como se fosse total

### Requirement: Dado ainda não coletado
Blocos que dependem de dados ainda não coletados (votos, projetos, presença, gastos da cota, patrimônio e trajetória eleitoral) SHALL aparecer com "—" e a explicação do motivo, nunca com zero.

#### Scenario: Gastos ainda não coletados
- **WHEN** o perfil é aberto antes da coleta de gastos
- **THEN** o bloco de gastos mostra "—" e diz que esse dado ainda não está no Cobra

### Requirement: Perguntas frequentes e relacionados
O perfil SHALL ter perguntas frequentes factuais respondidas só com os dados mostrados, e uma lista de políticos relacionados (mesma UF e mesmo partido), em ordem alfabética e sem destaque. A página SHALL publicar dados estruturados (schema.org `Person` e `FAQPage`) para buscadores.

#### Scenario: Relacionados
- **WHEN** o perfil é de um deputado do PL pelo DF
- **THEN** a lista de relacionados traz, em ordem alfabética, outros políticos do DF e outros políticos do PL, sem ele mesmo
