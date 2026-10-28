# Spec Delta

## Purpose

Define o cadastro de alertas por e-mail e o "Seguir" do Cobra: opt-in duplo, consentimento separado para os seguidos, direitos do titular pelo próprio site, descadastro em um clique e proteção dos dados (criptografia, resposta neutra, limites e registro de acessos).

## ADDED Requirements

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
