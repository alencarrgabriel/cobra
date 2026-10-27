# Coleta de dados

Como o Cobra copia dados das fontes oficiais para o banco próprio. O site nunca consulta essas fontes diretamente (DDR RNF-04). Referências: DDR §6.2, specs `coleta-de-dados` e `rastreabilidade-de-dados`.

## Camadas

| Camada | Onde | O que tem |
|---|---|---|
| Bruta | `raw.responses` (+ arquivos em `RAW_DATA_DIR`) | Cada resposta exatamente como a fonte devolveu: URL, parâmetros, código HTTP, data e hora, SHA-256. JSON e texto ficam no banco; ZIP, PDF e respostas acima de 2 MB ficam em disco, em `<fonte>/<aaaa>/<mm>/<sha256>.<ext>` |
| Normalizada e publicada | esquema `core` | Entidades do Cobra com rastreabilidade (`docs/modelo-de-dados.md`). Uma tarefa só grava aqui se todas as validações passarem |
| Operação | `ops.jobs`, `ops.runs` | Fila de tarefas e registro de execuções |

O registro bruto é gravado numa conexão separada, já confirmado: se a validação reprovar, o dado não é publicado, mas o que a fonte respondeu continua guardado para análise.

## Fila

- `ops.jobs` guarda cada tarefa (fonte, tipo, parâmetros, `dedupe_key`). A mesma tarefa pendente não entra duas vezes.
- O trabalhador pega a próxima tarefa pronta com `FOR UPDATE SKIP LOCKED`: duas execuções em paralelo nunca pegam a mesma.
- Falhou? Volta para a fila com espera crescente (1 min, 2 min, 4 min… até 6 h). Depois de `max_attempts` (padrão 5), fica como `failed`.
- Tarefas presas em `running` há mais de 30 min (processo que morreu) voltam para a fila no início de cada execução.
- Uma tarefa recém-enfileirada já conta como pronta mesmo que o relógio do banco volte até 2 s (no Docker Desktop ele chega a voltar ~1,2 s); sem essa folga, o trabalhador achava a fila vazia e parava antes da hora.

## Limites e retentativas

Cada fonte declara `rate_per_second` e `burst`. O cliente HTTP passa toda requisição pelo limitador da fonte e:
- repete 429, 502, 503, 504 e falhas de rede, com espera exponencial e variação aleatória, respeitando `Retry-After`;
- não repete outros erros (404, 400…), que são devolvidos para o adaptador decidir;
- se identifica com `User-Agent: Cobra/<versão> (+https://github.com/alencarrgabriel/cobra)`.

Limites iniciais (conservadores; cada change de fonte confirma na documentação oficial):

| Fonte | Limite oficial | Limite usado |
|---|---|---|
| Senado | 10 req/s (acima disso, HTTP 429; evitar horários redondos) | 8 req/s |
| Portal da Transparência | 400/min (06h–24h), 700/min (00h–06h) na API; o download em massa não tem limite publicado | 1 req/s (um arquivo por carga) |
| Câmara | não documentado (respostas trazem `Retry-After: 30`) | 2 req/s |
| TSE (arquivos) | — (CDN de arquivos) | 1 req/s |
| Obrasgov | não documentado | 2 req/s |
| CLDF (site) | — (site, não API) | 1 req/s |

## Fontes ativas

### Obrasgov.br (`obrasgov`)

- API: `https://api-publica.obrasgov.gestao.gov.br/obras` (OpenAPI verificado em 2026-10-26), sem chave.
- Escopo: obras com UF principal DF (piloto). Tarefas: `projects` (páginas de 200 obras), `detail` (execução física e histórico de cada obra, criada quando a obra é publicada) e `geometry` (município de cada obra).
- A data da base (`/data-atualizacao`) vira `source_updated_at` de todas as linhas.
- Qualidade da fonte, tratada na normalização: coordenadas lidas do texto do ponto (os campos `latitude`/`longitude` da API às vezes vêm cortados) e descartadas fora do Brasil; eventos de paralisação repetidos guardados uma vez; fotos só indicadas (a API não traz as imagens).
- Empenhos: tarefa `commitments` por obra (`/empenho`), com o identificador da emenda guardado como veio e reconhecido (change `ingestao-emendas`).
- Volume no DF: cerca de 3.450 requisições por atualização completa, ~30 minutos a 2 req/s.

### Câmara dos Deputados (`camara`)

