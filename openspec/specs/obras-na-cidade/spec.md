# obras-na-cidade Specification

## Purpose
Define o que o cidadão vê sobre as obras com recurso federal do lugar onde mora: um resumo com números e situação, filtros compartilháveis, mapa, lista e a ficha de cada obra, sempre com a fonte oficial e a data de atualização, a partir apenas do banco do Cobra.

## Requirements

### Requirement: Resumo das obras do lugar
A página de obras SHALL mostrar, para o lugar escolhido (no piloto, o Distrito Federal), o total de obras com recurso federal, a soma do valor previsto e a quantidade de obras em cada situação (concluída, em execução, paralisada, inacabada, cadastrada e cancelada).

#### Scenario: Resumo do DF
- **WHEN** o cidadão abre a página de obras
- **THEN** vê o total de obras do DF, o valor previsto somado e a contagem por situação, e esses números batem com os dados guardados

### Requirement: Fonte e data em toda a página
A página de obras e a ficha de cada obra SHALL mostrar a fonte oficial (Obrasgov.br), a data da última atualização informada pela fonte e a data da coleta pelo Cobra, e SHALL avisar que a situação é informada pelos gestores.

#### Scenario: Datas visíveis
- **WHEN** o cidadão abre a página de obras
- **THEN** vê "Fonte: Obrasgov.br", a data de atualização da base e o aviso de que os dados são informados pelos gestores

### Requirement: Filtros compartilháveis
O cidadão SHALL poder filtrar as obras por situação e por área; os filtros escolhidos SHALL ficar no endereço da página, de modo que abrir esse endereço mostre o mesmo resultado.

#### Scenario: Só paralisadas
- **WHEN** o cidadão escolhe a situação "Paralisada"
- **THEN** a lista e o mapa mostram só obras paralisadas e o endereço da página contém o filtro

#### Scenario: Endereço compartilhado
- **WHEN** alguém abre o endereço com os filtros de situação "Paralisada" e área "Saúde"
- **THEN** vê exatamente as obras paralisadas da área de saúde

### Requirement: Lista com critério de ordem declarado
A lista de obras SHALL ser paginada e ordenada por um critério objetivo escolhido pelo cidadão (valor previsto ou nome) e informado na tela; nenhuma obra SHALL receber destaque editorial.

#### Scenario: Ordem por nome
- **WHEN** o cidadão escolhe ordenar por nome
- **THEN** as obras aparecem em ordem alfabética e a tela informa o critério

### Requirement: Mapa com pinos por situação
A página SHALL mostrar um mapa do lugar com um pino por obra que tenha localização, colorido pela situação, levando à ficha da obra; obras sem localização SHALL ser contadas e informadas, nunca posicionadas em lugar inventado.

#### Scenario: Obra sem localização
- **WHEN** há obras filtradas sem coordenadas
- **THEN** o mapa informa quantas obras não aparecem nele por falta de localização, e elas continuam na lista

### Requirement: Ficha da obra com link permanente
Cada obra SHALL ter uma página própria em endereço permanente formado pelo código do Obrasgov, com nome, endereço, área, situação, valor previsto, percentual de execução, prazos previstos e reais, quem repassa, recebe e executa, histórico de paralisação e cancelamento com a justificativa oficial, notas de qualidade e link para conferir na fonte.

#### Scenario: Obra paralisada
- **WHEN** o cidadão abre a ficha de uma obra paralisada desde 07/05/2025
- **THEN** vê "Paralisada" com há quantos meses está parada, a data e a justificativa oficial

#### Scenario: Obra com nota de qualidade
- **WHEN** a obra tem término previsto anterior ao início, como informado pela fonte
- **THEN** a ficha mostra as datas como vieram e a nota explicando a incoerência

#### Scenario: Código inexistente
- **WHEN** alguém abre a ficha de um código que não existe
- **THEN** recebe a página "não encontrada" com status 404

### Requirement: Só o banco próprio
As páginas de obras SHALL ler apenas o banco do Cobra, nunca a API do Obrasgov ou outra fonte do governo; sem banco configurado, SHALL explicar que os dados estão indisponíveis no momento, sem quebrar o resto do site.

#### Scenario: Banco indisponível
- **WHEN** o site está sem conexão configurada com o banco
- **THEN** a página de obras mostra que os dados estão indisponíveis no momento e a página inicial e a rota de saúde continuam funcionando
