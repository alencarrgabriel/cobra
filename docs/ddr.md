# Cobra — Documento de Definição de Requisitos (DDR)

> Convertido de `Cobra — Documento de Definição de Requisitos (DDR).docx` em 2026-10-20. Este arquivo passa a ser a fonte da verdade; os diagramas foram transcritos em texto.
>
> **Versão 4.0 (2026-10-28).** Escopo ampliado por decisão do responsável: o Cobra passa a cobrir tudo o que o Politicômetro oferece, com identidade, código e textos próprios. Entram, a partir da fase 2: todos os eleitos do país, de vereador a presidente, com perfil básico pelo TSE; "Me representa" com todos os níveis de governo da cidade; salário (subsídio e remuneração oficiais) nos perfis; Executivo (presidente, governadores, prefeitos e ministros); STF; arrecadação de impostos com fonte oficial (no lugar do placar estimado do Impostômetro); comparador de políticos sem ranking; planos de governo lado a lado; e canal no WhatsApp. Obras, emendas e planos de quem governa continuam como diferencial. A regra de neutralidade (§9) não muda, e o comparador de planos de candidatos durante a campanha continua dependendo de parecer jurídico.
>
> **Versão 3.0 (2026-10-26).** Mudança de foco: com o Politicômetro (no ar desde 22/10/2026, cobrindo 70 mil eleitos) e o Apuração Brasil já entregando perfis e votações, o Cobra passa a se concentrar em **"dinheiro e promessas na sua cidade"**: obras com recurso federal, emendas e de onde veio cada real, e os planos de governo de quem governa. Obras e emendas entram no MVP; o perfil de parlamentar fica mais enxuto e ganha trajetória eleitoral, patrimônio por composição e perguntas frequentes. Planos de governo entram no MVP (presidente e governadores em exercício); o comparador de candidatos fica para 2028, depois de parecer jurídico.
>
> **Versão 2.2 (2026-10-26).** Perfil completo detalhado por seções e módulo de obras revisto com a API pública do Obrasgov verificada: resumo da cidade, mapa com pinos já na fase 2, filtros e card de obra.
>
> **Versão 2.1 (2026-10-26).** Compartilhamento como motor de crescimento: cards em formatos de redes, painel de compartilhar com WhatsApp em destaque, prévia de link e links que reproduzem o que a pessoa viu.
>
> **Versão 2 (2026-10-26).** Decisões incorporadas após pesquisa de referências e concorrentes: identidade visual inspirada no seuimposto.com (Pandora), cores e marcas de partido como identificação, jornada "CEP → grade de representantes → gaveta", módulo de economia e educação na fase 2, Ibovespa só na fase 3 e sem cotação de ações individuais, Apuração Brasil como concorrente direto. O histórico está no fim do documento.

## 1. Visão geral do produto e objetivos estratégicos

O Cobra (nome provisório) é uma plataforma cívica que mostra a qualquer brasileiro, a partir de onde ele mora, o que fazem os políticos que o representam: como votam, o que propõem, quanto gastam e que obras financiam. O princípio que guia todas as decisões é mostrar fatos, nunca notas, rankings ou opinião.

**Foco (versão 4.0): cobertura completa, com dinheiro e promessas na sua cidade como diferencial.** O Cobra cobre todos os eleitos e os Três Poderes no nível federal, como o Politicômetro, e mantém no centro o que chega ao lugar onde a pessoa mora: as obras pagas com dinheiro federal, as emendas que as financiaram e quem as indicou, e o que quem governa prometeu no plano de governo registrado no TSE. Funcionalidades inspiradas em outras iniciativas são reimplementadas com dados oficiais próprios, sem copiar código, textos, imagens ou marca (§13).

Problema. Os dados sobre a atuação de políticos são públicos, mas estão espalhados em portais técnicos (Câmara, Senado, TSE, Portal da Transparência, Obrasgov) que poucos cidadãos conseguem usar. As iniciativas existentes cobrem quase só o Congresso, exigem que o usuário vá até elas e, em vários casos, embutem critérios próprios de avaliação.

Proposta de valor.

- Pessoal: o usuário informa o CEP, a cidade ou o estado e vê "seus representantes", não uma lista de 594 parlamentares.

- Visual: cada representante aparece com foto, bandeira do estado e cor e sigla do partido; mapa clicável, cards e números grandes, no padrão visual dos produtos de dados mais acessados no período eleitoral de 2026.

- Compreensível: votações e projetos explicados em linguagem simples, com o voto de cada representante.

- Concreto: emendas parlamentares ligadas às obras da cidade do usuário, com valor, prazo e situação.

- Ativo: o produto vai até o usuário com alertas semanais por e-mail e WhatsApp.

- Educativo: explica como funcionam o Legislativo e a economia (juros, inflação, impostos, bolsa) e liga cada indicador às votações sobre o tema, sem atribuir causa (fase 2).

- Neutro: útil para eleitores de qualquer posição política.

Objetivos estratégicos.

- Validar, com um piloto no Distrito Federal, que cidadãos comuns usam e voltam a uma ferramenta de acompanhamento de mandatos.

- Construir uma base de dados própria e confiável, integrando fontes federais e subnacionais.

- Ser reconhecido como fonte neutra, citável por imprensa, escolas e organizações de qualquer espectro.

- Expandir a cobertura para todos os estados e, progressivamente, para municípios.

- Garantir sustentabilidade financeira sem depender de partidos, candidatos ou governos.

Diferenciais frente às iniciativas existentes.

| Iniciativa | Foco | O que o Cobra faz diferente |
|---|---|---|
| Apuração Brasil (apuracaobrasil.com) — **concorrente direto** | Portal de transparência do Congresso: presença, votos, cota, emendas por cidade, alertas por e-mail, app e planos pagos | Busca por CEP com grade visual de "seus representantes"; votações explicadas em linguagem simples (não só a ementa); cobertura distrital e depois subnacional; sem ranking de presença; economia explicada |
| seuimposto.com (Pandora) — referência visual | Apuração ao vivo das eleições 2026: mapa clicável, gaveta lateral, fotos e barras de placar | Mesmo nível visual, aplicado ao acompanhamento do mandato o ano todo, não só no dia da eleição |
| Politicômetro (politicometro.org) — **concorrente direto mais amplo** | No ar desde 22/10/2026: 70.817 eleitos (de vereador a presidente), "Me representa" por cidade, perfis com salário, cota, presença e votos, Congresso, STF, governos, Impostômetro, comparador sem ranking, planos de governo lado a lado, canal no WhatsApp; também se declara sem nota nem ranking | Obras e emendas por cidade, com mapa, situação e vínculo emenda–obra; plano de governo de quem governa ao lado das obras da mesma área; visual centrado em mapa e celular; votações explicadas com revisão humana |
| Sólon (solondata.com) | Plataforma paga para analistas: trajetória eleitoral, mapa do voto, patrimônio por composição, uso da cota com faixa de referência, emendas, redes sociais, dossiê; usa índices próprios (aproveitamento, retribuição eleitoral) | Gratuito e aberto; sem índices próprios; foco no cidadão |
| Excelências (Transparência Brasil) | Perfis de congressistas, processos e patrimônio | Em 2026-10-26 o domínio exibia conteúdo sem relação com o projeto; aparenta estar desativado |
| Radar do Congresso (Congresso em Foco) | Grade de fotos com a bandeira do estado, dados do Congresso e índices de governismo e transparência | Sem índices próprios; linguagem simples; cobertura subnacional |
| Placar Congresso | Histórico de votações, idealizado por um deputado, com foco na posição em relação ao governo | Iniciativa apartidária, sem enquadramento governo × oposição como eixo |
| Ranking dos Políticos | Notas e ranking por critérios declarados do grupo | Nenhuma nota ou ranking |
| Quem Me Representa (UFCG) | Afinidade entre eleitor e deputado antes do voto | Acompanhamento do mandato depois da eleição |
| Operação Serenata de Amor | Gastos suspeitos da cota parlamentar | Gastos como parte de um perfil completo |
| Sites da Câmara e do Senado | Dados oficiais completos | Curadoria, explicação e foco no cidadão |

## 2. Público-alvo, personas e jornadas do usuário

O público principal é o eleitor comum, que usa o celular, não acompanha o noticiário político de perto e quer saber, em poucos minutos, se seus representantes estão fazendo o que prometeram. Públicos secundários (imprensa, professores, organizações) usam os mesmos dados com mais profundidade.

Personas.

