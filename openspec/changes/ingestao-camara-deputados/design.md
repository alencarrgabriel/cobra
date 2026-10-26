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
- `camara/deputies-page` (dedupe `p<N>`): `GET /deputados?itens=100&pagina=N&ordem=ASC&ordenarPor=id`. Grava o bruto, enfileira a próxima página de forma independente (como no Obrasgov) e um `camara/deputy` por deputado.
- `camara/deputy` (dedupe `<id>`): `GET /deputados/{id}` e `GET /deputados/{id}/historico`. Publica político, ids, CPF, partido, filiação e mandato numa transação.
- `camara/close-mandates` (dedupe `<data da coleta>`): enfileirado pela última página. Roda depois dos detalhes (`run_after` alguns minutos à frente) e encerra os mandatos abertos de quem não está mais na lista (D4).
- `plan()` enfileira só a página 1. Limite: 2 req/s, rajada 2 (mesmo critério do Obrasgov).

### D2. Normalização (`camara_model.py`)
- Político: `nomeCivil`, `ultimoStatus.nomeEleitoral` (ou `nome`), `dataNascimento`, `ultimoStatus.urlFoto`. Fonte `camara`, `source_id` = id da Câmara, `source_url` = URL do detalhe.
- Partido: chave = sigla. Se a sigla já existe, atualiza o nome; senão cria, com `source_id` = id do partido na Câmara (do `uriPartido` da lista, porque o detalhe às vezes vem com `uriPartido` nulo).
- UF: `siglaUf` convertida no código IBGE pela tabela de localidades. Sigla desconhecida bloqueia o deputado (D5).
- Situação do mandato: `condicaoEleitoral` "Titular" → `titular`, "Suplente" → `suplente`; `situacao` "Licença" → `licenciado`. Valor desconhecido bloqueia o deputado.

### D3. Início do mandato
- Do histórico, as entradas da legislatura atual com `situacao` "Exercício", ignorando as linhas "início da legislatura" de outras legislaturas. A data de início é a mais antiga dessas entradas, limitada ao início da legislatura (01/02/2023).
- Sem entrada de exercício na legislatura atual: titular começa no início da legislatura; suplente usa `ultimoStatus.data`.
- `source_id` do mandato: `<id>-<legislatura>-<início>`. Um deputado que sai e volta tem dois mandatos, sem sobreposição.

### D4. Saída de exercício
- A tarefa `close-mandates` lista os mandatos abertos de deputado federal com fonte `camara` cujo id da Câmara não apareceu nas páginas da coleta atual (os ids vistos ficam no payload da tarefa).
- Para cada um, busca o histórico e usa como fim a data da entrada mais recente da legislatura atual com `situacao` diferente de "Exercício". Sem essa entrada, usa a data da coleta e registra na tarefa que a data é aproximada.
- Se a lista veio incompleta (alguma página falhou), `close-mandates` não roda: encerrar mandato por falha de coleta seria inventar uma saída.

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
