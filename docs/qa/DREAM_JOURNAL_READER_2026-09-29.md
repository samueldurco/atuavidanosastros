# Registro de sonho — leitor e percurso local

RUN_ID: `ATV-20260902-170644Z-01A0630F`. WU146, 29/09/2026. Produto `dream-journal`, rota pública `/registro-de-sonho`, entrega de catálogo web. Dados e aprovação dos testes são sintéticos; não constituem interpretação homologada, sessão hospedada ou liberação.

## Requisito entregue

O leitor privado preserva data, relato completo em ordem, emoções, associações pessoais e contexto em grupos de **Fatos registrados**, antes da observação breve e da síntese com uma pergunta exploratória. Cada grupo aponta somente para os fatos correspondentes. Campos opcionais ausentes recebem limites explícitos, sem referências inventadas. A versão de entrega é `atv-product-delivery/1.10.0`.

A base reportada validada é capturada antes da primeira espera assíncrona. Alterar a entrada depois de iniciar a preparação não altera o resultado. Relatos de 6.000 unidades UTF-16, incluindo um par substituto no limite dos trechos, conservam todos os caracteres. A admissão editorial aceita os trechos de 1.800 unidades já produzidos pelo cálculo, exclusivamente no perfil Registro de sonho. Os demais limites e o orçamento do gateway permanecem; admissão dos fatos não garante que qualquer combinação máxima caiba no orçamento de IA.

O registro continua breve e parcial. Histórico não consultado, recorrência não avaliada, nenhuma inferência clínica e nenhum significado universal dos símbolos. Não amplia para Leitura Essencial, dossiê ou atlas. Fixtures não habilitam download, reprocessamento, e-mail nem aprovação legítima.

## Provas locais

| Prova | Resultado / evidência |
| --- | --- |
| Worker | 119/119, `test-results/wu146-worker-final.log`; inclui três casos de entrega: grupos exatos, listas opcionais vazias e relato máximo. |
| IA | 98/98, `test-results/wu146-ai.log`; admissão específica de relato, excesso rejeitado e limites genéricos preservados. |
| Avaliação raiz | 63/63, `test-results/wu146-root.log`; gates preservados. |
| Web e SQL | 1.247/1.247 em 62 arquivos, `test-results/wu146-web-unit-final.log`; inclui persistência privada, publicação sintética, reabertura do pai e reprocessamento do filho conservando seções e base. |
| Checks | IA/Worker passam; web zero erros e zero avisos, `wu146-ai-check.log`, `wu146-worker-check-final.log`, `wu146-web-check.log`. |
| Leitor local | Cinco testes do Registro passam na rodada `wu146-e2e.log`: 1440, 820, 390 e 320 px, teclado, âncora de histórico, recarga, oito fatos e estados pending/revoked/failed. |
| Entrada local | 5/5, `wu146-intake-e2e.log`: consentimento explícito, pedido validado, armazenamento de UUID sem relato e link verificado para Biblioteca; composição/teclado/overflow do Registro nas quatro larguras. Transporte é mockado. |
| Formatação | `wu146-format-check-backend.log` e `wu146-format-check-web.log` passam. |

A rodada inicial dos dez leitores registrou 33 testes aprovados e 18 falhas durante/após a queda do preview local Wrangler (`Network connection lost`). A asserção de largura do Foco Agora falhou nessa interrupção; a repetição do mesmo caso em 390 px passou. Os quatro arquivos afetados foram repetidos com um worker: 20/20 passam, `wu146-e2e-retry.log`. Em conjunto, as duas rodadas cobrem os 51 casos dos dez leitores; duas aprovações são repetidas. Não se declara a primeira rodada integralmente aprovada.

## Inspeção visual

As quatro imagens completas `test-results/wu146-dream-journal-reader-{1440,820,390,320}.png` foram preservadas antes de iniciar outra rodada. Inspeção visual completa e dos recortes `wu146-reader-viewport-{largura}.png`: hierarquia e grupos legíveis, navegação adaptada, título e referências quebram dentro da coluna, sem sobreposição. Entrada inspecionada também nas quatro larguras, imagens `wu056-dream-journal-{largura}.png` produzidas nesta rodada e recortes `wu146-intake-viewport-{largura}.png`: campos e labels cabem na coluna e foco da data permanece visível. Os testes medem ausência de overflow horizontal e acesso por teclado ao histórico. O relato extenso aumenta a altura e reaparece na base auditável; sua integridade é verificada por comparação exata, sem truncamento editorial.

## Aceite E1–E5 e responsáveis

| Marco | Estado integral | Evidência local / condição pendente |
| --- | --- | --- |
| E1 | BLOQUEADO | Entrada e base locais WU056–057/144; sessão real depende do proprietário reativar Supabase. |
| E2 | BLOQUEADO | Perfil e validação WU145; conteúdo/modelo validado e revisão legítima dependem de editorial/operação. |
| E3 | BLOQUEADO | Persistência/reabertura/reprocessamento locais passam; autoridade real e sessão hospedada pendentes. |
| E4 | BLOQUEADO | Leitor web local e quatro larguras passam; resultado completo exige conteúdo homologado. |
| E5 | BLOQUEADO | Percurso local consolidado; aceite integral depende dos itens anteriores. |

Nenhum marco integral foi concluído por fixture. Todos os gates de release permanecem desligados, gasto R$0, sem chamada paga nem operação de provedor nesta WU. Sem novos formatos fora do catálogo. Após fechar as provas locais, avançar à Leitura Essencial de Sonhos, preservando estas pendências e a fila dos 25 produtos, ATV+ e plano original.
