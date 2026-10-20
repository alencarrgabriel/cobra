# Spec Delta

## Purpose

Define o comportamento comum a todas as páginas e rotas do site do Cobra: idioma, adaptação ao celular, proteções de segurança no transporte e no navegador, e um ponto de verificação de saúde que não depende de serviços externos.

## ADDED Requirements

### Requirement: Páginas em português do Brasil
Toda página HTML do site SHALL declarar o idioma `pt-BR` no documento e apresentar seus textos ao usuário em português do Brasil.

#### Scenario: Página inicial declara o idioma
- **WHEN** um navegador solicita a página inicial `/`
- **THEN** o HTML retornado tem o atributo `lang="pt-BR"` no elemento raiz
- **AND** o título da página está em português

### Requirement: Layout mobile first
Toda página SHALL declarar viewport para dispositivos móveis e SHALL ser utilizável em tela de 360 px de largura sem rolagem horizontal.

#### Scenario: Página inicial em tela de celular
- **WHEN** a página inicial é aberta numa janela de 360 px de largura
- **THEN** o documento tem a meta tag `viewport` com `width=device-width`
- **AND** a largura do conteúdo não excede a largura da janela

### Requirement: Página inicial renderizada no servidor
A página inicial SHALL chegar ao navegador com seu conteúdo principal já presente no HTML, sem exigir JavaScript para exibi-lo.

#### Scenario: Conteúdo sem JavaScript
- **WHEN** a página inicial é solicitada por um cliente sem execução de JavaScript
- **THEN** o HTML retornado contém o nome do produto e a frase que descreve o que ele faz

### Requirement: Cabeçalhos de segurança
Toda resposta do site SHALL incluir cabeçalhos que obrigam HTTPS (HSTS), impedem a exibição dentro de iframes de outros sites, desativam a detecção de tipo de conteúdo e limitam o envio de referência a outros sites.

#### Scenario: Cabeçalhos presentes na página inicial
- **WHEN** a página inicial é solicitada
- **THEN** a resposta contém `Strict-Transport-Security` com `max-age` de pelo menos 31536000
- **AND** contém `Content-Security-Policy` com `frame-ancestors 'none'`
- **AND** contém `X-Content-Type-Options: nosniff`
- **AND** contém `Referrer-Policy: strict-origin-when-cross-origin`

#### Scenario: Cabeçalhos presentes em rotas de API
- **WHEN** a rota `/api/health` é solicitada
- **THEN** a resposta contém os mesmos cabeçalhos de segurança

### Requirement: Rota de saúde independente de serviços externos
O site SHALL expor `GET /api/health`, que responde em JSON com o estado e a versão da aplicação sem consultar o banco de dados nem qualquer API externa.

#### Scenario: Site no ar
- **WHEN** `GET /api/health` é solicitado
- **THEN** a resposta tem status 200
- **AND** o corpo JSON contém `status` igual a `"ok"` e o campo `version`

#### Scenario: Sem acesso à rede externa
- **WHEN** `GET /api/health` é solicitado num ambiente sem acesso à internet e sem banco de dados disponível
- **THEN** a resposta ainda tem status 200 e `status` igual a `"ok"`

### Requirement: Página não encontrada em linguagem simples
Endereços inexistentes SHALL retornar status 404 com uma mensagem em português simples e um link para a página inicial.

#### Scenario: Endereço inexistente
- **WHEN** um navegador solicita `/pagina-que-nao-existe`
- **THEN** a resposta tem status 404
- **AND** a página explica em português que o endereço não foi encontrado e tem um link para `/`
