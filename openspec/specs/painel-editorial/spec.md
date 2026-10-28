# painel-editorial Specification

## Purpose
Define o painel editorial do Cobra: quem entra e como (com segundo fator), como resumos de votações são escritos, aprovados e publicados com trilha de auditoria, e como a curadoria inclui uma votação no feed com justificativa pública.

## Requirements

### Requirement: Login com segundo fator
O painel SHALL exigir e-mail e senha de um editor ativo e o código de um app autenticador (TOTP); na primeira entrada, SHALL pedir o cadastro do app pelo QR code. Sem as duas etapas, nenhuma página ou ação do painel SHALL responder com dados.

#### Scenario: Sem sessão
- **WHEN** alguém abre `/painel` sem estar logado
- **THEN** é levado à página de entrada

#### Scenario: Só a senha
- **WHEN** um editor entra com senha correta mas ainda não informou o código do app
- **THEN** só vê a etapa do código e não acessa a fila

#### Scenario: Usuário fora da lista de editores
- **WHEN** uma conta válida que não está na lista de editores ativos completa as duas etapas
- **THEN** o painel recusa o acesso

### Requirement: Sem cadastro aberto
O site SHALL não permitir que alguém crie conta sozinho; editores SHALL ser criados por administração.

#### Scenario: Tentativa de cadastro
- **WHEN** alguém tenta criar conta pelo serviço de autenticação
- **THEN** o cadastro é recusado

### Requirement: Fila de votações relevantes
O painel SHALL listar as votações relevantes das duas casas sem resumo publicado, da mais recente para a mais antiga, com data, casa, proposição e critérios.

#### Scenario: Votação já resumida
- **WHEN** uma votação relevante tem resumo publicado
- **THEN** ela não aparece na fila

### Requirement: Publicação só com aprovação registrada
Um resumo SHALL ser guardado como rascunho com versão e SHALL ser publicado só quando um editor o aprova; a aprovação SHALL registrar quem aprovou e quando. O site SHALL ler apenas resumos aprovados.

#### Scenario: Rascunho não aparece
- **WHEN** um editor salva um rascunho
- **THEN** o perfil e o feed não mostram esse texto

#### Scenario: Aprovação
- **WHEN** o editor aprova a versão 2
- **THEN** a versão 2 passa a ser a publicada, com o editor e a data, e o perfil mostra o texto e "Resumo revisado por pessoas em" a data

### Requirement: Trilha de auditoria
Cada rascunho, aprovação, inclusão e retirada de curadoria SHALL ficar registrada com editor, data, votação, versão e detalhe, e o registro SHALL não poder ser alterado nem apagado pelo painel.

#### Scenario: Registro imutável
- **WHEN** o painel tenta apagar uma linha da trilha
- **THEN** o banco recusa

### Requirement: Curadoria com justificativa
O editor SHALL poder incluir uma votação no feed pela curadoria, com justificativa pública de ao menos 20 caracteres, e retirar a inclusão; as duas ações SHALL ir para a trilha.

#### Scenario: Inclusão
- **WHEN** o editor inclui uma votação com a justificativa "Primeira votação da reforma do setor elétrico."
- **THEN** a votação passa a ter o critério de curadoria e a trilha registra a inclusão

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