| Persona | Perfil | Necessidade principal | O que a faz voltar |
|---|---|---|---|
| Ana, eleitora ocupada | 34 anos, Ceilândia (DF), usa WhatsApp e Instagram, vota mas não acompanha política | Saber em 2 minutos o que seus políticos fizeram na semana | Resumo semanal no WhatsApp |
| Carlos, eleitor engajado | 52 anos, Asa Norte (DF), lê notícias e discute política | Conferir como votou quem ele elegeu e cobrar nas redes | Alertas por político seguido e links para compartilhar |
| Júlia, estudante e criadora de conteúdo | 21 anos, faz vídeos curtos sobre política | Dados confiáveis e citáveis para seus conteúdos | Páginas compartilháveis e cards prontos |
| Marcos, jornalista local | Cobre política no DF | Cruzar emendas, obras e votos rapidamente | Busca, filtros e exportação de dados |
| Professora Rita | Ensino médio, aulas de sociologia | Material neutro para explicar o Legislativo | Explicações simples e sem viés |

Jornadas principais.

- Primeiro acesso (Ana). Chega por um link compartilhado → informa o CEP → vê a grade "Seus representantes": 3 senadores, 8 deputados federais e 24 deputados distritais, cada um com foto, bandeira do DF e cor e sigla do partido → toca num representante e abre uma gaveta com os últimos votos, presença, gastos e patrimônio, com "ver perfil completo" → abre o feed "O que aconteceu" → ativa o resumo semanal no WhatsApp com opt-in explícito.

- Explorar pelo mapa (Ana ou Júlia). Na página inicial, toca num estado do mapa do Brasil → vê a bancada daquele estado em grade de fotos e o placar das votações recentes por estado → compartilha o card.

- Entender a economia (Ana, fase 2). Abre "Economia em números" → vê a Selic e a inflação com explicação simples ("o que é e como afeta você") → segue para as votações recentes sobre impostos e preços, com o voto dos seus representantes.

- Acompanhar quem elegeu (Carlos). Marca os políticos em quem votou como "seguidos" → recebe alerta quando eles votam numa votação relevante → abre o perfil, vê o voto e o histórico → compartilha o card da votação.

- Obra parada no bairro (Ana ou Marcos). Abre "Obras e dinheiro na sua região" → encontra uma escola paralisada → vê qual emenda e qual parlamentar enviaram o recurso, o valor e a data da última atualização → compartilha ou reporta a situação real com foto.

- Pesquisa (Júlia ou Marcos). Busca um projeto ou votação → vê o placar por partido e por estado → copia o link permanente da página para citar a fonte.

- Compartilhar (Ana, Carlos ou Júlia). Em "Seus representantes", numa votação ou num perfil, toca em "Compartilhar" → vê a prévia do card → envia pelo WhatsApp, posta nos stories ou copia o link → quem recebe o link vê a mesma página e o card aparece como prévia na conversa → toca e cai no Cobra já com o conteúdo, sem precisar informar CEP.

## 3. Escopo do MVP e matriz de funcionalidades

O MVP é o piloto **"dinheiro e promessas no DF"**: obras com recurso federal no Distrito Federal, as emendas que as financiam e quem as indicou, o plano de governo do governador e do presidente em exercício, e os representantes do DF (3 senadores, 8 deputados federais e 24 deputados distritais) com perfil enxuto. Os perfis de todos os 594 congressistas existem porque as emendas que chegam ao DF podem vir de parlamentares de outros estados. Alertas começam por e-mail; WhatsApp entra na fase 2.

Fora do MVP, de propósito: notas, rankings, comparação ideológica, comentários abertos de usuários, previsão de voto e qualquer conteúdo sobre candidaturas durante o período eleitoral.

Fora do produto em qualquer fase: cotação de ações individuais, análise ou recomendação de investimento, anúncios de apostas e chat aberto.

Exceção prevista à regra de candidaturas: o comparador literal de planos de governo de candidatos (RF-84), a partir das eleições de 2028 e só depois de parecer jurídico.

Escopo ampliado (versão 4.0, 2026-10-28): depois do MVP, a cobertura passa a ser a de todos os eleitos do país e dos Três Poderes no nível federal (RF-85 a RF-94). Cada nova fonte só entra depois de conferida a documentação oficial atual (§6) e respeitando os limites de cada uma; dado sem fonte oficial (como estimativas privadas de impostos pagos) não entra.

| Funcionalidade | MVP (fase 1) | Fase 2 | Fase 3 | Fase 4 |
|---|---|---|---|---|
| Busca por CEP, cidade ou UF | Sim |  |  |  |
| Grade "Seus representantes" com foto, bandeira e partido | Sim |  |  |  |
| Mapa do Brasil clicável (bancada e placar por estado) | Sim |  |  |  |
| Senadores e deputados federais | Perfil completo |  |  |  |
| Deputados distritais (CLDF) | Perfil básico | Perfil completo |  |  |
| Governador e deputados estaduais |  | Perfil básico via TSE | Estados com API de alta maturidade (MG, PR, PE, MT) | Demais estados |
| Prefeitos e vereadores |  | Perfil básico via TSE (todos os eleitos) | Câmaras com dados abertos |  |
| Todos os eleitos do país, de vereador a presidente (perfil básico) |  | Sim (TSE) |  |  |
| "Me representa": todos os níveis de governo da cidade |  | Sim |  |  |
| Salário (subsídio e remuneração oficiais) no perfil |  | Congresso e Executivo federal | Estados e municípios com dados abertos |  |
| Executivo: presidente, governadores, prefeitos e ministros |  | Sim |  |  |
| STF: ministros, composição e decisões do plenário |  | Sim |  |  |
| Arrecadação de impostos com fonte oficial |  | Sim |  |  |
| Planos de governo de quem governa lado a lado |  | Sim |  |  |
| Canal no WhatsApp (publicações abertas) |  | Sim |  |  |
| Feed "O que aconteceu" | Votações relevantes e projetos | Presença e gastos |  |  |
| Votações explicadas em linguagem simples | Sim, com revisão humana |  |  |  |
| Perfil: votos, projetos, presença, gastos | Sim |  |  |  |
| Perfil: patrimônio e doadores (TSE) | Sim |  |  |  |
| Seguir políticos | Sim |  |  |  |
| Obras federais na região (Obrasgov) | DF (piloto) | Todo o Brasil |  |  |
| Emendas ligadas a obras | DF (piloto) | Todo o Brasil | Emendas Pix com plano de trabalho |  |
| Plano de governo de quem governa (TSE) | Presidente e governadores | Prefeitos (eleição de 2024) |  |  |
| Comparador de planos de candidatos |  |  | Eleições de 2028, após parecer |  |
| Comparar políticos lado a lado, sem ranking |  | Sim |  |  |
| Obras estaduais e municipais (TCEs) |  |  | Piloto (SP, DF) | Expansão |
| Alertas por e-mail | Resumo semanal | Alertas por político seguido |  |  |
| Alertas por WhatsApp |  | Resumo semanal | Alertas por político seguido |  |
| Cards compartilháveis | Sim |  |  |  |
| Relato de obra pelo cidadão (foto) |  |  | Sim, com moderação |  |
| Exportação de dados e API pública |  |  |  | Sim |
| Economia em números (indicadores oficiais explicados) |  | Sim |  |  |
| Trilhas educativas (Legislativo, economia, bolsa) |  | Sim |  |  |
| Ibovespa diário (sem ações individuais) |  |  | Se houver licença da B3 |  |

## 4. Requisitos funcionais

Os requisitos estão agrupados em seis módulos. Prioridade: Alta = necessário para lançar o MVP; Média = desejável no MVP; Baixa = fases seguintes.

### 4.1 Busca geográfica e "Seus representantes"

| ID | Requisito | Prioridade | Fase |
|---|---|---|---|
| RF-01 | Permitir que o usuário informe CEP, cidade ou UF, sem cadastro | Alta | 1 |
| RF-02 | Converter CEP em município e UF (código IBGE) por base própria ou serviço de CEP | Alta | 1 |
| RF-03 | Listar os representantes por nível: federal (3 senadores, bancada federal da UF), estadual/distrital e municipal | Alta | 1 |
| RF-04 | Explicar que deputados são eleitos pelo estado inteiro, não por bairro | Alta | 1 |
| RF-05 | Exibir aviso claro quando um nível ainda não tiver cobertura de dados | Alta | 1 |
| RF-06 | Para o DF, apresentar deputados distritais como representantes estaduais e municipais ao mesmo tempo | Alta | 1 |
| RF-07 | Lembrar a localização do usuário no dispositivo (sem conta) | Média | 1 |
| RF-08 | Filtrar a bancada por partido | Média | 1 |
| RF-09 | Exibir os representantes em grade de cards com foto oficial, nome, bandeira da UF, sigla e cor do partido; tocar num card abre uma gaveta (celular) ou painel lateral (computador) com o resumo e link para o perfil | Alta | 1 |
| RF-31 | Mapa do Brasil clicável na página inicial: ao tocar num estado, mostrar a bancada e o placar das votações recentes daquele estado | Alta | 1 |