- API: `https://dadosabertos.camara.leg.br/api/v2` (OpenAPI 0.4.347 verificado em 2026-10-26), sem chave. No máximo 100 itens por página.
- Escopo: deputados federais em exercício, todas as UFs (513 em 2026-10-26). Tarefas:
  - `deputies-page`: páginas de 100 deputados da lista em exercício;
  - `deputy`: detalhe e histórico de cada deputado e, se o partido for novo, o partido;
  - `close-mandates`: busca a lista de novo e trata quem saiu dela.
- O que fica guardado: político e identificador da Câmara, CPF só em `restricted`, partido atual e filiação, mandato de deputado federal da legislatura 57.
- Licença não encerra mandato: o titular licenciado fica com situação `licenciado` e volta a `titular` quando reassume. Suplente que sai do exercício, ou fim de mandato, encerra o mandato na data da Câmara. Se a lista falhar, nenhum mandato é encerrado.
- Qualidade da fonte, tratada na normalização: o histórico vem desordenado e mistura legislaturas, e as linhas "Nome/Partido no início da legislatura" são ignoradas; o detalhe traz `uriPartido` nulo, então o partido vem da lista.
- Volume: cerca de 1.030 requisições por atualização completa, ~9 minutos a 2 req/s.

### Senado Federal (`senado`)

- API: `https://legis.senado.leg.br/dadosabertos` (OpenAPI 4.1.3.106 em `/v3/api-docs`, verificado em 2026-10-26), sem chave; JSON pedido pelo sufixo `.json` em cada endereço (sem ele, a resposta vem em XML). A documentação pede para evitar rotinas em horários redondos (00:00, 01:15…).
- Escopo: senadores em exercício (81 em 2026-10-26). Tarefas:
  - `senators`: busca a lista em exercício e a de afastados, enfileira um `senator` por senador e trata quem não está em exercício;
  - `senator`: detalhe (data de nascimento) e filiações de cada senador.
- O que fica guardado: político e identificador do Senado (foto em `https://legis.senado.leg.br/senadores/fotos-oficiais/<código>`, para onde o endereço da lista redireciona), partidos e o histórico de filiações com as datas do Senado, mandato de senador pela primeira legislatura do mandato. A API não informa CPF.
- Titular afastado temporariamente que ainda não estava no cadastro é cadastrado como `licenciado`: continua titular e pode ser autor de emendas.
- Afastados: a causa do último período de exercício decide.
  - Titular afastado por licença ou cargo de ministro ou secretário fica `licenciado`.
  - Renúncia, falecimento, cassação ou perda do mandato encerram o mandato.
  - Suplente que volta para a suplência tem o mandato encerrado na data do fim do exercício.
  - Se uma das listas falhar, nenhum mandato muda.
- Mesmo político na Câmara e no Senado: ligado pelo nome civil sem acentos e pela data de nascimento, só quando há exatamente um candidato.
- Qualidade da fonte, tratada na normalização: itens únicos vêm como objeto, não como lista; `/senador/afastados` redireciona para `/dados/AfastamentoAtual.json`.
- Volume: cerca de 164 requisições por atualização completa, menos de 1 minuto a 8 req/s.

### Câmara Legislativa do DF (`cldf`)

- A CLDF não tem API de deputados. O portal `dados.cl.df.gov.br` (CKAN, conferido em 2026-10-26) só traz os deputados misturados à lista nominal de cerca de 2.400 servidores, sem partido. Essa lista não é coletada (coleta mínima).
- Fonte: o site oficial, lido como HTML.
  - Página `/deputados-2023-2026`, bloco "Legislatura Atual": nome, partido, foto e perfil de cada um dos 24.
  - Perfil de cada deputado: nome completo, nascimento e partido.
- Tarefas:
  - `list`: lê e valida a lista; com menos de 20 deputados reconhecíveis falha sem mexer em nada. Enfileira um `deputy` por deputado e encerra o mandato de quem saiu da lista, na data da coleta.
  - `deputy`: perfil e publicação.
- Partido: sigla entre parênteses ou nome por extenso de um partido em atividade. Partido extinto ou desconhecido (o site ainda mostra "Democrata" para um deputado) fica sem filiação atual, com aviso no log.
- Limitação: o site não distingue titular de suplente nem informa a data de posse. Todos ficam como titulares desde 01/01 do início da legislatura, até `ingestao-tse` corrigir com os eleitos.
- Mesmo político em outra casa: nome civil sem acentos e data de nascimento (`sources/identity.py`, também usado pelo Senado).
- Volume: 25 páginas por atualização, cerca de 30 segundos a 1 req/s.

