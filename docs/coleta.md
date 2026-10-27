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
| Senado | 10 req/s | 8 req/s |
| Portal da Transparência | 400/min (06h–24h), 700/min (00h–06h) | 5 req/s |
| Câmara | não documentado (respostas trazem `Retry-After: 30`) | 2 req/s |
| TSE (arquivos) | — | 1 req/s |
| Obrasgov | não documentado | 2 req/s |

## Fontes ativas

### Obrasgov.br (`obrasgov`)

- API: `https://api-publica.obrasgov.gestao.gov.br/obras` (OpenAPI verificado em 2026-10-26), sem chave.
- Escopo: obras com UF principal DF (piloto). Tarefas: `projects` (páginas de 200 obras), `detail` (execução física e histórico de cada obra, criada quando a obra é publicada) e `geometry` (município de cada obra).
- A data da base (`/data-atualizacao`) vira `source_updated_at` de todas as linhas.
- Qualidade da fonte, tratada na normalização: coordenadas lidas do texto do ponto (os campos `latitude`/`longitude` da API às vezes vêm cortados) e descartadas fora do Brasil; eventos de paralisação repetidos guardados uma vez; fotos só indicadas (a API não traz as imagens).
- Volume no DF: cerca de 2.300 requisições por atualização completa, ~20 minutos a 2 req/s.

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