### 4.2 Feed "O que aconteceu"

| ID | Requisito | Prioridade | Fase |
|---|---|---|---|
| RF-10 | Exibir linha do tempo, da mais recente para a mais antiga, com eventos dos representantes do usuário | Alta | 1 |
| RF-11 | Evento de votação relevante: resumo em linguagem simples, resultado e voto de cada representante (sim, não, abstenção, obstrução, ausente) | Alta | 1 |
| RF-12 | Evento de projeto apresentado por um representante, com ementa resumida e link oficial | Alta | 1 |
| RF-13 | Marcar visualmente resumos ainda não revisados por humanos (ou não publicá-los) | Alta | 1 |
| RF-14 | Página da votação com placar por partido e por UF e orientação das lideranças | Alta | 1 |
| RF-15 | Filtrar o feed por tema (tesauro oficial da Câmara e assuntos do Senado) | Média | 1 |
| RF-16 | Eventos de presença (faltas em sequência) e de gastos (despesas acima da média do próprio parlamentar) | Média | 2 |
| RF-17 | Cada evento traz data, fonte oficial e data da última atualização | Alta | 1 |

### 4.3 Perfil do político

| ID | Requisito | Prioridade | Fase |
|---|---|---|---|
| RF-20 | Dados cadastrais: nome, foto, partido, UF, mandato, contato oficial e redes sociais | Alta | 1 |
| RF-21 | Histórico de votos nominais, com filtros por tema e período | Alta | 1 |
| RF-22 | Projetos de autoria e relatoria, com situação de tramitação | Alta | 1 |
| RF-23 | Projetos separados por tipo (ex.: homenagens e datas comemorativas à parte) | Média | 1 |
| RF-24 | Presença em sessões deliberativas do plenário | Alta | 1 |
| RF-25 | Gastos da cota parlamentar por categoria e por mês, com acesso às notas | Alta | 1 |
| RF-26 | Patrimônio declarado em cada eleição e doadores de campanha (TSE) | Alta | 1 |
| RF-27 | Histórico de partidos e cargos | Média | 1 |
| RF-28 | Emendas parlamentares enviadas, por município e situação | Alta | 1 |
| RF-29 | Comparar 2 ou 3 políticos lado a lado, só com fatos (ampliado pelo RF-91) | Média | 2 |
| RF-30 | Botão "Seguir" (exige conta ou contato verificado) | Alta | 1 |
| RF-59 | Link "É você nesta página?" em todo perfil, levando ao canal de contestação e direito de resposta (§10.5) | Alta | 1 |
| RF-35 | Texto "Quem é" no topo do perfil, montado só com dados oficiais por um modelo de frase fixo (sem IA): cargo, partido, desde quando, eleições vencidas e votos | Média | 1 |
| RF-36 | Trajetória eleitoral desde 1994 (TSE): cada disputa com ano, cargo, partido, votos e resultado, e a linha do tempo de partidos | Média | 1 |
| RF-37 | Patrimônio por eleição com a composição por tipo de bem (imóveis, veículos, dinheiro, outros) e a variação entre declarações | Média | 1 |
| RF-38 | Perguntas frequentes factuais e políticos relacionados (mesmo estado, mesmo partido, em ordem alfabética) em cada perfil, com dados estruturados para buscadores | Média | 1 |
| RF-33 | Perfil organizado em seções, com um resumo no topo (presença com a mediana da casa, gastos com o limite da cota, projetos e patrimônio) e depois: como votou, projetos, gastos, patrimônio e doadores, histórico de partidos e cargos e, na fase 2, emendas e obras; cada número com a sua referência e nenhuma posição em ranking | Alta | 1 |
| RF-34 | No perfil, as obras financiadas pelas emendas do parlamentar, por município e situação, com o grau de confiança do vínculo | Alta | 1 |
| RF-32 | Identificar todo político pela cor, sigla e logotipo do seu partido e pela bandeira da sua UF, com as mesmas regras para todos os partidos (§9.1) | Alta | 1 |

### 4.4 Obras e emendas

| ID | Requisito | Prioridade | Fase |
|---|---|---|---|
| RF-40 | Listar obras com recurso federal no município do usuário: objeto, valor, início, previsão de término, situação e percentual de execução | Alta | 1 |
| RF-41 | Destacar obras paralisadas e o tempo de paralisação | Alta | 1 |
| RF-42 | Ligar obra à emenda e ao parlamentar autor quando houver vínculo confiável | Alta | 1 |
| RF-43 | Indicar o grau de confiança do vínculo emenda–obra (direto, por convênio, por município) | Alta | 1 |
| RF-44 | Exibir a data da última atualização da fonte em cada obra | Alta | 1 |
| RF-45 | Mostrar as emendas Pix recebidas pelo município e o plano de trabalho, quando informado | Média | 3 |
| RF-46 | Mapa das obras do município com pinos coloridos por situação (as coordenadas vêm da própria API do Obrasgov) | Média | 1 |
| RF-47 | Relato do cidadão sobre a situação real da obra, com foto e moderação | Baixa | 3 |
| RF-48 | Resumo de obras do município: quantidade, valor previsto, valor pago, quantas estão concluídas, em execução e paralisadas | Alta | 1 |
| RF-49 | Filtrar obras por situação, área (saúde, educação, saneamento, mobilidade e outras), valor e ano | Média | 1 |
| RF-39 | Ficha da obra: nome, endereço, área, órgão que repassa, quem recebe e quem executa, valor previsto, empenhado e pago, contrato e empresa, prazos previstos e efetivos, % de execução física, fotos do gestor, histórico de paralisação com a justificativa oficial e a data em que o gestor informou | Alta | 1 |

### 4.4c Planos de governo

Planos registrados no TSE pelos candidatos a cargos executivos (Lei 9.504/1997, art. 11). Os trechos são copiados do documento, nunca resumidos nem reescritos.

| ID | Requisito | Prioridade | Fase |
|---|---|---|---|
| RF-80 | Plano de governo registrado pelo presidente e pelos governadores em exercício, organizado por tema, com trechos literais e link para a página exata do PDF oficial | Alta | 1 |
| RF-81 | Busca por palavra dentro do plano de governo | Média | 1 |
| RF-82 | Ao lado de cada tema do plano, as obras com recurso federal da mesma área na localidade, sem afirmar se a promessa foi cumprida | Média | 1 |
| RF-83 | Plano de governo do prefeito em exercício de cada município (eleição de 2024) | Média | 2 |
| RF-84 | Comparador de planos de candidatos da mesma disputa (todos os candidatos, ordem alfabética, mesmos temas, trecho literal), condicionado a parecer jurídico | Baixa | 3 |

A classificação por tema usa uma regra pública e igual para todos os documentos (lista de palavras por tema), publicada na página de metodologia.

### 4.4b Economia e educação (fase 2)

| ID | Requisito | Prioridade | Fase |
|---|---|---|---|
| RF-70 | Página "Economia em números" com indicadores oficiais: Selic, câmbio, inflação (IPCA), desemprego, PIB, dívida pública e arrecadação federal, cada um com fonte e data | Alta | 2 |
| RF-71 | Explicação em linguagem simples de cada indicador: o que é, como é medido e como afeta o cidadão | Alta | 2 |
| RF-72 | Ligar cada indicador às votações e projetos sobre o mesmo tema, por assunto, sem afirmar causa e efeito | Média | 2 |
| RF-73 | Trilhas educativas curtas: como uma lei é feita, o que faz cada cargo, como funcionam juros, inflação, impostos e a bolsa de valores | Média | 2 |
| RF-74 | Ibovespa diário como termômetro, sem cotação de ações individuais, condicionado a licença de dados da B3 | Baixa | 3 |

### 4.4d Cobertura completa (versão 4.0)

