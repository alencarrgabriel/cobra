# Design

## Context

Arquivos do TSE conferidos em 2026-10-26, públicos e sem chave:
- `https://cdn.tse.jus.br/estatistica/sead/odsele/proposta_governo/proposta_governo_2022_DF.zip` (19 MB) e `..._2022_BR.zip` (16 MB, presidente).
  - Um PDF por candidatura, chamado `<UF>/2022<UF><SQ_CANDIDATO>.pdf`, mais um `leiame.pdf`.
  - O do DF tem 12 planos de governador; o do BR, 13 de presidente.
- `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2022.zip` (4,4 MB): um CSV por UF (`consulta_cand_2022_<UF>.csv`, Latin-1, `;`), com `SQ_CANDIDATO`, `NM_URNA_CANDIDATO`, `DS_CARGO`, `SG_PARTIDO`, `NR_TURNO`, `DS_SIT_TOT_TURNO` ("ELEITO") e `SQ_COLIGACAO`.
  - Traz também CPF, e-mail e título de eleitor, que não guardamos.
- Eleitos em 2022:
  - governador do DF: IBANEIS ROCHA (MDB), SQ 70001651044, plano `DF/2022DF70001651044.pdf` (753 KB);
  - presidente: LULA (PT), SQ 280001607829, eleito no 2º turno, plano `BR/2022BR280001607829.pdf` (276 KB).
- O vice está no mesmo arquivo, com `DS_CARGO` "VICE-GOVERNADOR" ou "VICE-PRESIDENTE" e o mesmo `SQ_COLIGACAO`.

## Goals / Non-Goals

**Goals:** planos das chapas eleitas para presidente e governador do DF, documento intacto, texto por página, temas e busca.

**Non-Goals:** outros governadores, prefeitos, comparador, resumos, tela.

## Decisions

### D1. Adaptador `tse` (módulo `tse_planos.py`)
- Tarefa `plans` (dedupe `<ano>-<abrangência>`, por exemplo `2022-DF` e `2022-BR`). O `plan()` enfileira as duas do piloto.
- Para cada uma:
  - baixa o arquivo de candidatos (uma vez por ano, em memória durante a tarefa);
  - acha o titular eleito do cargo e o vice da mesma coligação;
  - baixa o ZIP de planos e tira o PDF do eleito.
- Guarda os dois ZIPs inteiros como bruto. Limite: 1 req/s.
- Fonte `tse` (já existe em `core.data_source`).

### D2. Tabelas
- `core.government_plans`:
  - `election_year`, `office` (`presidente` ou `governador`), `uf_code` (`53`; nulo para presidente);
  - `holder_name` e `running_mate_name` (nomes de urna), `party`;
  - `tse_candidate_id` (`SQ_CANDIDATO`);
  - `pdf` (`bytea`), `pdf_sha256`, `pdf_pages`;
  - `source = 'tse'`, `source_id` = `<ano>-<cargo>-<uf ou BR>`, `source_url` = endereço do ZIP;
  - única por (`election_year`, `office`, `uf_code`).
- `core.government_plan_pages`: `plan_id`, `page` (a partir de 1), `text`, `has_text`, `search` (`tsvector` gerado com a configuração `portuguese`, com índice GIN).
- `core.plan_page_themes`: `plan_id`, `page`, `theme`, `hits`.
- `core.plan_themes`: tabela fixa com `slug`, `label`, `work_types` (lista das áreas de obra do Obrasgov) e `keywords`. É carregada na migração e revisável em migração nova.

### D3. Por que o PDF no banco
- O site só lê o banco próprio (RNF-04) e precisa abrir a página exata do PDF oficial (RF-80).
- Guardar o PDF no banco evita sincronizar arquivos entre coletor e site.
- O volume é pequeno: dois PDFs hoje, uns 30 com todos os governadores.
- A rota do site que serve o PDF entra com a change `plano-de-governo`, com cache longo, porque o hash não muda.

### D4. Texto e temas
- `pypdf` 6.20.1 (BSD, publicada em 12/10), `extract_text()` por página, com espaços normalizados.
- Página com menos de 20 caracteres de texto: `has_text = false` (pode ser só imagem). Não há OCR nesta change.
- Tema por página: contagem das palavras do tema no texto normalizado (sem acentos, minúsculas). A página recebe o tema com 2 ocorrências ou mais. É uma regra fixa, testável e sem IA.
- Temas e áreas de obra:
  - saúde → "Saúde";
  - educação → "Educação";
  - segurança → "Segurança Pública", "Defesa Civil";
  - mobilidade → "Infraestrutura Urbana e Mobilidade", "Rodovia", "Aviação Civil";
  - água e saneamento → "Infraestrutura Hídrica, Portos, Hidrovia";
  - assistência social → "Assistência Social", "Previdência Social";
  - cultura → "Cultura";
  - esporte → "Esporte";
  - meio ambiente → "Meio Ambiente";
  - economia e emprego → "Desenvolvimento", "Trabalho e Emprego", "Indústria, Serviços e Comércio Exterior", "Agricultura e Organização Agrária", "Energia";
  - moradia → nenhuma área de obra.

### D5. Coleta mínima
O CSV de candidatos é lido em memória. Só seguem `SQ_CANDIDATO`, nome de urna, cargo, partido, turno, situação e coligação. O bruto do ZIP fica no armazenamento restrito (`raw`), que o site não lê.

### D6. Testes
- PDF de teste pequeno gerado no próprio teste (com `pypdf`), com páginas de saúde, educação e uma sem texto.
- CSV de candidatos reduzido com linhas reais (sem CPF, e-mail e título: colunas apagadas na amostra).
- Sem banco: extração, temas, escolha do eleito e do vice.
- Com banco:
  - carga e segunda carga igual;
  - hash conferido;
  - busca em português ("escola" acha "escolas");
  - nenhum CPF guardado;
  - plano de não eleito ignorado.

## Risks / Trade-offs

- [PDF escaneado sem texto] → `has_text = false` e a página aparece sem tema. O PDF continua disponível. OCR fica para depois, se precisar.
- [Palavra de tema em contexto diferente] → Limiar de 2 ocorrências; a tela mostra o trecho literal, e o cidadão lê.
- [Vice que assume o governo] → O plano é da chapa e continua sendo o vigente.

## Migration Plan

Migração nova com as quatro tabelas e os temas. Primeira carga pela CLI: `enqueue tse`.
