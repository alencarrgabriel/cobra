# Design

## Context

Infra de coleta pronta (`infra-coleta`): fila no Postgres, cliente HTTP com limite e retentativas, armazenamento bruto, `Context` com `fetch`/`save_raw`/`validate`/`enqueue`. Tabelas do cadastro prontas (`modelo-dados-base`): `politicians`, `politician_external_ids`, `restricted.politician_private_ids`, `parties`, `party_affiliations`, `mandates`, com as regras de `cadastro-de-representantes` (uma filiação aberta por político, mandatos sem sobreposição, identificador externo único). O adaptador `obrasgov` é o modelo a seguir.

API conferida em 2026-10-26 (`https://dadosabertos.camara.leg.br/api/v2`, OpenAPI versão 0.4.347):
- `GET /deputados` sem parâmetro de tempo: só os deputados em exercício no momento (513). Padrão de 15 itens, máximo de 100 por requisição. Paginação nos cabeçalhos `Link` e `X-Total-Count`.
- `GET /deputados/{id}`: `nomeCivil`, `cpf`, `dataNascimento`, `ultimoStatus` (nome, sigla do partido, UF, legislatura, `urlFoto`, `situacao`, `condicaoEleitoral`, `data`).
- `GET /deputados/{id}/historico`: mudanças de situação e de partido, em ordem não garantida, misturando legislaturas, com registros "Nome/Partido no início da legislatura" datados do início da legislatura atual mesmo para legislaturas antigas.
- `GET /partidos`: partidos com deputados em exercício (sigla, nome, id da Câmara).
- Sem chave. Limite de requisições não documentado (DDR §6.1). As respostas trazem `Retry-After: 30`.

## Goals / Non-Goals

**Goals:** bancada federal completa e atual de todas as UFs, identidade única com o id da Câmara, partido atual, CPF restrito, mandatos encerrados quando o deputado sai.

**Non-Goals:** histórico completo de filiações e mandatos de legislaturas passadas, despesas, votações, cores de partido, telas.

## Decisions

### D1. Tarefas
- `camara/deputies-page` (dedupe `p<N>`): `GET /deputados?itens=100&pagina=N&ordem=ASC&ordenarPor=id`. Grava o bruto, enfileira a próxima página de forma independente (como no Obrasgov), pelo link `next` da resposta, e um `camara/deputy` por deputado, com o id do partido tirado do `uriPartido` da lista.
- `camara/deputy` (dedupe `<id>`): `GET /deputados/{id}` e `GET /deputados/{id}/historico` e, se o partido ainda não estiver no banco, `GET /partidos/{id}`. Publica político, ids, CPF, partido, filiação e mandato numa transação.
- `camara/close-mandates` (dedupe `run`): enfileirado pelo `plan()` junto com a página 1. Busca de novo a lista inteira de deputados em exercício e trata os mandatos abertos de quem não está nela (D4). Não depende da ordem das outras tarefas: só mexe em quem saiu da lista.
- Limite: 2 req/s, rajada 2 (mesmo critério do Obrasgov).

### D2. Normalização (`camara_model.py`)
- Político: `nomeCivil`, `ultimoStatus.nomeEleitoral` (ou `nome`), `dataNascimento`, `ultimoStatus.urlFoto`. Fonte `camara`, `source_id` = id da Câmara, `source_url` = URL do detalhe.
- Partido: chave = sigla. Se a sigla já existe, atualiza o nome; senão cria, com `source_id` = id do partido na Câmara (do `uriPartido` da lista, porque o detalhe às vezes vem com `uriPartido` nulo).
- UF: `siglaUf` convertida no código IBGE pela tabela de localidades. Sigla desconhecida bloqueia o deputado (D5).
- Situação do mandato: `condicaoEleitoral` "Titular" → `titular`, "Efetivado" (suplente que assumiu a vaga de vez, "Posse como Titular"; 19 casos na carga real) → `titular`, "Suplente" → `suplente`; `situacao` "Licença" de titular → `licenciado`. Valor desconhecido bloqueia o deputado.

### D3. Início do mandato e situação
- Linhas do histórico consideradas: só as da legislatura atual com `situacao` preenchida. As linhas "Nome/Partido no início da legislatura" (sem situação) são ignoradas.
- Titular: o mandato começa na primeira entrada em "Exercício" da legislatura. Licenças não encerram o mandato (artigo 56 da Constituição): mudam a situação para `licenciado`, e a reassunção volta para `titular`.
- Suplente: o mandato começa na entrada em "Exercício" mais recente que veio depois de uma linha que não é de exercício, ou seja, o início do período de exercício atual.
- Sem entrada de exercício na legislatura: o início é `ultimoStatus.data`, limitado ao início da legislatura (01/02/2023).
- `source_id` do mandato: `<id>-<legislatura>-<início>`. Um suplente que sai e volta tem dois mandatos, sem sobreposição. Se o deputado tiver outro mandato aberto da Câmara com outro `source_id` (por exemplo, suplente efetivado como titular), o anterior é encerrado na véspera do novo início.

### D4. Quem saiu da lista
- `close-mandates` busca as páginas da lista atual. Se alguma falhar, a tarefa falha e é repetida depois, sem mexer em nenhum mandato: encerrar por falha de coleta seria inventar uma saída.
- Para cada mandato aberto de deputado federal da Câmara cujo id não está na lista, busca `GET /deputados/{id}`:
  - titular com `situacao` "Licença": o mandato continua aberto, com situação `licenciado`;
  - qualquer outro caso (suplente que saiu, fim de mandato, vacância): o mandato é encerrado em `ultimoStatus.data`. Se a data faltar ou for anterior ao início do mandato, usa a data da coleta e registra na tarefa que a data é aproximada.

### D5. Validação
- Estruturais, bloqueiam o deputado: id ausente, nome civil e parlamentar vazios, UF desconhecida, situação desconhecida, data de nascimento inválida. O motivo vai para `last_error` da tarefa; os outros deputados seguem.
- CPF: só aceito com 11 dígitos; fora disso é descartado com aviso, sem bloquear o deputado.

### D6. Troca de partido
- Filiação aberta com outro partido: encerrada com `ended_on` = `ultimoStatus.data` (ou a data da coleta, se ausente), e uma nova aberta começando nessa data. Mesma filiação: nada muda.
- Filiações sem data de início são aceitas pelo esquema; a primeira filiação de cada deputado fica sem início, porque a Câmara não informa a data de filiação.

### D7. Testes
- Respostas reais gravadas: lista do DF, uma página de 100, detalhe e histórico de um titular, de um suplente e de um licenciado, partidos. CPF trocado por um valor fictício com 11 dígitos antes de gravar a amostra.
- Testes com banco: carga completa, segunda carga igual, troca de partido, saída de exercício, UF desconhecida, CPF só no esquema restrito, página falha não encerra mandatos.

## Risks / Trade-offs

- [Histórico bagunçado leva a data de início errada] → Regra D3 testada com amostras reais; dado sempre com fonte e data de coleta; perfil mostra "em exercício desde" com a fonte.
- [Sigla reaproveitada por partido novo] → A Câmara avisa que siglas se repetem entre legislaturas. Como só há partidos atuais, a sigla é única hoje; a identidade completa de partido vem em `identidade-de-partidos-e-ufs`.
- [Limite não documentado] → 2 req/s e respeito a `Retry-After`; cerca de 1.030 requisições, uns 9 minutos por carga.

## Migration Plan

Sem migração prevista. Primeira carga manual pela CLI (`cobra-collect enqueue camara` e `work`), conferida contra o total da API (513).
