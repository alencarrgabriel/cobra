# deputados-federais Specification

## Purpose
Define quais dados de deputados federais o Cobra guarda, de onde vêm (API de Dados Abertos da Câmara dos Deputados), como são atualizados e quais regras valem antes de publicar.

## Requirements

### Requirement: Deputados em exercício no cadastro
A coleta da Câmara SHALL registrar todos os deputados federais em exercício, de todas as UFs, cada um como político com nome civil, nome parlamentar, data de nascimento e endereço da foto oficial, ligado ao seu identificador da Câmara.

#### Scenario: Bancada do DF
- **WHEN** a coleta termina com a Câmara informando 8 deputados em exercício pelo DF
- **THEN** a consulta de mandatos abertos em exercício de deputado federal da UF 53 retorna esses 8 políticos

#### Scenario: Identificador da Câmara
- **WHEN** um deputado de identificador 73579 é coletado
- **THEN** a busca pelo identificador `73579` do sistema Câmara retorna o político correspondente

### Requirement: Mandato de deputado federal
Cada deputado em exercício SHALL ter um mandato de deputado federal na Câmara, pela UF que representa, com a legislatura, a data de início e a situação (titular, suplente ou licenciado) informadas pela Câmara.

#### Scenario: Titular desde o início da legislatura
- **WHEN** um deputado titular está em exercício desde o início da legislatura 57
- **THEN** o mandato registrado é da legislatura 57, começa em 01/02/2023, tem situação titular e não tem data de fim

#### Scenario: Suplente em exercício
- **WHEN** um suplente entra em exercício durante a legislatura
- **THEN** o mandato começa na data em que a Câmara registra a entrada em exercício e tem situação suplente

### Requirement: Licença e saída de exercício
Um titular que se licencia SHALL manter o mandato aberto com situação licenciado e SHALL voltar à situação titular quando reassume. Quando um suplente deixa o exercício, ou quando a Câmara informa o fim do mandato de um titular, a coleta SHALL encerrar o mandato com a data informada pela Câmara. Registros SHALL nunca ser apagados. A bancada atual de uma UF SHALL ser formada pelos mandatos abertos em exercício (titular ou suplente).

#### Scenario: Titular que se licencia
- **WHEN** um titular em exercício na coleta anterior aparece licenciado na Câmara
- **THEN** o mandato dele continua aberto, com situação licenciado, e ele sai da bancada atual da UF

#### Scenario: Titular que reassume
- **WHEN** um titular licenciado volta ao exercício
- **THEN** o mesmo mandato volta à situação titular

#### Scenario: Suplente que deixa o exercício
- **WHEN** um suplente em exercício na coleta anterior não está mais em exercício e a Câmara registra a saída numa data
- **THEN** o mandato dele passa a ter essa data de fim

### Requirement: Partido atual
A coleta SHALL registrar o partido de cada deputado em exercício (sigla e nome informados pela Câmara) e a filiação atual. Quando o deputado troca de partido, a filiação anterior SHALL ser encerrada e uma nova aberta.

#### Scenario: Troca de partido
- **WHEN** um deputado que estava no partido A aparece no partido B numa nova coleta
- **THEN** a filiação ao partido A fica encerrada e a filiação atual é a do partido B

### Requirement: CPF restrito
O CPF informado pela Câmara SHALL ser guardado apenas na área restrita do banco, e SHALL não aparecer em nenhuma tabela lida pelo site.

#### Scenario: CPF fora do esquema público
- **WHEN** um deputado com CPF é coletado
- **THEN** o CPF está em `restricted.politician_private_ids` e em nenhuma tabela do esquema `core`

### Requirement: Coleta idempotente e validada
Rodar a coleta de novo com os mesmos dados SHALL não criar registros novos. Um deputado com dados estruturais inválidos (sem identificador, UF desconhecida, nome vazio) SHALL não ser publicado, e o motivo SHALL ficar registrado na tarefa, sem impedir os demais.

#### Scenario: Segunda coleta igual
- **WHEN** a coleta roda duas vezes com as mesmas respostas da Câmara
- **THEN** a quantidade de políticos, mandatos, filiações e partidos é a mesma depois das duas

#### Scenario: UF desconhecida
- **WHEN** a Câmara informa um deputado com UF que não existe no cadastro
- **THEN** esse deputado não é publicado, a tarefa registra o motivo e os outros deputados são publicados

### Requirement: Respeito à fonte
A coleta da Câmara SHALL fazer no máximo 2 requisições por segundo, pedir 100 itens por página, guardar a resposta bruta antes de normalizar e repetir com espera crescente em respostas 429 e 503, respeitando `Retry-After`.

#### Scenario: Fonte pede para esperar
- **WHEN** a Câmara responde 429 com `Retry-After`
- **THEN** a coleta espera o tempo pedido antes de tentar de novo
