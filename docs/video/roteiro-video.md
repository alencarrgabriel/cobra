# Cobra — roteiro de vídeo curto (9:16, motion graphics)

Duração alvo: ~55 s · 13 blocos · Remotion 1080x1920 · fundo preto, branco + dourado (#D9B24C), legenda palavra a palavra.
Todos os números vêm do app em http://localhost:3000 (dados Obrasgov.br atualizados em 23/10/2026; planos do TSE coletados em 27/10/2026). Confirmar antes de publicar, porque a base muda.

## Conceito
1. Gancho com dinheiro concreto: R$ 78,9 bilhões em obras federais no DF, e quase ninguém sabe onde.
2. O Cobra mostra, a partir do CEP, quem te representa, que obras existem perto de você e o que quem governa prometeu.
3. Fechamento: fatos com fonte oficial, sem opinião, sem cadastro, e tudo vira card pra compartilhar.

## Roteiro de narração + plano de cenas

| # | Narração (ElevenLabs) | Tempo | Cena | Destaques na legenda | Print |
|---|---|---|---|---|---|
| 01 | Tem quase setenta e nove bilhões de reais em obras federais no Distrito Federal. Você sabe onde estão? | 5 s | Contador R$ 0 → 78,9 bi em serifa grande; rótulo "1.147 OBRAS · OBRASGOV.BR" | **79 bilhões**, **onde** | — |
| 02 | Os dados são públicos. Mas estão espalhados em portais que quase ninguém consegue usar. | 4,5 s | Linhas de conexão: 5 rótulos pontilhados (CÂMARA · SENADO · TSE · TRANSPARÊNCIA · OBRASGOV) se espalhando | **públicos**, **espalhados** | — |
| 03 | O Cobra junta tudo num lugar só. | 2,5 s | Pontos convergem e formam o logo "C" → título serifa "Cobra" | **Cobra** | — |
| 04 | Você digita o seu CEP. Sem cadastro, e o CEP nem fica guardado. | 4,5 s | Celular com print, digitação animada no campo | **CEP**, **sem cadastro** | P01, P03 |
| 05 | E aparecem os seus representantes: três senadores e oito deputados federais, com foto e partido. | 5 s | Celular rolando a grade; contador "3" e "8" em dourado ao lado | **seus representantes** | P04, P05 |
| 06 | Toca num card e vê o resumo: cargo, partido, desde quando está no mandato. | 4 s | Gaveta subindo no celular | **resumo** | P06 |
| 07 | Agora o dinheiro. Mil cento e quarenta e sete obras pagas com recurso da União. | 4,5 s | Mapa pontilhado do DF, pinos dourados acendendo em grupos | **dinheiro**, **1.147 obras** | P07, P08 |
| 08 | Trezentas e duas concluídas. Cento e oitenta e duas em andamento. E algumas paradas. | 4,5 s | Barras/contadores por situação; "paralisada" e "inacabada" ficam em destaque | **paradas** | P07, P09 |
| 09 | Como o quartel dos bombeiros no Sol Nascente: três milhões e trezentos mil previstos, quatro por cento feito. | 5,5 s | Celular com a obra; zoom no "4,33%" e no valor | **bombeiros**, **4%** | P10 |
| 10 | Parado há dezessete meses. E o app mostra a justificativa, do jeito que o gestor registrou. | 5 s | Documento/carta: moldura pontilhada "escrevendo" a justificativa; contador 17 MESES | **17 meses**, **justificativa** | P11 |
| 11 | Do outro lado, a promessa: o plano de governo registrado no TSE, por tema, com o texto original. | 5 s | Folhas de PDF se empilhando → print dos temas | **promessa**, **TSE** | P12, P13 |
| 12 | Sem nota, sem ranking, sem opinião. Só fato, com fonte oficial e data. | 4 s | Três palavras riscadas em sequência; rótulo "FONTE · DATA" em dourado | **fato**, **fonte oficial** | — |
| 13 | E tudo vira card pra mandar no WhatsApp. Salva esse vídeo e cobra quem te representa. | 5 s | Painel Compartilhar no celular → logo final | **WhatsApp**, **cobra** | P15 |

Total estimado: ~59 s.

## Prints a capturar (celular, 1080x1920 ou 375x812 @3x)
| Arquivo | Tela / URL | Posição |
|---|---|---|
| P01.png | / (início) | topo: "O que fazem os políticos que representam você" |
| P02.png | / | mapa do Brasil (opcional, extra para B-roll) |
| P03.png | / | campo com CEP 70040-010 digitado |
| P04.png | /representantes/5300108 | topo "Seus representantes em Brasília (DF)" + filtros de partido |
| P05.png | /representantes/5300108 | grade de cards (seção Senadores) |
| P06.png | /representantes/5300108 | gaveta aberta de um card |
| P07.png | /obras | Resumo: 1.147 obras, R$ 78,9 bi, situações |
| P08.png | /obras | mapa "Onde ficam" com os pinos |
| P09.png | /obras?situacao=paralisada | lista de paralisadas |
| P10.png | /obras/10930.53-87 | topo: 42º GBM Sol Nascente, valor e 4,33% |
| P11.png | /obras/10930.53-87 | seção Prazos + Paralisações (justificativa) |
| P12.png | /planos | lista de planos |
| P13.png | /planos/2022-governador-df | temas do plano |
| P14.png | /planos/2022-governador-df?q=bombeiros | resultado da busca (opcional) |
| P15.png | /obras/10930.53-87 | painel Compartilhar aberto (card + botão WhatsApp) |

Dica: no Chrome, F12 → modo dispositivo (iPhone 12 Pro) → Ctrl+Shift+P → "Capture screenshot".

## Prompt de voz (ElevenLabs)
Voz masculina ou feminina, português do Brasil, tom de documentário curto: firme, curioso, sem alarde. Ritmo médio-rápido, pausa curta antes dos números. Stability 45, Similarity 75, Style 20. Um arquivo por bloco: bloco01.mp3 … bloco13.mp3.

## Cuidados
- Neutralidade (princípio do DDR): não sugerir culpa de ninguém pelo atraso da obra nem relacionar a obra ao plano do governador como causa. Narração só descreve.
- Na cena 06, preferir mostrar a gaveta de forma rápida ou com o nome desfocado, para o vídeo não parecer sobre um político específico.
- Não mostrar "Votações" nem "emendas" no vídeo: no app ainda estão "em breve" / sem dados.
