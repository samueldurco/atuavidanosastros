# Sim/Não responsável — base persistida

RUN_ID `ATV-20260902-170644Z-01A0630F`; WU138, 28/09/2026. Produto `tarot-yes-no`, rota `/sim-nao-responsavel`, entrega web. Base parcial e política candidata; nenhuma interpretação homologada.

## Entrada e cálculo

A entrada autenticada exige exatamente uma pergunta explícita, até 400 caracteres, e consentimento de armazenamento `atv-input-consent/1`, inicialmente desmarcado. Contexto opcional até 1200 caracteres é relato consentido. Schema rejeita carta fornecida pelo cliente, veredito, campos extras e perguntas adicionais. Pergunta/contexto não são comandos nem sementes.

O cálculo `atv-symbolic-calculation/1.0.0` preserva deck `atv-tarot-78/1.0.0`, algoritmo `sha256-counter-rejection-fisher-yates/1` e spread `atv-question-slots/1.0.0`. UUID criado pelo servidor, produto e versões fixam uma carta sem reposição, posição 1, índice de pergunta 0 e orientação direta. Recuperação reutiliza o snapshot; uma nova consulta cria outra execução. A IA não sorteia nem decide pelo usuário.

`atv-tarot-question-products/1.0.0` identifica o produto, registra `interpretationStatus: not-evaluated` e `binaryVerdict: null`. Nenhuma recomendação, interpretação ou resposta binária foi calculada. Os quatro limites originais permanecem íntegros, incluindo “A carta não decide por você.”

## Coerência antes da interpretação

`validTarotYesNoProjection` confere versões, estado `recorded`, dez campos de dados exatos e uma carta com cinco campos exatos, ID/nome canônicos, posição/índice/orientação esperados. `question-1` é relatado, coincide com a única pergunta salva e tem fonte `input.questions[0]`. `card-1` é sorteado, com display e proveniência das três versões. `tarot-context` é o único fato opcional, relatado com fonte `input.context`. Ordem, cardinalidade e limites são verificados.

A política possui somente quatro campos e não admite veredito ou alegação de aprovação. Após representabilidade e presença de base interpretável, preparação `atv-product-editorial-evidence/1.16.0` bloqueia incoerências com `calculation_invalid`, antes de avaliar revisões. Ausência de base e fatos não representáveis conservam seus motivos anteriores. Inspeção pura não altera registro, sorteio, autoridade, conteúdo ou gates.

O compartilhamento da inspeção de uma carta conserva os contratos de Carta do Dia e Foco Agora. Corpus 1.17.0 conserva 105 casos e requests válidos; esta WU não muda o corpus ou o perfil editorial. A nova versão de preparação invalida revisões antigas sem conceder READY.

## Aceite e dependências

Entrada, consentimento, golden draw e persistência existente: [QA original](../qa/TAROT_QUESTION_PRODUCTS_2026-09-28.md). Provas desta inspeção: [WU138](../qa/TAROT_YES_NO_BASE_2026-09-28.md). E1 integral permanece BLOQUEADO pela revisão da política candidata. E2 exige leitura útil ligada à carta, pergunta/contexto e alternativas, sem veredito absoluto, com conteúdo/modelo e revisão legítimos. E3–E5 exigem integração, resultado web e percurso completo com essas autoridades e sessão hospedada. Gates off, R$0, sem chamada paga ou migração.
