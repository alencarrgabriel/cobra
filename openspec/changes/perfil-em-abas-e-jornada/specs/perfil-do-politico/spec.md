# Spec Delta

## ADDED Requirements

### Requirement: Perfil em abas com endereço próprio
O perfil SHALL ser dividido em abas com endereço próprio (Resumo, Votos, Presença, Gastos, Emendas e obras, Trajetória, Patrimônio e campanha), na mesma ordem para todo político, com o mesmo cabeçalho em todas; cada aba SHALL funcionar sem JavaScript, marcar a aba atual e, sem dado para aquele político, mostrar "—" com o motivo.

#### Scenario: Abrir uma aba pelo endereço
- **WHEN** alguém abre `/politicos/<id>-<nome>/gastos`
- **THEN** vê o cabeçalho do político e a aba Gastos marcada como atual

#### Scenario: Endereço com nome antigo
- **WHEN** alguém abre uma aba com o nome desatualizado no endereço
- **THEN** é redirecionado para o endereço canônico da mesma aba

#### Scenario: Aba sem dado
- **WHEN** uma aba não tem dado para o político
- **THEN** a aba mostra "—" e explica o motivo

### Requirement: Resumo em números
A aba Resumo SHALL mostrar, em ordem fixa, os números principais do mandato (presença com a mediana da casa, votações com voto registrado, gastos no ano, emendas, patrimônio declarado), cada um com referência, fonte, data e link para a aba correspondente, e as 5 votações mais recentes.

#### Scenario: Número com referência
- **WHEN** alguém abre o Resumo de um deputado federal com presença coletada
- **THEN** vê a presença em destaque com a mediana da casa e o link para a aba Presença

### Requirement: Votos em linhas
Cada votação no perfil SHALL aparecer como uma linha com o voto do político em destaque (rótulo em texto e cor de voto, nunca cor de partido), a proposição com link, a ementa curta, o resultado e a data; o detalhe SHALL abrir sem sair da página.

#### Scenario: Linha de voto
- **WHEN** alguém vê as votações recentes de um político
- **THEN** cada linha mostra o voto em texto, a proposição e a data, e o detalhe abre ao tocar

### Requirement: Espaço reservado para o salário
A faixa de números do Resumo SHALL reservar o lugar do salário mensal; sem fonte coletada, SHALL mostrar "—" com o motivo, nunca zero.

#### Scenario: Salário ainda não coletado
- **WHEN** alguém abre o Resumo de um político sem salário coletado
- **THEN** a faixa mostra "—" e explica que o salário ainda não foi coletado
