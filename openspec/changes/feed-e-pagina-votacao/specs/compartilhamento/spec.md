# Spec Delta

## MODIFIED Requirements

### Requirement: Card de imagem em três formatos
O site SHALL gerar, a partir do próprio banco, um card de imagem para o perfil de político, para "seus representantes" de um lugar, para a ficha de obra e para a votação, nos formatos stories (1080×1920), feed (1080×1350) e prévia de link (1200×630). Código ou formato inexistente SHALL responder 404; banco indisponível SHALL responder 503.

#### Scenario: Formatos
- **WHEN** alguém pede o card de um perfil existente nos formatos stories, feed e link
- **THEN** recebe imagens PNG de 1080×1920, 1080×1350 e 1200×630

#### Scenario: Código inexistente
- **WHEN** alguém pede o card de uma obra que não existe
- **THEN** recebe status 404

#### Scenario: Card da votação
- **WHEN** alguém pede o card de uma votação existente
- **THEN** recebe a imagem com a casa, a data, a proposição, o resultado e a contagem oficial

### Requirement: Prévia de link
O perfil, "seus representantes", a ficha da obra e a página da votação SHALL declarar prévia de link (Open Graph e cartão do X) com título, descrição factual e o card 1,91:1 em endereço absoluto.

#### Scenario: Link colado no WhatsApp
- **WHEN** alguém cola o link de um perfil numa conversa
- **THEN** a página informa `og:title`, `og:description` e `og:image` apontando para o card de prévia do mesmo perfil