| ID | Requisito | Prioridade | Fase |
|---|---|---|---|
| RF-85 | Perfil básico de todos os eleitos do país (vereador, prefeito e vice, deputado estadual e distrital, governador e vice, deputado federal, senador, presidente e vice) pelo TSE: cargo, partido, município ou UF, votos e trajetória | Alta | 2 |
| RF-86 | "Me representa": a partir da cidade, todos os níveis de governo (vereadores, prefeito, deputados estaduais, governador, deputados federais, senadores, presidente), em ordem fixa e alfabética dentro de cada nível | Alta | 2 |
| RF-87 | Salário no perfil: subsídio ou remuneração oficial do cargo, com fonte e data; no Congresso e no Executivo federal na fase 2, e em estados e municípios com dados abertos depois | Alta | 2 |
| RF-88 | Executivo: perfis do presidente, do vice, dos ministros, dos governadores e dos prefeitos, com cargo, partido, período e, quando houver, o plano de governo | Alta | 2 |
| RF-89 | STF: perfil de cada ministro (quem indicou, posse, trajetória oficial) e a composição atual, com fonte oficial; decisões do plenário só com dados oficiais e sem classificação de "a favor" ou "contra" | Média | 2 |
| RF-90 | Arrecadação de impostos com dados oficiais (Receita Federal e Tesouro), por tributo e por mês, explicada em linguagem simples; nenhuma estimativa privada de "impostos pagos" | Média | 2 |
| RF-91 | Comparar 2 ou 3 políticos do mesmo cargo lado a lado, só com fatos e com os mesmos campos (substitui e amplia o RF-29) | Média | 2 |
| RF-92 | Planos de governo de quem governa lado a lado (ex.: governadores de estados diferentes), por tema e com trecho literal, pela mesma regra fixa de temas | Média | 2 |
| RF-93 | Canal no WhatsApp com publicações abertas (votações relevantes e resumos revisados), sem coleta de dados de quem segue o canal | Média | 2 |
| RF-94 | Busca única por CEP, cidade, UF ou nome de qualquer político coberto, com sugestões enquanto a pessoa digita | Alta | 2 |

### 4.5 Alertas

| ID | Requisito | Prioridade | Fase |
|---|---|---|---|
| RF-50 | Cadastro de e-mail com opt-in duplo | Alta | 1 |
| RF-51 | Resumo semanal por e-mail com os principais eventos dos representantes | Alta | 1 |
| RF-52 | Descadastro com um clique em toda mensagem | Alta | 1 |
| RF-53 | Cadastro de WhatsApp com opt-in explícito e confirmação | Alta | 2 |
| RF-54 | Resumo semanal por WhatsApp via template aprovado pela Meta | Alta | 2 |
| RF-55 | Comando "SAIR" no WhatsApp para cancelar | Alta | 2 |
| RF-56 | Preferências: frequência, temas e políticos seguidos | Média | 2 |
| RF-57 | Alerta imediato quando um político seguido vota numa votação relevante | Média | 2 |

### 4.6 Compartilhamento, conteúdo e administração

| ID | Requisito | Prioridade | Fase |
|---|---|---|---|
| RF-60 | Link permanente para cada votação, perfil e obra; o link de "seus representantes" usa o código IBGE do município, nunca o CEP | Alta | 1 |
| RF-61 | Gerar card de imagem com fato, fonte, data de atualização e endereço do Cobra para "seus representantes", votação e perfil, nos formatos stories (9:16), feed (4:5) e prévia de link (1,91:1), com o mesmo modelo para qualquer partido | Alta | 1 |
| RF-67 | Painel "Compartilhar" com prévia do card e as opções: enviar no WhatsApp (em destaque), compartilhar pelo menu nativo do celular, baixar imagem, copiar imagem, postar no X e copiar link | Alta | 1 |
| RF-68 | Prévia de link (Open Graph) em toda página compartilhável, para que o card apareça ao colar o link no WhatsApp e nas redes | Alta | 1 |
| RF-69 | Página inicial com exemplos de cards antes de pedir o CEP | Média | 1 |
| RF-62 | Painel editorial para revisar, editar e publicar resumos de votações e projetos | Alta | 1 |
| RF-63 | Registro de quem aprovou cada resumo e quando (trilha de auditoria) | Alta | 1 |
| RF-64 | Canal para reportar erro em qualquer dado, com fila de correção pública | Alta | 1 |
| RF-65 | Página pública de metodologia: fontes, critérios de relevância e frequência de atualização | Alta | 1 |
| RF-66 | Painel de saúde das integrações (última coleta, falhas, volume) | Alta | 1 |

## 5. Requisitos não funcionais

O site deve abrir rápido num celular comum com 4G, continuar no ar mesmo quando as APIs do governo falham e nunca expor dados pessoais dos usuários.

| ID | Categoria | Requisito | Meta |
|---|---|---|---|
| RNF-01 | Desempenho | Tempo para o conteúdo principal aparecer em celular intermediário com 4G | Até 2,5 s (LCP) |
| RNF-02 | Desempenho | Tempo de resposta da API própria do Cobra (percentil 95) | Até 300 ms |
| RNF-03 | Disponibilidade | Site público no ar | 99,5% ao mês |
| RNF-04 | Resiliência | Site funciona com dados do banco próprio quando uma fonte oficial cai | Sem dependência em tempo real das APIs do governo |
| RNF-05 | Atualização | Votações e proposições federais | Até 6 h após publicação na fonte |
| RNF-06 | Atualização | Gastos, presença, obras e emendas | Diária |
| RNF-07 | Atualização | Dados do TSE | A cada nova publicação do TSE |
| RNF-08 | Escalabilidade | Picos em dias de votação ou de viralização | 10 vezes o tráfego médio sem degradação (cache e CDN) |
| RNF-09 | Respeito às fontes | Coletas dentro dos limites de cada API | Ex.: até 10 req/s no Senado; até 400 req/min no Portal da Transparência |
| RNF-10 | Segurança | Tráfego e dados | HTTPS obrigatório; dados pessoais criptografados em repouso |
| RNF-11 | Segurança | Painel editorial | Autenticação com segundo fator e perfis de acesso |
| RNF-12 | Privacidade | Coleta mínima | Uso anônimo sem cadastro; só e-mail ou telefone para alertas |
| RNF-13 | Acessibilidade | Conformidade | WCAG 2.1 nível AA |
| RNF-14 | Usabilidade | Linguagem | Textos de resumo com nível de leitura de ensino fundamental II |
| RNF-15 | Compatibilidade | Dispositivos | Mobile first; navegadores dos últimos 2 anos |
| RNF-16 | Rastreabilidade | Todo dado exibido | Fonte, identificador original e data de coleta armazenados |
| RNF-17 | Observabilidade | Integrações e site | Logs, métricas e alertas de falha para a equipe |
| RNF-18 | Transparência | Código | Código aberto em repositório público (licença a definir) |
| RNF-19 | Custo | Infraestrutura no MVP | Até R$ 1.000 por mês (estimativa a validar) |
| RNF-20 | Identidade visual | Consistência | Um design system próprio (cores, tipografia, componentes) aplicado a todas as páginas, com modo claro e escuro, ver cap. 13 |

## 6. Fontes de dados e estratégia de integração (ETL)

Todos os dados vêm de fontes oficiais e são copiados para o banco próprio do Cobra; o site nunca consulta as APIs do governo em tempo real. A carga inicial usa os arquivos em lote de cada fonte e a sincronização diária usa as APIs.

### 6.1 Fontes