### Portal da Transparência (`transparencia`)

- Download em massa, público e sem chave (conferido em 2026-10-26): `https://dadosabertos-download.cgu.gov.br/PortalDaTransparencia/saida/emendas-parlamentares/EmendasParlamentares.zip`, cerca de 32 MB, atualizado diariamente. O ZIP inteiro fica no armazenamento bruto.
- Tarefa única `amendments`:
  - lê `EmendasParlamentares.csv` (Latin-1, `;`) e guarda as emendas com destino ao DF ("DISTRITO FEDERAL (UF)" ou "BRASÍLIA - DF"), uma por código de 12 dígitos, com os valores somados das linhas;
  - linhas sem código ("Sem informação", comuns em 2014) não viram emenda, e o log conta quantas foram.
- Autor: ligado ao político quando o nome casa com o nome parlamentar de exatamente um deputado federal ou senador. Bancada, comissão e relator ficam sem político.
- Vínculo com obras: os empenhos de cada obra vêm do Obrasgov (tarefa `commitments` do adaptador `obrasgov`). A visão `core.work_amendment_links` liga obra e emenda com grau "direto" quando o empenho identifica uma emenda guardada. Identificador reconhecido:
  - código de 12 dígitos;
  - 8 dígitos (autor e número) com o ano do empenho.

  Outros formatos não ligam: `"0"`, texto, ou `"20264268000.0"`, em que o código perdeu um dígito.

### TSE, planos de governo (`tse`)

- Arquivos públicos, sem chave (conferidos em 2026-10-26):
  - `cdn.tse.jus.br/estatistica/sead/odsele/proposta_governo/proposta_governo_<ano>_<UF>.zip`: um PDF por candidatura, `<UF>/<ano><UF><SQ_CANDIDATO>.pdf`;
  - `consulta_cand_<ano>.zip`: para achar a chapa eleita.
- Tarefa `plans`, uma por abrangência do piloto (`2022-DF`, governador; `2022-BR`, presidente):
  - acha o eleito e o vice da mesma coligação;
  - guarda o PDF oficial byte a byte no banco, com o hash;
  - extrai o texto de cada página (`pypdf`) e marca os temas por palavras fixas (`core.plan_themes`).
- Coleta mínima: do arquivo de candidatos só se leem número, nome de urna, cargo, partido, turno, situação e coligação. CPF, e-mail e título não são guardados. O ZIP bruto fica em `raw`, que o site não lê.
- Volume: cerca de 40 MB por carga, um arquivo por segundo.

### IBGE, municípios (`ibge`)

- API de localidades (`servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado`, conferida em 2026-10-26): os 5.571 municípios numa única resposta, sem chave.
- Tarefa única `municipalities`: grava cada município em `core.localities` com o código de 7 dígitos, a UF e `search_name` (nome sem acentos, em minúsculas) para a busca por cidade.
- Resposta com menos de 5.000 municípios é tratada como quebrada e não grava nada.

## Comandos

```bash
uv run --directory collectors cobra-collect sources          # fontes registradas
uv run --directory collectors cobra-collect enqueue <fonte>  # enfileira uma atualização completa
uv run --directory collectors cobra-collect work [--source X] [--max-jobs N]
uv run --directory collectors cobra-collect status           # última execução e tarefas por situação
```

## Como escrever um adaptador

1. Criar `collectors/src/cobra_collectors/sources/<fonte>.py` com uma classe que tenha `name` (um valor de `core.data_source`), `rate_per_second`, `burst`, `plan()` e `handle(ctx)`.
2. `plan()` devolve as tarefas de uma atualização completa (`JobSpec(kind, dedupe_key, payload)`).
3. `handle(ctx)` processa uma tarefa:
   - `ctx.fetch(url, params)` busca pelo limitador e pelas retentativas e já guarda o bruto;
   - normaliza;
   - `ctx.validate(condição, mensagem)` para cada regra; se falhar, nada da tarefa é publicado;
   - grava em `core` com `ctx.db` usando `insert … on conflict (source, source_id) do update`.
4. Registrar a fábrica em `sources/__init__.py` (`REGISTRY`).
5. Testar com respostas gravadas da fonte via `httpx.MockTransport` (os testes não acessam a internet). Veja `collectors/tests/db/example_source.py`.
