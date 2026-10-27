# receitas-de-campanha Specification

## Purpose
Define como o Cobra coleta do TSE as receitas de campanha das candidaturas do cadastro, somadas por origem e fonte, sem guardar CPF, CNPJ nem nome de pessoa física, e como o perfil as mostra.

## Requirements

### Requirement: Pessoas físicas só somadas
A coleta SHALL guardar as doações de pessoas físicas só como quantidade de doadores e valor total por candidatura, e SHALL não guardar nome, CPF, endereço nem outro dado de nenhum doador pessoa física.

#### Scenario: Doadora pessoa física
- **WHEN** o arquivo do TSE traz uma doação de "MARIA DE TAL", CPF 123.456.789-01, a uma candidatura do cadastro
- **THEN** o Cobra soma o valor e conta uma doadora, e nenhuma tabela recebe o nome ou o CPF

### Requirement: Receitas por origem e fonte
A coleta SHALL somar as receitas de cada candidatura do cadastro por origem (recursos próprios, pessoas físicas, partidos, financiamento coletivo, outros candidatos, outras) e por fonte (Fundo Especial, Fundo Partidário, outros recursos); para a origem partidos, SHALL guardar o nome do diretório doador.

#### Scenario: Fundo eleitoral do partido
- **WHEN** um diretório partidário repassa R$ 100.000 do Fundo Especial a uma candidatura
- **THEN** o Cobra guarda R$ 100.000 na origem partidos, fonte Fundo Especial, com o nome do diretório

#### Scenario: Candidato fora do cadastro
- **WHEN** o arquivo traz receitas de um candidato que não está no cadastro
- **THEN** nada dessas receitas é guardado

### Requirement: Receitas no perfil
O perfil SHALL mostrar, por eleição desde 2018, o total recebido, quanto veio de cada origem e de cada fundo público, a quantidade de pessoas físicas doadoras e os partidos doadores em ordem alfabética, com fonte, data de coleta e o aviso de que os valores incluem doações estimáveis e de que pessoas físicas aparecem só somadas.

#### Scenario: Campanha com fundo e doadores
- **WHEN** uma campanha recebeu R$ 1 milhão do partido pelo Fundo Especial e R$ 50 mil de 20 pessoas físicas
- **THEN** o perfil mostra o total de R$ 1,05 mi, a origem partidos com o Fundo Especial e "20 pessoas físicas doaram R$ 50 mil", sem nenhum nome de pessoa física
