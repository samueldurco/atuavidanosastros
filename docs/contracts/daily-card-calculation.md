# Carta do Dia — base persistida

RUN_ID `ATV-20260902-170644Z-01A0630F`; WU132, 28/09/2026. Produto `daily-card`, rota `/carta-do-dia`, entrega de catálogo web. Esta base é parcial e sua política editorial continua candidata.

## Entrada e sorteio

A entrada autenticada existente exige uma pergunta explícita (até 400 caracteres) e consentimento de armazenamento `atv-input-consent/1`; contexto é opcional, até 1200 caracteres. A pergunta e o contexto são dados relatados, não instruções para o modelo nem fontes de aleatoriedade. Não há preenchimento automático de consentimento nem dados pessoais na URL.

O cálculo `atv-symbolic-calculation/1.0.0` usa `atv-tarot-78/1.0.0`, `sha256-counter-rejection-fisher-yates/1` e `atv-question-slots/1.0.0`. O UUID criado pelo servidor fixa uma carta, posição 1, índice de pergunta 0, orientação direta, sem reposição. Pergunta, contexto e chave de idempotência do cliente não alteram a semente. A recuperação reutiliza o sorteio persistido; uma consulta nova cria outra execução. A IA não sorteia.

## Coerência antes da interpretação

`validDailyCardProjection` confere a versão, estado `recorded`, identidade e nome canônicos da carta, quantidade, posição, orientação e metadados exatos da política candidata. Confere a pergunta relatada contra `data.questions[0]` e a carta contra o fato `card-1`, incluindo sua proveniência. O único fato opcional é `tarot-context`, relatado com fonte `input.context`. Os três limites do cálculo devem permanecer íntegros. Dados extras, veredictos e declarações de aprovação não pertencem a esta versão.

Após os limites gerais do facts contract e a presença de base interpretável, a preparação editorial `atv-product-editorial-evidence/1.12.0` bloqueia uma projeção incoerente com `calculation_invalid`, sem alterar o registro ou tentar outro sorteio. Fatos não representáveis e ausência de carta conservam seus motivos próprios de bloqueio. O corpus sintético 1.14.0 mantém os mesmos fatos e requests válidos da versão 1.13.0.

A inspeção comprova consistência interna, não autentica a origem do UUID, não recalcula a semente e não homologa significados, qualidade editorial ou aleatoriedade. A fronteira autenticada e a persistência continuam responsáveis pela autoridade da execução. Não se concede aprovação, promoção ou READY por passar nesta inspeção; leituras e revisões sintéticas servem apenas aos testes.

## Aceite e dependências

Entrada e percurso local já estão documentados em `docs/qa/SYMBOLIC_PRODUCT_INTAKE_2026-09-25.md` e `docs/qa/SYMBOLIC_INTAKE_VERTICAL_2026-09-25.md`. As provas desta inspeção estão em `docs/qa/DAILY_CARD_BASE_2026-09-28.md`. E1 integral depende de revisão da política candidata. E2–E5 dependem de interpretação completa, conteúdo/modelo e revisão legítimos, formatos e percurso hospedado conforme o plano; todos os gates permanecem desligados.
