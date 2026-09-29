# Carta do Dia — cobertura editorial candidata

RUN_ID `ATV-20260902-170644Z-01A0630F`; WU133, 28/09/2026. Produto `daily-card`, rota `/carta-do-dia`, entrega web. Perfil `atv-daily-card-editorial/1.0.0`, prompt `atv-editorial/1.0.8`, preparação `atv-product-editorial-evidence/1.13.0`.

## Fronteira confiável

A preparação seleciona o perfil somente após validar a base persistida descrita em `daily-card-calculation.md`. Conserva o sorteio, os fatos, os limites e os motivos anteriores de bloqueio; não usa o relato para selecionar o perfil. O escopo é `partial`, a capacidade `tarot-reflection`. A IA recebe uma carta `card-1` sorteada, uma pergunta `question-1` relatada com fonte `input.questions[0]` e, opcionalmente, `tarot-context` relatado com fonte `input.context`. Não recebe uma segunda carta ou autoridade de sorteio/aprovação.

## Cobertura finita

São cinco afirmações: dois fatos copiando exatamente os displays de carta e pergunta, cada qual com uma única evidência, e três interpretações/hipóteses:

| Papel | Evidências obrigatórias | Conteúdo exigido para revisão |
| --- | --- | --- |
| `daily-observation` | `card-1` | Possibilidade simbólica, tensão/excesso e exemplo observável no dia. |
| `daily-question` | `card-1`, `question-1` | Conexão explícita com a pergunta, sem veredicto. |
| `daily-practice` | `card-1`, `question-1` | Pequeno experimento reversível e voluntário. |

Contexto recebido pode complementar a evidência; não substitui carta/pergunta nem se torna um segundo fator. Uma mesma parte de síntese reúne os três papéis. Há exatamente uma pergunta prática, terminada em `?`, e `relations=[]` para esta base de carta única. A linguagem deve permanecer simbólica e condicional também na síntese, sem previsão de acontecimentos, destino, prazos, resposta absoluta de sim/não ou prescrição de decisões de saúde, dinheiro e relações. Limites devem declarar base parcial e política candidata, sem garantia de acontecimentos.

A inspeção mecânica verifica a presença/referência dos papéis, quantidade de afirmações, cópia dos fatos, síntese conjunta e formato da pergunta. Ela **não comprova** que o texto é específico, profundo, útil, responsável ou fiel a uma fonte de significados aprovada. Esses requisitos precisam de conteúdo/modelo validado e revisão legítima; uma fixture que passa retorna apenas `needs_editorial_review` ou candidato do Lab. Não há promoção, READY ou publicação por cobertura.

## Versões e provas

O corpus sintético `atv-product-facts-synthetic/1.15.0` adiciona somente o perfil às requisições da Carta do Dia. Remover esse campo restaura exatamente o fingerprint da versão 1.14.0; sorteios, perguntas, contexto e demais fatos permanecem iguais. Casos, estratos e produtos não foram ampliados.

Provas em `docs/qa/DAILY_CARD_EDITORIAL_2026-09-28.md`. E2 integral permanece bloqueado por significados/política candidatos e por modelo/revisão sem homologação legítima. E3–E5 continuam sujeitos aos próprios requisitos persistidos, visuais e hospedados. Gates desligados, sem chamadas pagas ou gastos automáticos.