| Fonte | Dados usados | Acesso | Limites e cuidados | Fase |
|---|---|---|---|---|
| Câmara dos Deputados | Deputados, despesas da cota, proposições, tramitações, votações, votos, orientações, presença | API REST v2 (JSON/XML) + arquivos anuais (CSV/JSON); sem chave | Até 100 itens por página; votação nem sempre ligada a uma única proposição; limite de requisições não documentado | 1 |
| Senado Federal | Senadores, mandatos, processos, votações de plenário e comissões, discursos | API REST (JSON/XML/CSV); sem chave | Acima de 10 req/s retorna HTTP 429; serviços legados em descontinuação, migrar para os novos endpoints | 1 |
| TSE – Dados Abertos | Candidatos eleitos e candidaturas desde 1994 (trajetória), bens declarados com tipo de bem, receitas e doadores, resultados por município e zona, **planos de governo em PDF** (um ZIP por UF e eleição em cdn.tse.jus.br/estatistica/sead/odsele/proposta_governo/, verificado em 2026-10-26, com séries desde 2010 e a eleição municipal de 2024) | Arquivos CSV/ZIP por eleição (CKAN); sem chave | Arquivos grandes; cruzamento por CPF/sequencial do candidato | 1 |
| CLDF – Dados Abertos | Deputados distritais, proposições, votações | Portal CKAN com API | Estrutura e frequência a validar no início do projeto | 1 |
| Portal da Transparência (CGU) | Emendas parlamentares, convênios, despesas | API REST com token gratuito por e-mail + downloads em massa | 400 req/min (06h–24h) e 700 req/min (00h–06h); preferir downloads para histórico | 2 |
| Obrasgov.br | Obras com recurso federal: identificação, endereço, coordenadas, área, valor previsto, empenhos, contratos, prazos previstos e efetivos, % de execução física, histórico de paralisação e cancelamento com justificativa, fotos | API pública REST sem chave, com documentação OpenAPI (api-publica.obrasgov.gestao.gov.br/obras/docs); recursos /projeto-investimento, /execucao-fisica, /empenho, /contrato, /geometria, /historico-situacao-cancelada-paralisada, /estudo-viabilidade e /data-atualizacao; paginação de até 200 itens (verificado em 2026-10-26) | Dados preenchidos pelos gestores, com inconsistências (ex.: obra com prazo vencido há anos ainda "Cadastrada"); mostrar sempre "informado pelo gestor em [data]" e o canal de reportar erro | 2 |
| Transferegov – Transferências Especiais | Emendas Pix: planos de ação, empenhos, planos de trabalho, relatórios de gestão | API PostgREST (api.transferegov.gestao.gov.br/transferenciasespeciais) | Limites e autenticação não confirmados; vínculo com obra depende do plano de trabalho | 3 |
| TCU – Painel de Obras Paralisadas | Obras paralisadas consolidadas | Painel público; API não identificada | Usar como referência e checagem, não como fonte automática | 2 |
| Tribunais de Contas estaduais (ex.: TCE-SP) | Obras estaduais e municipais | Varia por estado | Integração caso a caso | 3 |
| Assembleias Legislativas | Deputados estaduais, votações | APIs em MG, PR, PE, MT; parciais em AM, AP, AC, RO; PDF/HTML nos demais | Começar pelas de alta maturidade | 3 |
| Base de CEP (ex.: DNE dos Correios ou base aberta) | CEP → município (código IBGE) | Arquivo ou serviço | Licença e custo a definir | 1 |
| Fotos oficiais (Câmara, Senado, CLDF) | Foto de cada parlamentar | Vêm nas APIs de cada casa | Confirmar licença de uso e crédito exigido | 1 |
| Bandeiras das UFs | Bandeira de cada estado | Arquivos vetoriais de fontes oficiais | Símbolos oficiais; registrar a origem de cada arquivo | 1 |
| Cores e logotipos de partidos | Identificação visual dos partidos | Tabela curada pelo Cobra a partir da identidade publicada por cada partido | O TSE não define cores oficiais; logotipos são marcas registradas, usadas só para identificação | 1 |
| Banco Central (SGS) | Selic, câmbio e outras séries | API pública (api.bcb.gov.br); sem chave | A antiga série 7 (Ibovespa) parou de ser atualizada em 2019 | 2 |
| IBGE (SIDRA) | Inflação (IPCA), desemprego, PIB | API pública; sem chave | — | 2 |
| Tesouro Nacional e Receita Federal | Dívida pública e arrecadação | Dados abertos | — | 2 |
| B3 (market data) | Ibovespa | Licença de distribuição de dados (Política de Market Data; o Ofício Circular 036/2026 permite exibição em atraso em sites abertos) | Exige contrato; preço a consultar | 3 |

### 6.2 Estratégia de integração

- Carga inicial: baixar os arquivos em lote (Câmara, TSE, Portal da Transparência, Obrasgov) e popular o banco.

- Sincronização incremental: coletores agendados por fonte (votações a cada 2 h em dias de sessão; demais dados diariamente de madrugada, quando os limites são maiores).

- Fila e retentativas: cada coleta vira tarefas numa fila, com controle de taxa por fonte, retentativa com espera crescente para HTTP 429/503 e alerta após falhas seguidas.

- Camadas de dados: bruto (resposta original guardada como veio) → normalizado (entidades do Cobra) → publicado (o que o site lê).

- Identidade única de político: tabela de correspondência entre o ID da Câmara, o código do Senado, o sequencial e o CPF do TSE e o ID da CLDF.

- Validação: checagens automáticas (contagem de votos bate com o placar, todo parlamentar tem partido, datas coerentes) antes de publicar.

- Cruzamento emenda–obra: primeiro pelo código da emenda e número do convênio; depois por município (código IBGE) e órgão; cada vínculo recebe um grau de confiança (direto, por convênio, por município).

- Geração de eventos: novas votações, projetos e mudanças de situação viram eventos do feed, que passam pela fila editorial quando precisam de resumo.

## 7. Modelo de dados preliminar

O centro do modelo é o Político, ligado a mandatos, votos, proposições, gastos, declarações eleitorais e emendas; a Localidade conecta o usuário aos seus representantes e às obras da região. Toda entidade guarda fonte, identificador original e data de coleta.

| Entidade | Campos principais | Relacionamentos |
|---|---|---|
| Localidade | código IBGE, nome, tipo (UF ou município), UF | Tem mandatos (por circunscrição) e obras |
| Político | id interno, nome civil, nome parlamentar, foto, data de nascimento | Tem mandatos, votos, autorias, despesas, declarações TSE e emendas |
| IdentificadorExterno | político, sistema (Câmara, Senado, TSE, CLDF, ALs), id no sistema | Liga o Político às fontes |
| Partido | sigla, nome, número | Tem filiações |
| Filiação | político, partido, início, fim | Histórico de partidos |
| Mandato | político, cargo, casa legislativa, localidade, início, fim, situação (titular, suplente, licenciado) | Define quem representa cada localidade |
| CasaLegislativa | nome, nível (federal, estadual, distrital, municipal) | Tem sessões, votações e proposições |
| Proposição | casa, tipo, número, ano, ementa oficial, temas, situação, link oficial | Tem autorias, tramitações e votações; tem resumo editorial |
| Autoria | proposição, político, papel (autor, coautor, relator) | Liga proposições a políticos |
| Votação | casa, data, descrição, proposição (opcional), resultado, placar, relevante (sim/não), critério de relevância | Tem votos, orientações e resumo |
| Voto | votação, político, partido na data, opção (sim, não, abstenção, obstrução, art. 17, ausente) | Pertence a votação e político |
| Orientação | votação, bancada ou liderança, orientação | Base do critério de relevância |
| Sessão e Presença | sessão (casa, data, tipo); presença (político, sessão, presente, justificativa) | Base dos dados de assiduidade |
| Despesa | político, data, categoria, fornecedor (CNPJ/CPF), valor, link do documento | Gastos da cota parlamentar |
| DeclaraçãoEleitoral | político, eleição, cargo disputado, bens (lista e total), resultado | Patrimônio declarado |
| Doação | declaração eleitoral, doador (nome, CPF/CNPJ), valor, data, tipo | Doadores de campanha |
| Emenda | código, autor (político ou bancada), ano, tipo (individual, bancada, Pix), valores empenhado e pago, localidade beneficiada | Pode ligar a convênio e obra |
| Obra | id Obrasgov, objeto, órgão, localidade, valor previsto, valor executado, início, término previsto, situação, % execução, última atualização da fonte | Pode ligar a emendas |
| VínculoEmendaObra | emenda, obra, método (direto, convênio, município), confiança | Cruzamento auditável |
| ResumoEditorial | objeto resumido (votação ou proposição), texto simples, versão, autor, revisor, aprovado em | Trilha de auditoria editorial |
| Evento | tipo, data, políticos envolvidos, localidades, objeto de origem, publicado | Alimenta feed e alertas |
| Usuário | id, e-mail e/ou telefone (criptografados), consentimentos com data, localidade preferida | Tem seguidos e preferências |
| Seguido e Preferência | usuário, político; canal, frequência, temas | Configura alertas |
| EnvioDeAlerta | usuário, canal, data, eventos incluídos, status de entrega | Histórico de envios |
| RelatoCidadão | obra, usuário, texto, foto, status de moderação | Fase 3 |

## 8. Arquitetura sugerida

A arquitetura separa a coleta dos dados da exibição: coletores copiam as fontes oficiais para um banco próprio, e o site só lê desse banco. Assim, uma API do governo fora do ar não derruba o Cobra, e os limites de requisição são respeitados.

**Diagrama de arquitetura (transcrito da imagem do documento original):** o site só lê o banco próprio; coletores isolam as APIs do governo.

```
Fontes oficiais        →  Coletores (ETL)           →  Banco de dados         →  API e cache    →  Site e cards
(Câmara, Senado, TSE,     (agendador e fila,           (PostgreSQL: bruto,       (leitura rápida,   (web mobile first,
 CLDF, CGU, Obrasgov)      limite por fonte,            tratado e publicado)      CDN)               links permanentes)
                           validações)                        ↕                        ↓
                                                     Painel editorial          Eventos e alertas
                                                     (IA rascunha os resumos;  (resumo semanal e alertas de seguidos;
                                                      humano revisa e publica)  e-mail no MVP, WhatsApp na fase 2)
```

