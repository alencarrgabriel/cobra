# Spec Delta

## MODIFIED Requirements

### Requirement: Representantes por nível
A página de um lugar SHALL mostrar, com fonte e data de atualização de cada casa: os 3 senadores e os deputados federais da UF em exercício, com a explicação de que são eleitos pelo estado inteiro; no DF, os deputados distritais em exercício, com a explicação de que fazem o papel de deputado estadual e de vereador; e, fora do DF, um aviso de que deputados estaduais e vereadores ainda não estão no Cobra. A página SHALL ter também o bloco "Placar das votações recentes", que, enquanto as votações não forem coletadas, mostra "—" e o motivo, nunca zero.

#### Scenario: Brasília
- **WHEN** o cidadão abre a página de Brasília
- **THEN** vê os 3 senadores, os 8 deputados federais e os 24 deputados distritais do DF

#### Scenario: Outra UF
- **WHEN** o cidadão abre a página de São Paulo
- **THEN** vê os senadores e os deputados federais de SP e o aviso de que deputados estaduais e vereadores ainda não estão no Cobra

#### Scenario: Placar ainda sem votações
- **WHEN** o cidadão abre a página de um estado antes da coleta das votações
- **THEN** o bloco do placar mostra "—" e "Ainda não está no Cobra", sem números
