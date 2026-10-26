# Tasks

## 1. Banco

- [x] 1.1 Migração com esquemas `raw` e `ops`, tabelas `raw.responses`, `ops.jobs` e `ops.runs` e privilégios só para `cobra_collector`; testes de banco: coletor grava, site é negado em `raw` e `ops`, migração aplica com `pnpm db:reset`

## 2. Peças básicas

- [x] 2.1 `RateLimiter` (balde de fichas, relógio e espera injetáveis); testes com relógio falso: nunca passa do limite numa janela de 1 s e respeita o `burst`
- [x] 2.2 `HttpClient` com `httpx`, `User-Agent` do Cobra, retentativa exponencial com variação para 429/502/503/504 e erros de rede, `Retry-After`, sem repetir outros 4xx; testes com `MockTransport` cobrindo os cenários da spec
- [x] 2.3 `RawStore` (resposta JSON ou texto no banco; arquivo grande em `RAW_DATA_DIR` com escrita atômica, tamanho e SHA-256; sem duplicar o mesmo hash) e `RAW_DATA_DIR` nas configurações e no `.env.example`; testes de banco e de disco em diretório temporário

## 3. Fila e pipeline

- [x] 3.1 Fila `enqueue` / `claim` / `complete` / `fail` / recuperar travadas, com deduplicação; testes de banco incluindo `SKIP LOCKED` com duas conexões, reagendamento e falha definitiva
- [x] 3.2 Interface `Source`, registro de fontes, contexto e `run_job` (transação, validação, rollback, bruto preservado) com a fonte de exemplo de testes; testes: sucesso publica em `core`, validação reprovada não publica e mantém o bruto e o erro
- [x] 3.3 Registro de execuções em `ops.runs` e comandos `enqueue`, `work` e `status` no CLI; testes com o runner do Typer e a fonte de exemplo

## 4. Integração final

- [x] 4.1 Documentar em `docs/coleta.md` (camadas, fila, limites por fonte, como escrever um adaptador); rodar `pnpm check` e `pnpm check:secrets`

## Workflow follow-up

- Revisar e arquivar a change.