O painel editorial lê e grava no banco; o serviço de alertas lê os eventos publicados e envia os resumos.

| Componente | Sugestão de tecnologia | Observação |
|---|---|---|
| Site | Next.js com páginas geradas no servidor | Bom para SEO, links compartilháveis e velocidade no celular |
| API do Cobra | Rotas do próprio Next.js ou serviço em Node/TypeScript | Somente leitura para o público |
| Cache e CDN | CDN da hospedagem (ex.: Vercel ou Cloudflare) | Absorve picos de acesso |
| Banco de dados | PostgreSQL gerenciado (ex.: Supabase) | Autenticação e armazenamento de fotos inclusos; PostGIS para mapas na fase 3 |
| Coletores (ETL) | Python agendado (ex.: GitHub Actions ou cron do provedor) e fila no próprio Postgres | Um adaptador isolado por fonte |
| Painel editorial | Área administrativa no próprio site, com login e 2 fatores | Rascunho por IA, aprovação humana registrada |
| Resumos com IA | Modelo de linguagem via API | Sempre como rascunho; nunca publica sozinho |
| E-mail | Serviço transacional (ex.: Resend ou Amazon SES) | Opt-in duplo e descadastro |
| WhatsApp | WhatsApp Cloud API da Meta | Templates aprovados; fase 2 |
| Monitoramento | Sentry e alertas de falha das coletas | Painel de saúde das integrações |
| Código | Repositório público no GitHub | Transparência e contribuição de voluntários |

Para o MVP, uma única aplicação Next.js com Postgres gerenciado e coletores agendados basta; separar serviços só quando o volume exigir.

## 9. Diretrizes de neutralidade editorial e algorítmica

O Cobra descreve o que aconteceu e deixa o julgamento para o usuário: nenhuma nota, ranking, adjetivo ou critério que favoreça um lado. Essas regras são públicas e valem para pessoas, algoritmos e textos gerados com IA.

### 9.1 Regras editoriais

- Fato, fonte e data em tudo. Todo resumo traz link para o documento oficial e a data.

- Sem adjetivos de valor. Proibido "polêmico", "absurdo", "importante conquista", "pauta-bomba" e equivalentes.

- Os dois lados em linguagem própria. O resumo diz o que o projeto muda e, quando houver, os principais argumentos a favor e contra, atribuídos a quem os defende.

- Mesmo tratamento para todos. Mesmos campos, mesma ordem e mesmo destaque para qualquer partido ou político.

- Identidade de partido é identificação, não juízo. Cada político aparece com a cor, a sigla e o logotipo do seu partido e a bandeira da sua UF, como fazem o TSE e as casas legislativas. A regra vale igual para todos os partidos: mesmo tamanho, mesma posição, mesmo tipo de destaque. As cores de "Sim" e "Não" nas votações não reutilizam cores de partido, para não sugerir alinhamento.

- Ordem neutra. Listas de políticos em ordem alfabética ou por critério objetivo declarado; nunca por "desempenho".

- Linguagem simples, não simplista. Texto acessível sem omitir o que muda de fato.

- IA com revisão humana. Resumos podem ser rascunhados por IA, mas só são publicados após revisão humana registrada; o rodapé indica quando houve uso de IA.

- Correção pública. Erros corrigidos com registro visível do que mudou e quando.

- Dado indisponível aparece como "—" e nunca como zero, com a explicação do motivo.

- Contexto mínimo para números. Gastos e presença sempre com referência (limite da cota, média da casa), sem rotular como bom ou ruim.

- Economia sem causalidade. Indicadores econômicos se ligam a votações só pelo assunto; nenhum texto ou gráfico afirma que uma votação, um político ou um partido causou uma variação de mercado ou de indicador.

- Nada de recomendação de investimento. O conteúdo sobre bolsa é educativo e não comenta ações ou emissores específicos.

### 9.2 Critério de "votação relevante"

Uma votação nominal entra no feed quando atende a pelo menos um critério objetivo, e o critério aparece na página da votação:

- Divergência entre lideranças: orientação do governo diferente da orientação da oposição (endpoint de orientações da Câmara e equivalente do Senado).

- Placar disputado: diferença entre "sim" e "não" menor que 20% dos votantes.

- Tipo de matéria: PEC, medida provisória, projeto de lei complementar, lei orçamentária ou derrubada de veto.

- Curadoria editorial justificada: inclusão manual permitida, com justificativa publicada e registrada; limite a definir para evitar abuso.

Votações simbólicas (sem registro nominal) aparecem como evento da proposição, sem atribuir voto individual a ninguém.

### 9.3 Governança da neutralidade

- Conselho consultivo com pessoas de diferentes orientações políticas, que revisa amostras de resumos a cada trimestre.

- Revisão cruzada: resumos de temas sensíveis aprovados por dois revisores.

- Auditoria periódica: medir se o destaque no feed está equilibrado entre partidos ao longo do tempo.

- Código aberto e metodologia publicada.

## 10. Requisitos legais, regulatórios e de privacidade

Publicar dados sobre o mandato de políticos é amparado pela Lei de Acesso à Informação e pelo princípio da publicidade; o ponto mais sensível é proteger os dados dos usuários, porque saber quem um usuário segue pode revelar sua opinião política. Este capítulo não substitui parecer jurídico, que deve ser obtido antes do lançamento.

### 10.1 Dados públicos de políticos (LAI e dados abertos)

- A Lei 12.527/2011 (LAI) e o Decreto 8.777/2016 garantem acesso e reutilização de dados sobre votos, gastos e atuação de agentes públicos.

- Usar só dados ligados ao exercício do mandato ou declarados à Justiça Eleitoral; não publicar endereço residencial, familiares ou vida privada.

- Citar sempre a fonte oficial e manter o dado fiel ao original.

- Dados de doadores pessoas físicas (TSE) são públicos, mas devem ser exibidos com cuidado: sem busca aberta por nome de doador no MVP, para evitar uso como ferramenta de exposição de cidadãos.

### 10.2 Dados dos usuários (LGPD – Lei 13.709/2018)

- Dado sensível: "opinião política" é dado pessoal sensível (art. 5º, II). Políticos seguidos e temas de interesse podem revelá-la, então exigem consentimento específico e destacado (art. 11).

- Minimização: uso sem cadastro; só e-mail ou telefone para alertas; CEP pode ser convertido em município e descartado.

- Consentimento por finalidade: separado para e-mail, WhatsApp e para salvar políticos seguidos, com data e versão do termo registradas.

- Direitos do titular: ver, exportar, corrigir e apagar os próprios dados pelo próprio site.

- Segurança: criptografia em repouso para contatos e preferências; acesso restrito; registro de acessos.

- Nunca: vender, compartilhar ou usar dados de usuários para campanha, perfilamento político ou publicidade direcionada.

- Documentos: política de privacidade em linguagem simples, termos de uso e encarregado (DPO) nomeado.

- Incidentes: plano de resposta e comunicação à ANPD e aos titulares quando aplicável.

### 10.3 Legislação eleitoral

- A proibição de publicidade institucional nos três meses antes da eleição vale para órgãos públicos; o Cobra, como iniciativa privada e apartidária, não está sujeito a ela, mas deve evitar parecer propaganda.

- Em anos eleitorais, manter isonomia total entre candidatos e não criar conteúdo de campanha, pedido de voto ou "recomendação" de candidato.

- Não fazer disparo em massa de conteúdo eleitoral; alertas só para quem pediu e sobre atuação de mandatos.

- Sinalizar conteúdo produzido ou alterado com IA, como exigem as resoluções do TSE sobre propaganda e desinformação (citadas na pesquisa como Res. 23.735/2024 e 23.757/2026; confirmar números e vigência).

- Não aceitar doações de partidos, candidatos ou campanhas.

### 10.4 Mensagens (WhatsApp e e-mail)

- WhatsApp só pela API oficial da Meta, com opt-in explícito registrado e templates aprovados para mensagens fora da janela de 24 h.

- Comando "SAIR" e opção de cancelamento em toda mensagem; e-mail com descadastro em um clique.

- Respeitar os níveis de envio da Meta (250, 2.000, 10.000, 100.000 contatos únicos por 24 h, depois sem limite) e crescer de forma gradual para manter a qualidade alta do número.

### 10.5 Outros

- Direito de resposta e correção: canal para políticos e cidadãos contestarem dados, com prazo de resposta definido.

- Marco Civil da Internet (Lei 12.965/2014): guarda de registros de acesso por 6 meses, se a entidade se enquadrar como provedora de aplicação com fins econômicos (avaliar).

