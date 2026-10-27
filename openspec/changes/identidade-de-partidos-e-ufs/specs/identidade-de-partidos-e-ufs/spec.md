# Spec Delta

## Purpose

Define de onde vêm e como são guardadas as cores de partido e as bandeiras das UFs, e como o site as usa para identificar cada político sempre da mesma forma.

## ADDED Requirements

### Requirement: Cor curada por partido
O banco SHALL ter uma cor de identificação para cada partido em atividade, por sigla, com a base da escolha registrada (cor declarada no site oficial do partido, cor dominante no site oficial ou identidade conhecida a confirmar) e a data da consulta.

#### Scenario: Cor com procedência
- **WHEN** a cor do PSB é consultada
- **THEN** ela tem formato hexadecimal de 6 dígitos e informa que vem do `theme-color` do site oficial do partido, com a data da consulta

### Requirement: Selo legível para toda cor curada
Toda cor curada SHALL resultar num selo com contraste AA entre a sigla e o fundo, usando a regra automática de cor de texto do design system.

#### Scenario: Cor clara
- **WHEN** o selo do PSOL, de cor amarela, é exibido
- **THEN** a sigla aparece em cor escura com contraste de pelo menos 4,5:1

### Requirement: Partido sem cor curada
Um partido sem cor curada SHALL aparecer com a cor neutra do design system, no mesmo formato de selo dos demais, nunca com a cor de outro partido.

#### Scenario: Partido novo
- **WHEN** um partido que não está na tabela de cores aparece num card
- **THEN** o selo usa a cor neutra e mostra a sigla do partido

### Requirement: Bandeira de cada UF
O site SHALL servir a bandeira de cada uma das 27 UFs como arquivo próprio, com texto alternativo "Bandeira de <nome da UF>", e SHALL registrar para cada arquivo a origem, a licença e o hash. Os arquivos SHALL não conter scripts.

#### Scenario: Bandeira do DF
- **WHEN** um card de representante do DF é exibido
- **THEN** a bandeira vem do próprio site do Cobra e tem o texto alternativo "Bandeira do Distrito Federal"

#### Scenario: Todas as UFs
- **WHEN** as bandeiras são conferidas
- **THEN** existem 27 arquivos, um por UF, cada um com origem e licença registradas

### Requirement: Logotipo só após parecer jurídico
O site SHALL não exibir logotipos de partidos enquanto o uso não for confirmado pelo parecer jurídico (DDR §10). Enquanto isso, a identificação SHALL ser feita por cor e sigla.

#### Scenario: Selo sem logotipo
- **WHEN** um selo de partido é exibido
- **THEN** ele mostra a sigla sobre a cor do partido e nenhuma imagem de logotipo
