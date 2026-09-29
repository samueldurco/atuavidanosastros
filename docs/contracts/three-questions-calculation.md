# Três Perguntas — base persistida

RUN_ID `ATV-20260902-170644Z-01A0630F`; WU141, 29/09/2026. Produto `three-questions`, rota `/tres-perguntas`, entrega web. Base parcial e política candidata; não há interpretação homologada.

## Entrada, sorteio e limites

A entrada autenticada exige exatamente três perguntas, cada uma não vazia e até 400 caracteres, consentimento explícito de armazenamento `atv-input-consent/1` e contexto opcional relatado até 1200 caracteres. Campos extras, carta do cliente e ausência de consentimento são rejeitados pelo schema. O texto não é comando nem semente.

`atv-symbolic-calculation/1.0.0`, deck `atv-tarot-78/1.0.0`, algoritmo `sha256-counter-rejection-fisher-yates/1` e spread `atv-question-slots/1.0.0` fixam três cartas únicas, sem reposição e em posição direta, a partir do UUID criado pelo servidor, produto e versões. Posição 1/2/3 corresponde a índice de pergunta 0/1/2. Recuperação/reprocessamento preservam o snapshot; nova consulta cria outra execução. O modelo não sorteia.

Os três limites originais permanecem íntegros: registro de sorteio sem previsão/interpretação homologada; uma carta por pergunta, sem reposição e somente direta, com política candidata sujeita a revisão; reprocessamento preserva cartas e nova consulta cria execução. Esse produto conserva seus nove campos de dados originais e não recebe a política adicional de Foco Agora/Sim-Não.

## Facts contract e coerência

`validThreeQuestionsProjection` inspeciona estado `recorded`, versões/proveniência, campos exatos, cardinalidade e ausência de alegação de aprovação. Cada carta tem ID/nome canônicos, posição e índice correspondentes e orientação direta; IDs não se repetem. A inspeção compartilhada mantém os contratos existentes de uma carta.

Seis fatos em ordem alternada vinculam `question-1/card-1`, `question-2/card-2` e `question-3/card-3`. Cada pergunta é `reported`, coincide com o texto salvo e tem fonte `input.questions[i]`. Cada carta é `drawn`, com display posicional e fonte formada pelas três versões do sorteio. `tarot-context` é o único fato opcional, `reported`, fonte `input.context`. Nada é inferido do contexto, que não altera as cartas.

Após validação geral, representabilidade e presença de base, preparação `atv-product-editorial-evidence/1.18.0` bloqueia incoerências com `calculation_invalid`; mantém os motivos anteriores para ausência de base e fatos não representáveis. A nova versão entra no digest de revisão. Inspeção pura não altera dados, sorteio, autoridade editorial ou gates; não autentica a semente nem reconstitui o sorteio.

## Aceite e dependências

Entrada e consentimento: [WU056](../qa/SYMBOLIC_PRODUCT_INTAKE_2026-09-25.md). Persistência e recuperação local: [WU057](../qa/SYMBOLIC_INTAKE_VERTICAL_2026-09-25.md). Coerência: [WU141](../qa/THREE_QUESTIONS_BASE_2026-09-29.md). E1 integral permanece BLOQUEADO pela homologação da política candidata. E2 exige leitura útil por pergunta/carta, relações, tensões/alternativas e reflexão, ligada somente à base e ao contexto consentido, com conteúdo/modelo/revisão legítimos e sem fatalismo ou resposta binária absoluta. E3–E5 exigem fluxo aprovado, resultado web, salvar/reabrir e aceite hospedado. R$0, sem chamada paga, migração ou release.
