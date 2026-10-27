# Design

## Context

Adaptadores da Câmara e do Senado prontos, com as tabelas do cadastro e a regra de identidade por nome civil e data de nascimento (`senado_model.normalize_name`).

Fontes conferidas em 2026-10-26:
- Portal de dados abertos da CLDF (`dados.cl.df.gov.br`, CKAN). Cinco conjuntos com "deputados": remuneração, relação nominal de deputados e servidores (CSV mensal), tabelas de remuneração, diárias e proposições. Nenhum traz partido nem é uma lista só de deputados. A relação nominal tem 2.429 linhas, das quais 24 são deputados em exercício, e o resto são servidores.
- Site oficial (`www.cl.df.gov.br`, Liferay). `/deputados` redireciona para `/deputados-2023-2026`, cujo bloco "Legislatura Atual" tem 24 cartões: link do perfil, foto, nome parlamentar e partido por extenso, às vezes com a sigla entre parênteses. Cada perfil traz "Nome completo:", "Nascimento: dd/mm/aaaa" e "Partido político:".
- `robots.txt` só bloqueia `/web/guest/search`.
- O partido no site pode estar desatualizado: Jorge Vianna aparece como "Democrata", partido extinto em 2022.

## Goals / Non-Goals

**Goals:** os 24 distritais com nome, nascimento, foto e partido confiável; identidade única; leitura robusta e que falha sem estragar dados.

**Non-Goals:** titular ou suplente, data de posse, proposições, votações, despesas da CLDF, CPF.

## Decisions

### D1. Tarefas
- `cldf/list` (dedupe `run`): busca `/deputados-2023-2026` e lê o bloco "Legislatura Atual".
  - Valida a lista inteira (D4) antes de qualquer escrita.
  - Enfileira um `cldf/deputy` por deputado, com nome, partido, foto e endereço do perfil no payload.
  - Encerra os mandatos abertos de quem não está na lista (D5).
- `cldf/deputy` (dedupe = identificador): busca o perfil, lê nome completo, nascimento e partido, e publica numa transação.
- Limite: 1 req/s, rajada 1. São 25 requisições por carga.

### D2. Leitura do HTML (`cldf_model.py`)
- Biblioteca padrão (`html.parser` e expressões regulares), sem dependência nova.
- Lista:
  - o bloco começa no título "Legislatura Atual" e termina no próximo portlet;
  - cada cartão vira (href, foto, `card-title`, `card-text`);
  - o ano da legislatura vem do endereço da página (`deputados-2023-2026` → 2023 a 2026).
- Perfil: o texto sem tags é lido pelos rótulos "Nome completo:", "Nascimento:" e "Partido político:", cada um até o próximo rótulo conhecido.
- Identificador da CLDF: o último trecho do endereço do perfil (`chico-vigilante-2019-2022`, `doutora-jane`). É o único identificador estável que o site expõe.

### D3. Partido
- Sigla entre parênteses no fim ("Partido dos Trabalhadores (PT)" → PT), exceto quando repete o nome ("Podemos (Podemos)").
- Sem sigla, tabela fixa de nomes por extenso dos partidos atuais. Por exemplo: "Republicanos" → REPUBLICANOS, "União Brasil" → UNIÃO, "Podemos" → PODE, "Partido Liberal" → PL.
- Partido extinto ("Democrata", "Democratas", "PSL") ou nome desconhecido: sem filiação atual, aviso no log com o texto recebido. Uma filiação aberta anterior da CLDF é encerrada, porque o partido dela também não é mais confiável.
- O partido precisa já existir no banco (vindo da Câmara ou do Senado), procurado pela sigla. Se não existir, é criado com o nome por extenso informado pela CLDF.
- A filiação é aberta sem data de início (a CLDF não informa) e encerrada na data da coleta quando o partido muda.
- Se o político foi ligado a outra fonte que já tem filiação aberta, a CLDF não grava filiação (mesma regra do Senado).

### D4. Validação da lista
- Pelo menos 20 cartões, cada um com nome, partido não vazio e endereço de perfil, e sem identificadores repetidos. Senão, a tarefa falha com o motivo e nada é escrito ou enfileirado.
- No perfil, nome completo e nascimento são obrigatórios. Sem eles, só aquele deputado não é publicado.

### D5. Mandato e saída
- Início: 1º de janeiro do primeiro ano da legislatura (a legislatura distrital começa em 1º de janeiro).
- `legislature` = primeiro ano da legislatura (2023), porque a CLDF não numera legislaturas de forma estável no site.
- Situação: `titular` enquanto o deputado está na lista.
- `source_id` do mandato: `<identificador>-<ano inicial>`.
- Quem não está na lista: o mandato é encerrado na data da coleta, e o log registra que a data é aproximada. O site não informa saídas.

### D6. Identidade única
Mesma regra do Senado: identificador da CLDF; senão nome civil normalizado mais data de nascimento, com exatamente um político de outra fonte; senão um político novo.

### D7. Testes
- Páginas reais gravadas: lista da legislatura e os perfis de Chico Vigilante (partido com sigla), Jorge Vianna (partido extinto), Doutora Jane (sem sigla) e Roberio Negreiros ("Podemos (Podemos)"). Os outros 20 perfis são gerados no teste a partir de um molde, para a carga completa.
- Testes sem banco: leitura da lista, do perfil e dos partidos.
- Testes com banco:
  - carga completa e segunda carga igual;
  - partido extinto;
  - página que mudou de formato;
  - deputado que saiu da lista;
  - ligação com político da Câmara.

## Risks / Trade-offs

- [O site muda de formato] → Validação D4 faz a coleta falhar sem apagar nada; o teste com página real mostra o que mudou.
- [Partido desatualizado no site] → Partido extinto fica de fora em vez de aparecer errado. O TSE (filiados) e a janela partidária podem confirmar em change futura.
- [Identificador tirado do endereço muda numa nova legislatura] → A ligação por nome civil e data de nascimento evita criar outro político.
- [Suplente aparece como titular] → Limitação declarada; `ingestao-tse` corrige com os eleitos de 2022.

## Migration Plan

Sem migração. Primeira carga manual pela CLI, conferida contra o site (24 deputados).