- Licenças: confirmar a licença de uso de cada fonte (dados governamentais abertos) e da base de CEP.

- Marca: registrar o nome definitivo no INPI antes do lançamento público.

- Marcas de terceiros: logotipos de partidos usados só para identificar o partido; confirmar no parecer jurídico. A identidade visual do Cobra se inspira no seuimposto.com (Pandora) sem copiar layout, código, marca ou imagens.

- Mercado de capitais: conteúdo sobre ações específicas pode ser enquadrado como relatório de análise (Resolução CVM 20), que exige analista credenciado; por isso o Cobra não comenta nem recomenda ações. Exibir o Ibovespa exige licença de dados da B3.

## 11. Matriz de riscos e mitigação

Os maiores riscos não são técnicos: são a acusação de parcialidade, que destrói a confiança, e a falta de usuários e de financiamento. Riscos técnicos de fontes instáveis são resolvidos com a arquitetura de cópia local.

| Risco | Categoria | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|
| Acusação de parcialidade por um resumo ou pela escolha de votações | Reputação | Alta | Alto | Regras públicas (cap. 9), revisão cruzada, conselho plural, correção pública |
| Pouca adoção: o site é bom mas ninguém conhece | Produto | Alta | Alto | Distribuição por vídeos curtos e cards; parcerias com imprensa local e escolas; piloto concentrado no DF |
| Falta de financiamento para manter a equipe editorial | Sustentabilidade | Média | Alto | Editais, doações recorrentes e parcerias acadêmicas desde o início; custo de infraestrutura baixo |
| Erro factual em voto, gasto ou obra | Qualidade | Média | Alto | Validações automáticas, fonte e data em todo dado, botão "reportar erro", correção rápida |
| Vínculo emenda–obra errado atribui obra parada ao político errado | Qualidade e jurídico | Média | Alto | Mostrar grau de confiança; vínculo só por município não atribui responsabilidade |
| APIs mudam, caem ou são descontinuadas (ex.: serviços legados do Senado) | Técnico | Alta | Médio | Banco próprio, camada bruta guardada, monitoramento de coletas, adaptadores isolados por fonte |
| Bloqueio ou rebaixamento do número de WhatsApp | Técnico | Média | Médio | Opt-in estrito, comando SAIR, crescimento gradual, e-mail como canal principal no MVP |
| Custo de mensagens do WhatsApp cresce com a base | Financeiro | Média | Médio | Resumo semanal em vez de mensagens avulsas; WhatsApp opcional; e-mail gratuito |
| Vazamento de dados de usuários (opinião política) | Privacidade | Baixa | Alto | Minimização, criptografia, acesso restrito, plano de incidentes |
| Questionamento eleitoral em ano de eleição | Jurídico | Baixa | Alto | Isonomia, nenhum conteúdo de campanha, parecer jurídico prévio |
| Ataques ou pressão de políticos e apoiadores | Reputação | Média | Médio | Canal de contestação com prazo, registro público de correções, assessoria jurídica |
| Cobertura subnacional mais lenta que o esperado | Produto | Alta | Baixo | Expansão por maturidade dos dados; avisar com clareza o que ainda não é coberto |
| Dependência de uma só pessoa para o conhecimento técnico | Operacional | Média | Médio | Código aberto, documentação, comunidade de voluntários |
| Politicômetro já cobre perfis, votações e planos de governo para 70 mil eleitos | Produto | Alta | Alto | Foco em obras, emendas e promessas na cidade (versão 3.0); avaliar colaboração em vez de duplicar perfis |
| Concorrente direto já no ar (Apuração Brasil) com dados do Congresso, emendas e app | Produto | Alta | Alto | Diferenciar em busca por CEP com grade visual, linguagem simples, cobertura distrital e economia explicada; lançar o piloto do DF rápido |
| Uso de cor e marca de partido ser lido como favorecimento | Reputação | Média | Médio | Regra pública e idêntica para todos os partidos (§9.1); auditoria de destaque por partido |
| Custo ou recusa da licença da B3 | Financeiro | Média | Baixo | Ibovespa só na fase 3 e opcional; indicadores oficiais gratuitos cobrem a fase 2 |

## 12. Métricas de sucesso e roadmap

O MVP é um sucesso se, em 3 meses, as pessoas voltarem sozinhas: a métrica principal é o número de usuários que acessam ou abrem o resumo pelo menos uma vez por semana. As metas abaixo são propostas iniciais, a revisar com dados reais.

| Métrica | Como medir | Meta no fim do MVP |
|---|---|---|
| Usuários ativos semanais (métrica principal) | Visitas únicas + aberturas do resumo por semana | 1.500 |
| Visitantes únicos por mês | Analytics sem cookies de terceiros | 5.000 |
| Inscritos no resumo semanal | Opt-ins confirmados | 1.000 |
| Taxa de abertura do resumo | Aberturas / envios | 35% ou mais |
| Retorno em 30 dias | Usuários que voltam até 30 dias após o 1º acesso | 20% ou mais |
| Compartilhamentos | Cliques em compartilhar + acessos vindos de links compartilhados | 500 por mês |
| Atualização das votações | % publicadas em até 6 h | 95% |
| Correção de erros reportados | % corrigidos em até 72 h | 90% |
| Resumos revisados por humanos | % do total publicado | 100% |
| Equilíbrio editorial | Distribuição de destaques por partido versus tamanho das bancadas | Desvio revisado a cada trimestre |
| Custo por usuário ativo | Custo mensal / usuários ativos semanais | A definir após o 1º mês |

**Roadmap (transcrito da imagem do documento original):** quatro fases, cada uma liberada por uma meta.

| Fase | Período | Entregas |
|---|---|---|
| 1. Dinheiro e promessas no DF | Meses 1 a 3 | Obras e emendas no DF; planos de governo do presidente e do governador; representantes do DF e perfis enxutos dos congressistas; votações relevantes; alertas por e-mail |
| 2. Brasil completo e economia | Meses 4 a 9 | Todos os eleitos pelo TSE (RF-85) e "Me representa" por cidade (RF-86); salários (RF-87); Executivo (RF-88) e STF (RF-89); arrecadação oficial (RF-90); comparador (RF-91) e planos lado a lado (RF-92); busca por nome (RF-94); obras e emendas em todo o Brasil; planos dos prefeitos; resumo e canal no WhatsApp (RF-93); distritais completos; economia em números e trilhas educativas |
| 3. Estados | Meses 10 a 15 | ALs de MG, PR, PE, MT (votos e gastos); salários de estados e municípios com dados abertos; emendas Pix; relatos de obras; Ibovespa diário se houver licença |
| 4. Escala nacional | Ano 2 | Demais estados; câmaras municipais; API pública; exportação de dados |

- Meta 1 (libera fase 2): 5 mil visitantes por mês e 1 mil inscritos no resumo.
- Meta 2 (libera fase 3): vínculos emenda-obra auditados e corretos.
- Meta 3 (libera fase 4): financiamento garantido para 12 meses.

Cada fase só começa quando a meta anterior é atingida; o MVP federal (fase 1) é a única com escopo fechado, e as datas das demais dependem do financiamento.

## 13. Identidade visual e experiência

A referência principal é o seuimposto.com, a apuração ao vivo das eleições 2026 feita pela Pandora. O Cobra adota a mesma qualidade visual e os mesmos padrões de interação, com identidade própria (nome, logotipo, paleta e componentes do Cobra) e sem copiar código, imagens ou marca. Outras referências: grade de fotos com bandeira do Radar do Congresso, busca central por CEP do abgeordnetenwatch.de e do GovTrack, e acessibilidade do Padrão Digital de Governo (gov.br/ds).

### 13.1 Padrões adotados

| Padrão | Como aparece no Cobra |
|---|---|
| Manchete em fonte serifada, interface em fonte sem serifa | Destaques ("Câmara aprova…") em serifa; dados e navegação em sem serifa |
| Fotos oficiais recortadas em todo lugar | Cards de representantes, gaveta, perfil, página da votação |
| Cor e sigla do partido e bandeira da UF | Em todo card de político (RF-32), pela regra do §9.1 |
| Números grandes com unidade compacta (64,3 mi) | Gastos, presença, patrimônio, indicadores |
| Barra de placar dividida | Página da votação: Sim × Não, com o voto dos seus representantes |
| Mapa clicável com navegação por níveis (Brasil › UF › município) e trilha de navegação | Página inicial e votações (placar por UF) |
| Painel lateral no computador e gaveta deslizante no celular | Resumo de um representante ou de um estado sem sair do mapa ou da grade |
| Busca única com atalhos de teclado | CEP, cidade ou nome do político |
| Comparação sempre presente | Média da casa, limite da cota, mandato anterior |
| "Últimas atualizações" com horário | Feed "O que aconteceu" |
| Barra de navegação inferior no celular | Início · Buscar · Votações · Economia (fase 2) |
| Fundo claro quente, cards arredondados, botões em pílula, modo escuro | Toda a identidade |

