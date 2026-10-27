# Spec Delta

## ADDED Requirements

### Requirement: Fotos oficiais servidas pelo próprio site
As fotos oficiais de políticos SHALL ser entregues ao visitante pelo próprio site, a partir apenas dos endereços oficiais da Câmara, do Senado e da CLDF, de modo que o navegador do visitante não faça requisições aos servidores das casas.

#### Scenario: Foto de deputado
- **WHEN** a grade de representantes mostra a foto de um deputado federal
- **THEN** a imagem é carregada de um endereço do próprio site do Cobra

#### Scenario: Endereço não oficial
- **WHEN** se pede ao site uma imagem de um endereço que não é um dos oficiais
- **THEN** o site recusa a imagem
