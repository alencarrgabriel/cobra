# reporte-de-erro Specification

## Purpose
Define o canal de reporte de erro e de contestação do Cobra: formulário com protocolo e prazo de resposta, fila pública de correções, triagem no painel editorial com nota pública e histórico, resposta opcional por e-mail e exclusão do e-mail de quem reportou.

## Requirements

### Requirement: Reportar erro ou contestar
Qualquer pessoa SHALL poder reportar erro em qualquer página de dado, ou contestar como a pessoa retratada, sem cadastro, informando a descrição e, se quiser, um e-mail para resposta; o envio SHALL devolver um número de protocolo e a data-limite de resposta, de 5 dias úteis.

#### Scenario: Reporte enviado
- **WHEN** alguém envia um reporte válido sobre uma página
- **THEN** recebe o protocolo e o prazo, e o reporte entra na fila pública como recebido

#### Scenario: Descrição curta
- **WHEN** a descrição tem menos de 20 caracteres
- **THEN** o formulário pede mais detalhes e nada é gravado

### Requirement: Fila pública de correções
O site SHALL publicar cada reporte com protocolo, página, tipo, data de envio, prazo, situação e nota pública da equipe; SHALL mostrar quando o prazo venceu sem resposta; e SHALL não publicar a descrição nem o contato de quem reportou.

#### Scenario: Fila sem dados pessoais
- **WHEN** alguém abre a fila pública
- **THEN** vê protocolo, página, situação e prazo de cada reporte, sem a descrição nem o e-mail

#### Scenario: Correção registrada
- **WHEN** a equipe fecha um reporte como corrigido com uma nota
- **THEN** a fila mostra "corrigido", a nota e a data do fechamento

### Requirement: Triagem com histórico
No painel editorial, editores SHALL poder mudar a situação de um reporte e escrever a nota pública (obrigatória ao fechar) e, havendo e-mail, responder por ele; cada mudança SHALL ficar num histórico que não pode ser alterado nem apagado.

#### Scenario: Fechar com resposta
- **WHEN** um editor fecha um reporte com nota e pede resposta por e-mail
- **THEN** a pessoa recebe a resposta com o protocolo e a nota, e o histórico registra o editor, a situação e a resposta

### Requirement: Exclusão do contato
O e-mail de quem reportou SHALL ficar cifrado, ser usado só para responder aquele reporte e ser apagado 90 dias depois do fechamento.

#### Scenario: Prazo de guarda vencido
- **WHEN** a manutenção diária roda e um reporte foi fechado há mais de 90 dias
- **THEN** o e-mail desse reporte é apagado
