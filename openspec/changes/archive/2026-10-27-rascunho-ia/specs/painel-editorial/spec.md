# Spec Delta

## ADDED Requirements

### Requirement: Rascunho por IA com aprovação humana
O painel SHALL permitir que um editor gere um rascunho de resumo pela IA a partir só dos dados oficiais da votação, seguindo as regras editoriais; o rascunho SHALL ficar como versão não publicada, com o modelo registrado e entrada na trilha, e SHALL ser publicado só por aprovação de um editor. Sem chave de API configurada, a opção SHALL não aparecer.

#### Scenario: Rascunho gerado
- **WHEN** o editor pede um rascunho por IA
- **THEN** surge uma nova versão em rascunho com o modelo registrado, e o site não mostra o texto até a aprovação

#### Scenario: Recusa ou erro
- **WHEN** o modelo recusa ou a API falha
- **THEN** o painel avisa e nenhuma versão é gravada

#### Scenario: Sem chave
- **WHEN** o servidor não tem chave de API
- **THEN** o botão de rascunho por IA não aparece

### Requirement: Indicação pública do uso de IA
O resumo publicado SHALL indicar que partiu de um rascunho feito com IA quando qualquer versão da mesma votação foi gerada por IA, mesmo que o texto publicado tenha sido corrigido por um editor.

#### Scenario: Rascunho corrigido
- **WHEN** o editor corrige o rascunho da IA, salva e aprova
- **THEN** o perfil mostra "Resumo revisado por pessoas em" a data, "a partir de um rascunho feito com IA"
