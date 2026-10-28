# alertas Specification

## Purpose
Define o cadastro de alertas por e-mail e o "Seguir" do Cobra: opt-in duplo, consentimento separado para os seguidos, direitos do titular pelo próprio site, descadastro em um clique e proteção dos dados (criptografia, resposta neutra, limites e registro de acessos).

## Requirements

### Requirement: Opt-in duplo
O cadastro SHALL ficar pendente até a pessoa confirmar por um link enviado ao e-mail informado; o link de confirmação SHALL valer uma vez e por 48 h; o de meus dados, por 1 h.

#### Scenario: Cadastro confirmado
- **WHEN** alguém informa o e-mail, opcionalmente o estado, e marca o consentimento do resumo semanal, abre o link recebido e confirma
- **THEN** a inscrição fica ativa, com a versão e a data do consentimento

#### Scenario: Link usado ou vencido
- **WHEN** alguém abre um link já usado ou vencido
- **THEN** a página diz que o link não vale mais e oferece pedir outro

### Requirement: Consentimento específico para seguir
Guardar políticos seguidos SHALL exigir consentimento separado e destacado, que explica que os seguidos podem indicar opinião política; sem ele, nenhum seguido SHALL ser guardado.

#### Scenario: Seguir com consentimento
- **WHEN** alguém chega pelo botão "Seguir", marca os dois consentimentos e confirma pelo link
- **THEN** o político passa a constar como seguido e o consentimento de seguidos fica registrado com versão e data

#### Scenario: Sem o consentimento de seguidos
- **WHEN** alguém chega pelo botão "Seguir" e marca só o consentimento do resumo
- **THEN** o formulário pede o consentimento de seguidos e não envia

### Requirement: Resposta neutra
O site SHALL dar a mesma resposta exista ou não o endereço, esteja ou não acima dos limites de envio, para não revelar quem está cadastrado.

#### Scenario: Endereço já cadastrado
- **WHEN** alguém pede cadastro ou meus dados com um endereço já ativo
- **THEN** a resposta é a mesma de um endereço novo

### Requirement: Meus dados
Com um link pedido pelo e-mail, a pessoa SHALL poder ver seus dados (e-mail, estado, seguidos, situação e consentimentos), exportá-los em JSON, mudar o estado, deixar de seguir, cancelar o resumo e apagar tudo.

#### Scenario: Exportar
- **WHEN** a pessoa pede a exportação na página de meus dados
- **THEN** recebe um arquivo JSON com tudo o que o Cobra guarda sobre ela

#### Scenario: Apagar
- **WHEN** a pessoa confirma que quer apagar seus dados
- **THEN** a inscrição e os links somem do banco e só fica o registro da exclusão, sem o e-mail

### Requirement: Descadastro em um clique
Toda inscrição SHALL ter um link de saída permanente que cancela o resumo sem login, por um botão (GET) ou diretamente por POST.

#### Scenario: Sair
- **WHEN** alguém abre o link de saída e confirma, ou o provedor de e-mail envia o POST de descadastro
- **THEN** a inscrição fica cancelada

### Requirement: Proteção dos dados
E-mail, estado e seguidos SHALL ficar cifrados no banco; o e-mail SHALL ser localizado só por um código derivado (HMAC); o papel do site SHALL não ter acesso a esses dados; cada ação sobre a inscrição SHALL ficar num registro sem o e-mail, que não pode ser alterado nem apagado pelo site; os envios SHALL ter limite por endereço e por dia.

#### Scenario: Banco sem a chave
- **WHEN** alguém lê a tabela de inscrições sem a chave
- **THEN** não vê o e-mail, o estado nem os seguidos

#### Scenario: Limite de envios
- **WHEN** o mesmo endereço pede mais de 3 links numa hora
- **THEN** os pedidos acima do limite recebem a resposta neutra e nenhum e-mail é enviado

### Requirement: Política de privacidade
O site SHALL ter uma página de privacidade em linguagem simples com o que é guardado, para quê, a base legal, como ver, exportar e apagar, e o que nunca é feito com os dados.

#### Scenario: Página de privacidade
- **WHEN** alguém abre `/privacidade`
- **THEN** lê o que o Cobra guarda para os alertas e como apagar

### Requirement: Resumo semanal
Cada inscrição ativa SHALL receber, uma vez por semana, as votações relevantes da semana anterior (até 15, da mais recente para a mais antiga) com data, casa, proposição, resultado, placar oficial, o voto de cada representante do estado informado e de cada político seguido (inclusive quem não registrou voto), link para a votação e fonte; semana sem votação relevante SHALL não gerar mensagem.

#### Scenario: Resumo com votos do estado e dos seguidos
- **WHEN** o resumo de uma semana com votações relevantes é disparado para uma inscrição ativa com estado e seguidos
- **THEN** a mensagem lista as votações da semana com o voto dos representantes do estado e dos seguidos, cada político uma vez por votação

#### Scenario: Semana sem eventos
- **WHEN** o resumo é disparado para uma semana sem votação relevante
- **THEN** nenhuma mensagem é enviada

#### Scenario: Inscrição não ativa
- **WHEN** o resumo é disparado
- **THEN** inscrições pendentes ou canceladas não recebem mensagem

### Requirement: Descadastro em toda mensagem
Toda mensagem do resumo SHALL trazer o link de saída no corpo e os cabeçalhos `List-Unsubscribe` e `List-Unsubscribe-Post` para descadastro em um clique.

#### Scenario: Cabeçalhos de descadastro
- **WHEN** um resumo é enviado
- **THEN** ele traz o link de saída e os cabeçalhos de descadastro em um clique

### Requirement: Histórico e envio único
Cada envio SHALL ficar registrado por inscrição e semana, com as votações incluídas e o resultado; a mesma semana SHALL não ser enviada duas vezes à mesma inscrição; o histórico SHALL aparecer em "Meus dados" e na exportação e ser apagado com a inscrição; o total de e-mails por dia SHALL respeitar o limite configurado.

#### Scenario: Disparo repetido
- **WHEN** o disparo da mesma semana roda de novo
- **THEN** quem já recebeu não recebe outra vez

#### Scenario: Histórico em meus dados
- **WHEN** a pessoa abre "Meus dados" depois de receber um resumo
- **THEN** vê a data do envio e as votações incluídas

### Requirement: Disparo protegido
A rota de disparo SHALL exigir o segredo configurado e SHALL responder 404 sem ele ou sem o segredo configurado.

#### Scenario: Sem o segredo
- **WHEN** alguém chama a rota de disparo sem o segredo
- **THEN** recebe 404 e nada é enviado
