# Design

## Context

O banco já tem `core` (dados publicados) e `restricted`, com papéis `cobra_collector` e `cobra_web_reader` (change `modelo-dados-base`). Os coletores são um pacote Python (uv, psycopg 3, structlog, Typer) sem nenhuma fonte ainda. O DDR §6.2 define: carga em lote + sincronização incremental, fila no Postgres, controle de taxa por fonte, retentativa para 429/503, camadas bruto → normalizado → publicado e validação antes de publicar. Motivação: ver proposal.md.

## Goals / Non-Goals

**Goals:**
- Um único caminho, testado, para qualquer fonte buscar, guardar, validar e publicar.
- Nenhuma fonte real nesta change; uma fonte de exemplo prova o fluxo de ponta a ponta.

**Non-Goals:**
- Agendamento (cron), painel de saúde, alertas de falha, armazenamento em nuvem.
- Paralelismo entre processos além do garantido pela fila (um trabalhador por execução é suficiente no MVP).

## Decisions

### D1. Esquemas `raw` e `ops`
```
raw.responses   id, source, method, url, params jsonb, status_code, fetched_at,
                content_type, sha256, body_json jsonb, body_text text,
                file_path text, file_size bigint, job_id
ops.jobs        id, source, kind, payload jsonb, status (queued|running|done|failed),
                attempts, max_attempts, run_after, locked_at, last_error,
                created_at, updated_at, unique (source, kind, dedupe_key) where status in (queued, running)
ops.runs        id, source, started_at, finished_at, status (running|ok|partial|failed),
                jobs_done, jobs_failed, notes
```
- `raw` e `ops` não seguem a convenção de rastreabilidade de `core` (são a própria rastreabilidade e operação). O teste de metadados continua cobrindo só `core` e `restricted`.
- Privilégios: `cobra_collector` com uso e escrita; `cobra_web_reader` sem nenhum acesso. A change `saude-integracoes` pode liberar leitura de `ops.runs` depois.
- `dedupe_key` evita enfileirar duas vezes a mesma tarefa pendente (ex.: mesma página da mesma consulta).

### D2. Arquivos grandes em disco, metadados no banco
ZIPs e PDFs vão para `RAW_DATA_DIR/<fonte>/<aaaa>/<mm>/<sha256>.<ext>` (padrão `data/raw`, ignorado pelo git), gravados por escrita atômica (arquivo temporário + renomear). O banco guarda caminho, tamanho e SHA-256. Mesmo hash = mesmo arquivo, sem duplicar.
- Alternativa: `bytea` no Postgres. Rejeitada: ZIPs do TSE têm dezenas de MB e incham backups.
- Alternativa: Supabase Storage. Adiada: entra quando houver deploy; a interface de armazenamento fica isolada para trocar depois.

### D3. Limite de taxa: balde de fichas por fonte
`RateLimiter(rate_per_second, burst)` com relógio e `sleep` injetáveis (testes determinísticos). Limites iniciais, conservadores e configuráveis por fonte no adaptador:

| Fonte | Limite oficial | Limite usado |
|---|---|---|
| Senado | 10 req/s (DDR) | 8 req/s |
| Portal da Transparência | 400/min (06h–24h), 700/min (00h–06h) | 5 req/s |
| Câmara | não documentado (anexo do DDR) | 4 req/s |
| TSE (arquivos) | — | 1 req/s |
| Obrasgov | não documentado | 2 req/s |

Os valores reais de cada fonte são confirmados na change da fonte, contra a documentação oficial.

### D4. Cliente HTTP com retentativa
`httpx.Client` com timeout, `User-Agent: Cobra/<versão> (+https://github.com/<repo>)`, e retentativa para 429, 502, 503, 504, timeouts e erros de conexão: espera `min(cap, base · 2^tentativa) + variação aleatória`, ou `Retry-After` se maior. Outros 4xx não são repetidos. Cada resposta final (inclusive erro) é guardada em `raw.responses` pelo `RawStore`.
- Alternativa: biblioteca de retentativa (tenacity). Rejeitada: a regra é pequena e precisa conhecer `Retry-After` e o limitador.

### D5. Fila no Postgres
- `enqueue(source, kind, payload, dedupe_key)`: `insert … on conflict do nothing`.
- `claim(source=None)`: `update ops.jobs set status='running', locked_at=now(), attempts=attempts+1 where id = (select id from ops.jobs where status='queued' and run_after <= now() [and source=…] order by run_after for update skip locked limit 1) returning *`.
- `complete(id)` e `fail(id, error)`: na falha, se `attempts < max_attempts`, volta a `queued` com `run_after = now() + base·2^attempts`; senão, `failed`.
- Tarefas `running` há mais de 30 min (processo morto) voltam à fila no início de cada `work`.

### D6. Adaptador e pipeline
```python
class Source(Protocol):
    name: str                      # = core.data_source
    rate_per_second: float
    def plan(self, ctx) -> Iterable[JobSpec]: ...
    def handle(self, job, ctx) -> None: ...   # usa ctx.http, ctx.raw, ctx.db (transação)
```
`run_job` abre a transação, chama `handle`; o adaptador busca (o bruto é gravado numa conexão separada, em autocommit, para nunca se perder com o rollback), normaliza, chama `ctx.validate(...)` e grava em `core`. Qualquer `ValidationError` ou exceção faz rollback e `fail` da tarefa.
- Registro de fontes: dicionário `nome → fábrica` em `sources/__init__.py`; `cobra-collect sources` lista os nomes.

### D7. Comandos
- `cobra-collect enqueue <fonte>`: chama `plan` e enfileira.
- `cobra-collect work [--source X] [--max-jobs N]`: abre um `ops.runs`, processa até esvaziar ou atingir N, fecha a execução com as contagens.
- `cobra-collect status`: por fonte, última execução e contagem de tarefas por situação.

### D8. Testes
- Sem rede: `httpx.MockTransport` para o cliente; relógio falso para o limitador.
- Banco: fila (enfileirar, deduplicar, `SKIP LOCKED` com duas conexões, reagendamento, falha definitiva, recuperação de travadas), `RawStore`, pipeline completo com a fonte de exemplo (sucesso publica; validação reprovada não publica e guarda o bruto), privilégios dos esquemas novos.

## Risks / Trade-offs

- [Disco local some num ambiente efêmero (GitHub Actions)] → Na primeira fonte real, o agendamento decide: artefato do workflow ou Supabase Storage. A interface `FileStore` isola a troca.
- [Limites conservadores deixam a carga inicial lenta] → Carga inicial usa os arquivos em lote das fontes (DDR §6.2), não a API.
- [Bruto gravado fora da transação pode deixar resposta sem dado publicado] → É o comportamento desejado: o bruto documenta o que a fonte respondeu, mesmo quando a validação reprova.

## Migration Plan

Migração nova, sem dados. Rollback: migração corretiva removendo `raw` e `ops`.
