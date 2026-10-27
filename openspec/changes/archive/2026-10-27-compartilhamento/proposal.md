# Compartilhamento

## Why

O DDR trata o compartilhamento como o principal canal de crescimento (cap. 11, §13.3, decisão de 2026-10-26): quem recebe um link pelo WhatsApp precisa ver o card na conversa e cair no Cobra já com o conteúdo, sem informar CEP. Hoje as páginas não têm prévia de link nem imagem para redes, e não há onde tocar para compartilhar.

Requisitos cobertos: RF-60 (links permanentes, já existentes; o de "seus representantes" usa o código IBGE), RF-61 (card de imagem em 9:16, 4:5 e 1,91:1), RF-67 (painel "Compartilhar") e RF-68 (Open Graph em toda página compartilhável), com as regras do §13.3.

## What Changes

- **Cards de imagem** gerados pelo próprio site, a partir do banco, em três formatos: stories (1080×1920), feed (1080×1350) e prévia de link (1200×630). Mesmo modelo para qualquer partido ou político. Cada card traz o fato, a fonte oficial, a data de atualização e o endereço do Cobra:
  - **perfil**: foto oficial, nome, cargo e UF, partido, a frase "Quem é" e as emendas com destino ao DF;
  - **seus representantes** (UF ou município): bandeira, nome do lugar e quantos representantes há em cada casa;
  - **obra**: nome, situação (com o tempo de paralisação), valor previsto e execução física.
- **Prévia de link (Open Graph e cartão do X)** no perfil, em "seus representantes" e na ficha da obra, com título, descrição e o card 1,91:1.
- **Painel "Compartilhar"** nessas três páginas: prévia do card com escolha do formato; enviar no WhatsApp (em destaque); menu nativo do celular (com a imagem, quando o aparelho permite); baixar imagem; copiar imagem; postar no X; copiar link.
- Nova variável opcional `SITE_URL` (endereço público do site), usada nos links absolutos da prévia e no rodapé dos cards.

## Fora de escopo

- Card de votação (vem com a change 24, feed-e-pagina-votacao).
- RF-69, exemplos de cards na página inicial (vai com a change 17, mapa-do-brasil, que refaz a página inicial).
- Contagem de compartilhamentos (indicador do cap. 12): não há ferramenta de métricas decidida.
- Logotipos de partido nos cards (aguardam o parecer jurídico).

## Capabilities

### New Capabilities
- `compartilhamento`: cards de imagem, prévia de link e painel de compartilhar.

### Modified Capabilities
- (nenhuma)

## Impact

- `web/src/app/cartao/**` (rotas de imagem), `web/src/lib/cards/**`, `web/src/components/SharePanel/**`, `web/assets/fonts/` (Onest e Newsreader em WOFF, licença OFL).
- `generateMetadata` nas páginas de perfil, representantes e obra; `metadataBase` no layout.
- `web/src/config/env-schema.ts` e `.env.example` (`SITE_URL`).
- Sem mudança no banco nem nos coletores.
