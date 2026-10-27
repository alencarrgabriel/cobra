# Ingestão de presença

## Why

O perfil mostra "Presença nas sessões — ainda não está no Cobra". O DDR pede, no resumo do perfil, a presença com a mediana da casa como referência (RF-33) e, na fase 2, eventos de faltas em sequência (RF-16). As duas casas publicam isso de formas diferentes, e o Cobra mostra cada uma com o nome certo, sem misturar.

## What Changes

- **Câmara — presença nas sessões deliberativas do Plenário**, pelos arquivos anuais de dados abertos (`eventos`, `eventosOrgaos`, `eventosPresencaDeputados`, de 2023 em diante): cada sessão deliberativa encerrada do Plenário e os deputados com presença registrada.
- **Senado — comparecimento às votações nominais do Plenário**, a partir dos votos já coletados (`ingestao-senado-votacoes`), que registram presença, ausência e o motivo. O Senado não publica presença por sessão em dados abertos (OpenAPI conferida em 2026-10-27), então o Cobra não chama isso de "presença em sessão".
- **Perfil**, por ano desde 2023:
  - deputado: "Presente em X de Y sessões deliberativas do Plenário realizadas durante o mandato", com a mediana dos deputados no mesmo ano;
  - senador: "Compareceu a X de Y votações nominais do Plenário", com as ausências por motivo como o Senado informa e a mediana dos senadores;
  - distrital: "—" com o motivo.
  - Aviso: períodos de licença não são descontados na Câmara (o arquivo não os informa).

## Fora de escopo

- Eventos de faltas em sequência (RF-16, fase 2) e presença em comissões.
- Justificativas de ausência na Câmara (não estão nos arquivos).

## Capabilities

### New Capabilities
- `presenca`: presença nas sessões da Câmara, comparecimento às votações do Senado e a seção do perfil.

### Modified Capabilities
- `perfil-do-politico`: presença sai da lista do que ainda não está no Cobra.

## Impact

- Migração `core.sessions` e `core.session_attendance`.
- `collectors`: job `attendance` no adaptador `camara`; testes.
- `web`: consultas (com mediana) e seção no perfil; seed e testes.
