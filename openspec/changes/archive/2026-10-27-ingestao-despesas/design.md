# Design

## Context

- Câmara, `Ano-<ano>.csv.zip` (2026: 4,4 MB zipado, 45 MB): colunas `txNomeParlamentar`, `cpf`, `ideCadastro` (id do deputado na API; vazio para lideranças), `sgUF`, `sgPartido`, `txtDescricao` (tipo de despesa), `txtFornecedor`, `txtCNPJCPF`, `datEmissao`, `vlrDocumento`, `vlrGlosa`, `vlrLiquido` (pode ser negativo: 565 linhas em 2026, estornos), `numMes`, `numAno`, `txtPassageiro`, `txtTrecho`, `ideDocumento`, `urlDocumento`.
- Senado, API administrativa de dados abertos (JSON, 2026: 10 MB): `id`, `ano`, `mes`, `codSenador`, `nomeSenador`, `tipoDespesa`, `cpfCnpj`, `fornecedor`, `documento`, `data`, `detalhamento`, `valorReembolsado`. O CSV do portal de transparência não tem o código do senador, por isso a API.

## Decisions

### D1. Jobs
- `expenses` por ano, de 2023 ao ano corrente, em `camara` (um ZIP, em streaming) e em `senado` (um pedido JSON). O ano é regravado inteiro (apaga e insere com `COPY`).
- Só linhas com id do parlamentar (`ideCadastro` / `codSenador`); lideranças e linhas sem id ficam fora.

### D2. Tabela `core.expenses`
- `house`, `external_id`, `politician_id` (nulo fora do cadastro), `year`, `month`, `category` (como a casa escreve), `supplier_kind` (`empresa`, `pessoa_fisica`, `nao_informado`), `supplier_name` e `supplier_cnpj` (só empresa), `issued_on`, `value` (líquido, como a fonte informa, inclusive negativo), `document_url`. `source_id` = id do documento na casa.
- Documento com 11 dígitos é CPF → `pessoa_fisica`, sem nome nem documento. Com 14 dígitos → `empresa`. Outro tamanho → `nao_informado`, com o nome (não é CPF).
- `txtPassageiro`, `txtTrecho`, `detalhamento` e o CPF do parlamentar não são lidos.

### D3. Validação
- Ano com despesas precisa ter ao menos 50 parlamentares diferentes (Câmara) ou 30 (Senado); valor ilegível falha o job.

### D4. Perfil
- "Gastos da cota parlamentar": para cada um dos três anos mais recentes com despesa, o total e o valor por tipo de despesa, do maior para o menor (é a composição do próprio gasto, não um ranking entre pessoas), com "inclui estornos informados pela casa" quando houver valor negativo.
- Link para a página oficial de gastos do parlamentar e fonte com data de coleta.
- Distrital: "—" e "a Câmara Legislativa não publica a cota em dados abertos no Cobra ainda".

### D5. Testes
- Modelos: tipo de fornecedor, CPF nunca guardado, passageiro ignorado, lideranças fora, valores com vírgula e negativos.
- Banco: jobs gravam e regravam sem duplicar; nenhuma linha guarda CPF ou nome de passageiro.
- Site: seção com seed (Playwright).
