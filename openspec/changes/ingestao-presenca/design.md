# Design

## Context

Arquivos anuais da Câmara (conferidos em 2026-10-27, UTF-8 com BOM, `;`): `eventos-<ano>.csv` (`id`, `dataHoraInicio`, `situacao`, `descricaoTipo`; 2025: 3.225 eventos), `eventosOrgaos-<ano>.csv` (`idEvento`, `siglaOrgao`) e `eventosPresencaDeputados-<ano>.csv` (`idEvento`, `idDeputado`; 2023: 17 MB). Em 2025 o Plenário teve 121 sessões deliberativas (`descricaoTipo = Sessão Deliberativa`), 169 solenes e 9 canceladas. O Senado não tem endpoint de presença (só `tiposComparecimento`); os votos nominais trazem presença e ausência com motivo.

## Decisions

### D1. Sessões da Câmara
- Job `attendance` por ano (2023 ao corrente) em `camara`: três arquivos em streaming.
- Guarda só eventos do Plenário (`siglaOrgao = PLEN`) com `descricaoTipo = Sessão Deliberativa` e `situacao` começando por "Encerrada"; solenes, canceladas e comissões ficam fora.
- `core.sessions` (casa, data, `source_id` = id do evento) e `core.session_attendance` (sessão, id do deputado, `politician_id`). O ano é regravado inteiro.
- Validação: ano com sessões precisa ter presença registrada em ao menos 90% delas.

### D2. Denominador
- Sessões realizadas enquanto o deputado tinha mandato aberto naquela data, pelos mandatos de `core.mandates` (início e fim). Licenças não são descontadas: o aviso aparece na tela.

### D3. Senado
- Sem coleta nova. Comparecimento = votos nominais do ano com opção `sim`, `nao`, `abstencao`, `obstrucao`, `presidente` ou `presente_sem_voto`, sobre todas as linhas de voto do senador no ano; ausências contadas por `option_detail`.

### D4. Mediana
- Por casa e ano, mediana da mesma razão entre os parlamentares com ao menos 10 sessões (Câmara) ou 10 votações (Senado) no denominador. Mostrada como referência ("mediana dos deputados: 92%"), sem ranking nem posição.

### D5. Perfil
- Seção "Presença" com uma linha por ano, do mais recente: contagens absolutas primeiro, porcentagem depois, e a mediana.
- Textos fixos e fonte de cada casa.

### D6. Testes
- Modelo da Câmara: filtro de sessões, leitura de presença. Banco: job grava e regrava.
- Site: cálculo da mediana (Vitest) e seção com seed (Playwright).
