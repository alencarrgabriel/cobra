# Proposal

## Why

Todas as próximas changes de ingestão (Câmara, Senado, CLDF, Obrasgov, emendas, planos de governo do TSE) precisam das mesmas garantias do DDR: respeitar os limites de cada fonte, tentar de novo com espera crescente em HTTP 429/503, guardar a resposta bruta antes de normalizar, validar antes de publicar e registrar cada execução (§6.2, RNF-04, RNF-09, RNF-16, RNF-17). Construir isso uma vez, testado e isolado, evita que cada adaptador reinvente e erre essas regras.

## What Changes

- Esquema `raw` com a resposta bruta de cada requisição (metadados, corpo JSON ou texto e, para arquivos grandes como ZIP e PDF, o caminho e o hash do arquivo guardado em disco).
- Esquema `ops` com a fila de tarefas (`ops.jobs`) e o registro de execuções (`ops.runs`), operados só pelos coletores.
- Cliente HTTP dos coletores com limite de requisições por fonte, retentativa com espera exponencial e variação aleatória para 429, 502, 503, 504 e falhas de rede, respeitando o cabeçalho `Retry-After`, e identificação do Cobra no `User-Agent`.
- Fila no Postgres com `FOR UPDATE SKIP LOCKED`: tarefas com tentativas, próxima execução agendada e falha definitiva após o limite de tentativas.
- Interface de adaptador de fonte (planejar tarefas e processar uma tarefa) e o fluxo padrão: buscar → guardar bruto → normalizar → validar → publicar em `core`, tudo numa transação; se a validação falhar, nada é publicado.
- Comandos `cobra-collect enqueue <fonte>`, `cobra-collect work` e `cobra-collect status`.
- Uma fonte de exemplo só para testes, que exercita o fluxo inteiro sem rede.

Requisitos do DDR cobertos: RNF-04, RNF-09, RNF-16 (bruto guardado), RNF-17 (registro de execuções; base do RF-66), §6.2 (carga, fila, retentativas, camadas, validação).

Fora de escopo: qualquer fonte real (cada uma na sua change), agendamento no GitHub Actions (entra com a primeira fonte real), painel de saúde (`saude-integracoes`), armazenamento de arquivos em nuvem (por ora, disco local configurável).

## Capabilities

### New Capabilities

- `coleta-de-dados`: como o Cobra busca dados nas fontes oficiais: limites por fonte, retentativas, guarda do dado bruto, validação antes de publicar, fila de tarefas e registro de execuções.

### Modified Capabilities

- `acesso-ao-banco`: os novos esquemas `raw` e `ops` ficam restritos aos coletores; o site não lê nem escreve neles.

## Impact

- Nova migração em `supabase/migrations/`.
- Novos módulos em `collectors/src/cobra_collectors/` (`http`, `ratelimit`, `queue`, `raw`, `pipeline`, `sources`) e testes em `collectors/tests/`.
- Nova dependência: `httpx`. Nova variável opcional `RAW_DATA_DIR` (padrão `data/raw`, já ignorado pelo git).
