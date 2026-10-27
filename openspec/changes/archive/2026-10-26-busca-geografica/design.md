# Design

## Context

- No banco: 513 deputados federais, 81 senadores em exercício (mais os licenciados), 24 distritais, partidos com cor (`core.party_colors`), 5.571 municípios com `search_name`.
- No site: `RepresentativeCard`, `Portrait`, `PartyBadge`, `UfFlag`, `SidePanel`, `FilterChip`, os padrões de consulta com `'use cache'` e `tryDb` de `works/queries.ts` e o banco de teste do Playwright.
- `Portrait` usa `next/image` com `unoptimized`, o que faria o navegador buscar a foto no servidor da casa (privacidade) e é bloqueado pela CSP (`img-src 'self' data:`).
- Faixas de CEP por UF:
  - fonte: tabela da Wikipédia "Código de Endereçamento Postal", que cita as páginas dos Correios "Estrutura do CEP" e "Alteração de faixas de CEP";
  - a ferramenta oficial de faixas dos Correios exige captcha e não pode ser consultada por programa;
  - DF: 70000-000 a 72799-999 e 73000-000 a 73699-999.

## Goals / Non-Goals

**Goals:** busca sem cadastro e sem guardar CEP; página permanente por código IBGE; grade com foto, bandeira, partido; painel de resumo; filtro por partido; lugar lembrado no aparelho.

**Non-Goals:** CEP → município fora do DF, perfil completo, compartilhamento, mapa.

## Decisions

### D1. CEP → lugar (`lib/geo/cep.ts`)
- Tabela fixa de faixas por UF (5 dígitos iniciais).
- A faixa 78900–78999, que as fontes atribuem de formas diferentes (MT ou RO), fica sem UF: a pessoa escolhe a UF.
- CEP do DF → município 5300108; outro CEP → código da UF.
- Validação: 8 dígitos, com ou sem hífen, e não "00000000".

### D2. Texto → lugar (`lib/places/`)
- Normaliza (sem acento, minúsculas, espaços simples).
- Primeiro, sigla ou nome de UF exatos. Depois, `search_name` exato de município:
  - um só: vai direto;
  - vários: mostra a lista para escolher;
  - nenhum: busca municípios que começam com o texto, até 10, e mostra a lista.

### D3. Envio sem CEP no endereço
- O formulário usa `method="post"` para `/buscar`, um Route Handler.
- O handler resolve o lugar e responde com redirecionamento 303 para:
  - `/representantes/<código>`;
  - ou `/representantes?escolher=<texto>` para nomes de cidade com mais de uma opção (o texto é o nome da cidade, não dado pessoal);
  - ou `/representantes?erro=nao-encontrado`.
- O texto recebido não é registrado no log. O CEP só existe na memória do handler.

### D4. Página `/representantes/[codigo]`
- `codigo`: 2 dígitos (UF) ou 7 dígitos (município); a UF é o prefixo. Código inexistente → 404 pelo Proxy, como nas obras (consulta ao banco antes de renderizar).
- Dados dentro de `<Suspense>`, com `'use cache'` e `cacheLife('hours')`.
- Consultas:
  - mandatos abertos com situação `titular` ou `suplente`, por casa e UF;
  - partido pela filiação aberta;
  - cor por `party_colors` (neutra se não houver);
  - data de coleta mais recente de cada casa, para a linha de fonte.
- Ordem: alfabética pelo nome parlamentar, critério escrito na tela. Não há destaque.
- Seções: Senado, Câmara, e CLDF (só no DF); fora do DF, aviso de cobertura (RF-05).
- Filtro `?partido=SIGLA` (links, sem JavaScript); sigla inválida é ignorada.

### D5. Card e painel
- `RepresentativesGrid` (cliente) recebe a lista já pronta e abre o `SidePanel` com:
  - cargo e casa;
  - partido;
  - situação: "Em exercício", ou "Suplente em exercício" no caso de suplente;
  - "No mandato desde dd/mm/aaaa";
  - link para a página oficial: Câmara `https://www.camara.leg.br/deputados/<id>`, Senado `https://www25.senado.leg.br/web/senadores/senador/-/perfil/<código>`, CLDF o perfil guardado.
- Sem JavaScript, o card continua visível (o nome é texto), mas não abre o painel.

### D6. Fotos pelo próprio site
- `next.config.ts` `images.remotePatterns` (protocolo `https`, sem porta), só para:
  - `www.camara.leg.br` `/internet/deputado/bandep/**`;
  - `legis.senado.leg.br` `/senadores/fotos-oficiais/**`;
  - `www.cl.df.gov.br` `/documents/**`.
- `maximumRedirects: 0` e `minimumCacheTTL` de 7 dias. `Portrait` deixa de usar `unoptimized`.
- Foto que falha mostra a ilustração com as iniciais.

### D7. Lugar lembrado (RF-07)
- `localStorage["cobra:lugar"] = { codigo, nome }`, gravado pela página do lugar.
- A página inicial (cliente) mostra o atalho e "Esquecer este lugar".
- Acesso dentro de `try/catch`: navegação privada sem armazenamento continua funcionando.

### D8. Testes
- Vitest:
  - faixas de CEP (DF, SP, faixa disputada, inválido);
  - normalização e resolução de texto;
  - links oficiais.
- Seed do banco de teste: dois municípios homônimos fictícios e, no DF, senadores, deputados federais e distritais fictícios com partido e cor. Fotos ausentes, para não depender de rede.
- Playwright:
  - CEP do DF leva a `/representantes/5300108` e o endereço não tem o CEP;
  - cidade homônima mostra a escolha;
  - texto inválido mostra a mensagem;
  - Brasília mostra as três seções com as contagens do seed;
  - filtro por partido;
  - painel abre e fecha;
  - lugar lembrado aparece na página inicial e pode ser esquecido;
  - código inexistente → 404;
  - axe nos dois temas.

## Risks / Trade-offs

- [Faixas de CEP mudam] → Raramente; a tabela fica em código, com a fonte, e um CEP sem faixa pede a UF.
- [Proxy de imagem consome banda do servidor] → Imagens pequenas, com cache de 7 dias.
- [Homônimos de cidade] → Lista com a UF ao lado; a pessoa escolhe.

## Migration Plan

Sem migração.
