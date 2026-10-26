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
| Câmara | não documentado | 4 req/s |
| TSE (arquivos) | — | 1 req/s |
| Obrasgov | não documentado | 2 req/s |

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
