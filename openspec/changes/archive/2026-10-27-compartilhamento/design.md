# Design

## Context

Já existem as páginas permanentes de perfil (`/politicos/<id>-<nome>`), de representantes (`/representantes/<código IBGE>`) e da obra (`/obras/<código>`), com consultas em cache. O Next 16 traz `ImageResponse` (`next/og`, Satori + Resvg), que gera PNG a partir de JSX com flexbox, sem dependência nova. O design system já tem o botão com variante `whatsapp`, o painel lateral (`SidePanel`), abas e aviso (`Toast`).

## Goals / Non-Goals

**Goals:** card com fato, fonte, data e endereço; prévia de link em toda página compartilhável; painel com WhatsApp em destaque; nenhum dado pessoal no card ou no link.

**Non-Goals:** card de votação, cards na página inicial, métricas de compartilhamento.

## Decisions

### D1. Cards como rotas de imagem
- `GET /cartao/politico/<id>/<formato>`, `/cartao/representantes/<código>/<formato>` e `/cartao/obra/<código>/<formato>`; formato `stories`, `feed` ou `link`.
- Route handlers com `ImageResponse`. Os dados vêm das mesmas consultas em cache das páginas (o site só lê o banco próprio).
- Código ou formato desconhecido: 404. Banco indisponível: 503 (o WhatsApp e as redes tentam de novo depois).
- `Cache-Control: public, max-age=3600` no sucesso.
- Alternativa considerada: `opengraph-image.tsx` por rota. Rejeitada porque só gera um tamanho, e o painel precisa dos três.

### D2. Modelo único
- Um componente de layout (`lib/cards/layout.tsx`) recebe título, linhas de fato, fonte, data e cor de destaque; o formato só muda tamanhos e quebras.
- Fundo e texto fixos (tema claro do Cobra). A cor do partido aparece só no selo da sigla, como na grade, pela mesma regra para todos (§9.1).
- Rodapé: "Fonte: … · Atualizado em dd/mm/aaaa" e o endereço do site (host de `SITE_URL`).
- Fontes Onest (400, 700) e Newsreader (600) em WOFF, lidas de `web/assets/fonts/` (Satori não lê WOFF2). Origem: pacotes @fontsource 5.2.8, licença OFL ao lado.

### D3. Conteúdo de cada card
- **Perfil**: foto, nome, cargo · UF, sigla do partido, frase "Quem é" e, quando há, "N emendas com destino ao DF, R$ X empenhados" (Portal da Transparência). Distrital: só a frase.
- **Representantes**: bandeira da UF, "Quem representa <lugar>" e uma linha por casa com a contagem ("3 senadores(as)"). Sem fotos: um subconjunto de rostos exigiria escolher quem aparece, e todos não cabem em estados grandes.
- **Obra**: nome, situação (com "há N meses" quando paralisada), valor previsto e execução física, ou "—" quando a fonte não informa.
- Data de atualização: a da coleta mais recente do bloco mostrado.

### D4. Foto oficial no card
- A foto já guardada (`photo_url`, só dos domínios oficiais aceitos pelo `next/image`) é baixada pelo servidor com tempo limite de 3 s e embutida como data URL. Falha ou domínio fora da lista: círculo com as iniciais. É o mesmo tipo de busca que o proxy de imagens já faz, não uma consulta a API.

### D5. Prévia de link
- `generateMetadata` nas três páginas: título, descrição factual, `openGraph.images` com o card `link` (1200×630, `alt` descritivo) e `twitter.card = summary_large_image`.
- `metadataBase` no layout a partir de `SITE_URL` (opcional; padrão `http://localhost:3000`). Em produção o deploy define a variável.

### D6. Painel "Compartilhar" (`components/SharePanel`)
- Botão "Compartilhar" abre o `SidePanel` (gaveta no celular) com abas de formato e a prévia `<img>` do card.
- Ações, nesta ordem:
  1. **Enviar no WhatsApp** (variante `whatsapp`): `https://wa.me/?text=<texto + link>`; sem número, o WhatsApp abre a escolha do contato. A central de ajuda oficial (faq.whatsapp.com, "clique para conversar") não pôde ser lida automaticamente em 2026-10-27; formato conferido em fontes secundárias.
  2. **Compartilhar…** (menu nativo), só se `navigator.share` existir; envia o arquivo do card quando `navigator.canShare({ files })` aceita, senão só o link.
  3. **Baixar imagem**: `<a download>` com nome `cobra-<tipo>-<id>-<formato>.png`.
  4. **Copiar imagem**: `navigator.clipboard.write` com `ClipboardItem`, só se o navegador permitir.
  5. **Postar no X**: `https://x.com/intent/tweet?text=…&url=…` (docs.x.com, "Web Intent", consultado em 2026-10-27).
  6. **Copiar link**.
- Confirmações por `Toast` ("Link copiado", "Imagem copiada").
- O link compartilhado é o endereço canônico da página, sem parâmetros: nada de CEP, e-mail ou políticos seguidos (§13.3).

### D7. Testes
- Vitest: textos dos cards (funções puras de conteúdo), montagem das URLs de WhatsApp e X.
- Playwright: cada rota de cartão responde PNG com o tamanho certo (lido do cabeçalho PNG); 404 para código e formato desconhecidos; `og:image` presente nas três páginas; o painel abre, mostra a prévia, o link do WhatsApp tem o texto e o link da página, e "Copiar link" mostra o aviso; axe com o painel aberto.

## Risks / Trade-offs

- Gerar PNG custa CPU → cache HTTP de 1 h e consultas em cache.
- Foto lenta atrasa o card → tempo limite e iniciais.
- Sem `SITE_URL` em produção, a prévia aponta para localhost → documentado no `.env.example`; o deploy (decisão pendente de hospedagem) define.