### 13.2 O que não se adota

Chat aberto (excluído no cap. 3), anúncios de apostas, contador de "pessoas acompanhando" e projeções de resultado.

### 13.3 Compartilhamento

Referências: o painel de compartilhar do seuimposto.com (prévia do card, WhatsApp em destaque, copiar e baixar imagem, X, copiar link, menu nativo no celular) e o card vertical do 12axes (1080×1920, foto grande, números, rodapé com o endereço do site). Regras:

- Todo card traz a fonte oficial e a data de atualização, como qualquer dado do Cobra (RF-17).
- Cards e links não contêm dado pessoal do usuário: nada de CEP, e-mail ou políticos seguidos.
- O mesmo modelo de card vale para qualquer partido ou político (§9.1).

### 13.4 Entrega

A identidade é definida numa change própria (`identidade-visual`), validada antes com um protótipo navegável com dados fictícios, e implementada como design system no código (tokens de cor e tipografia, componentes reutilizáveis), com contraste WCAG AA em modo claro e escuro (RNF-13, RNF-20).

## Anexo: decisões em aberto e pontos a verificar

As decisões abaixo já têm uma recomendação para não travar o desenvolvimento; os pontos a verificar vieram marcados como incertos na pesquisa.

### Decisões

| Decisão | Recomendação | Motivo |
|---|---|---|
| Critério de "votação relevante" | Divergência entre governo e oposição OU placar com diferença menor que 20% dos votantes OU tipo de matéria (PEC, MP, PLP, orçamento, veto) | Objetivo, auditável e fácil de explicar; ajustar após 3 meses de dados |
| Canal de alertas no MVP | E-mail no MVP; WhatsApp na fase 2 | Custo zero, sem risco de bloqueio, valida o interesse antes de pagar pela Meta |
| Deputados distritais no DF | Um bloco "Seus deputados distritais" explicando que fazem o papel de deputado estadual e de vereador | O DF não tem prefeito nem vereadores |
| Forma jurídica | Começar como projeto pessoal com código aberto; formalizar associação sem fins lucrativos ao buscar editais | Editais e doações exigem CNPJ; uma OSC transmite independência |
| Nome definitivo | Decidir antes do lançamento público e registrar no INPI | "Cobra" é provisório |
| Foco do produto (decidido em 2026-10-26) | "Dinheiro e promessas na sua cidade": obras, emendas e planos de governo no centro; perfis enxutos | Lacuna real frente a Politicômetro, Apuração Brasil e Sólon; aproveita o que já foi construído (banco, rastreabilidade, design system, mapa) |
| Planos de governo (decidido em 2026-10-26) | Plano de quem governa no MVP; comparador de candidatos só em 2028, após parecer | O plano do eleito é material do mandato; o comparador em campanha toca a regra eleitoral do cap. 3 |
| Cores e marcas de partido (decidido em 2026-10-26) | Usar cor, sigla e logotipo do partido e bandeira da UF como identificação, iguais para todos | Facilita reconhecer o político, segue a prática do TSE e das casas; a neutralidade está em não dar nota, ranking nem adjetivo |
| Economia e bolsa (decidido em 2026-10-26) | Economia em números e trilhas educativas na fase 2; Ibovespa diário na fase 3, se houver licença; nunca ações individuais | Fontes oficiais gratuitas para indicadores; licença da B3 e regras da CVM para ações |
| Referência visual (decidido em 2026-10-26) | seuimposto.com (Pandora), com identidade própria | Melhor experiência visual entre as referências pesquisadas |
| Compartilhamento (decidido em 2026-10-26) | Cards e painel de compartilhar no MVP, com prioridade Alta, desde o design system | Distribuição por WhatsApp e redes é o principal canal de crescimento (cap. 11, risco de pouca adoção) |
| Escopo ampliado (decidido em 2026-10-28) | Cobrir tudo o que o Politicômetro oferece (RF-85 a RF-94), com identidade, código e textos próprios, só com fontes oficiais e sem nota nem ranking | Pedido do responsável: é a iniciativa mais parecida com a ideia do Cobra; copiar layout, textos ou marca teria risco de direito autoral e de confusão com o concorrente, e o §13 já exige identidade própria |
| Teste "Quem vota como você?" (em aberto) | Avaliar na fase 2 ou 3, após parecer jurídico; respostas ficariam só no aparelho e no link | Gera engajamento como o 12axes, mas é comparação de afinidade política, que o cap. 3 exclui do MVP, e as respostas são dado sensível (§10.2) |

### Pontos a verificar

- ☐ Limite de requisições da API da Câmara

- ☐ Lista atual de endpoints novos do Senado que substituem os legados

- ☐ Autenticação e limites da API de Transferências Especiais (Transferegov)

- ☐ Estrutura e frequência de atualização do portal de dados abertos da CLDF

- ☐ Existência de API ou exportação no Painel de Obras Paralisadas do TCU

- ☑ API pública do Obrasgov (verificado em 2026-10-26): REST sem chave, OpenAPI publicado, dados atualizados até 23/10/2026; o filtro por UF é `uf_principal`

- ☐ Como ligar empenhos e contratos do Obrasgov às emendas (código da emenda no Portal da Transparência e no Transferegov)

- ☐ Números e vigência das resoluções do TSE citadas na pesquisa

- ☐ Licença e custo da base de CEP

- ☐ Parecer jurídico sobre LGPD, legislação eleitoral e direito de resposta

- ☐ Fontes do escopo ampliado (versão 4.0), a conferir na documentação oficial antes de cada change: TSE (eleitos de 2022 e 2024 por cargo e município), subsídios do Congresso (portais da Câmara e do Senado), remuneração do Executivo federal (Portal da Transparência, servidores e cargos), ministros do STF (portal do STF e dados abertos, se houver), arrecadação federal (Receita Federal e Tesouro Nacional) e a política da Meta para canais do WhatsApp

- ☑ Situação atual dos concorrentes (verificado em 2026-10-26): Apuração Brasil ativo e concorrente direto; Excelências aparenta estar desativado; Radar do Congresso ativo

- ☐ Licença de uso e crédito exigido para as fotos oficiais da Câmara, do Senado e da CLDF

- ☐ Tabela de cores de partidos: fonte de cada cor e processo de revisão

- ☐ Uso de logotipos de partidos (confirmar no parecer jurídico)

- ☐ Preço e modalidade da licença de market data da B3 para o Ibovespa (fase 3)

## Histórico de versões

| Versão | Data | Mudanças |
|---|---|---|
| 1 | 2026-10-20 | Conversão do documento original (.docx) |
| 4.0 | 2026-10-28 | Escopo ampliado para cobrir o que o Politicômetro oferece: RF-85 a RF-94 (todos os eleitos, "Me representa", salários, Executivo, STF, arrecadação oficial, comparador, planos lado a lado, canal no WhatsApp, busca por nome); RF-29 ampliado; matriz, roadmap das fases 2 e 3, decisões e pontos a verificar |
| 3.0 | 2026-10-26 | Foco "dinheiro e promessas na sua cidade"; Politicômetro e Sólon nos concorrentes; obras e emendas (RF-28, RF-34, RF-39 a RF-44, RF-46, RF-48, RF-49) no MVP; planos de governo (RF-80 a RF-84); perfil com RF-35 a RF-38; RF-59 (direito de resposta); regra do "—"; fonte TSE de planos de governo; roadmap e riscos |
| 2.2 | 2026-10-26 | RF-33 e RF-34 (perfil por seções e obras no perfil); RF-46 passa para a fase 2; RF-48, RF-49 e RF-39 (resumo, filtros e ficha da obra); fonte Obrasgov detalhada com a API verificada |
| 2.1 | 2026-10-26 | Compartilhamento: RF-60 e RF-61 revistos (RF-61 passa a Alta), RF-67 a RF-69, jornada de compartilhamento, §13.3; decisão em aberto sobre o teste "Quem vota como você?" |
| 2 | 2026-10-26 | Concorrentes atualizados; RF-09, RF-31, RF-32 (grade visual, mapa, identidade de partido); módulo 4.4b de economia e educação (RF-70 a RF-74, fases 2 e 3); RNF-20; novas fontes de dados; regras de identidade de partido, economia sem causalidade e sem recomendação de investimento (§9.1); riscos novos; roadmap; cap. 13 de identidade visual |
