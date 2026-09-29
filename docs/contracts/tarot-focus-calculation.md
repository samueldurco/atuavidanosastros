# Foco Agora — base persistida

RUN_ID `ATV-20260902-170644Z-01A0630F`; WU135, 28/09/2026. Produto `tarot-focus`, rota `/foco-agora`, entrega web. Base parcial, política candidata; nenhuma interpretação homologada.

## Entrada e cálculo

A entrada autenticada existente exige exatamente uma pergunta explícita de até 400 caracteres e consentimento de armazenamento `atv-input-consent/1`. Contexto opcional até 1200 caracteres é relato consentido. Consentimento começa desmarcado; cards, veredictos, campos adicionais e perguntas extras são rejeitados pelo schema. A pergunta e o contexto não são comandos nem sementes.

O cálculo `atv-symbolic-calculation/1.0.0` preserva `atv-tarot-78/1.0.0`, `sha256-counter-rejection-fisher-yates/1` e `atv-question-slots/1.0.0`. UUID criado pelo servidor, produto e versões fixam uma carta sem reposição, posição 1, índice de pergunta 0 e orientação direta. Recuperação reutiliza o snapshot; uma nova consulta cria outra execução. A IA não sorteia.

A política adicional `atv-tarot-question-products/1.0.0` identifica `tarot-focus`, `interpretationStatus: not-evaluated` e `binaryVerdict: null`. Não calcula recomendação, interpretação nem resposta binária. Os quatro limites originais permanecem íntegros, incluindo “A carta não decide por você.”

## Coerência antes da interpretação

`validTarotFocusProjection` exige versões, estado `recorded`, dez campos de dados exatos, uma carta com ID/nome canônicos e os cinco campos exatos de posição/identidade/orientação. A pergunta em `data.questions[0]` coincide com `question-1`, relatada com fonte `input.questions[0]`. `card-1` é sorteado e preserva display e proveniência das três versões. O único fato opcional é `tarot-context`, relatado com fonte `input.context`. A política possui somente seus quatro campos e não admite veredito ou alegação de aprovação.

Após representabilidade e presença de base interpretável no facts contract, preparação `atv-product-editorial-evidence/1.14.0` bloqueia divergências com `calculation_invalid`. Motivos anteriores de ausência de base ou fatos não representáveis permanecem. Inspeção pura não muda o registro, recalcula a semente, chama provedor nem homologa significados ou aleatoriedade. A autoridade da execução permanece na fronteira autenticada/persistência. Versão nova invalida revisões antigas; não concede READY.

O compartilhamento da inspeção de uma carta preserva o contrato de Carta do Dia e não aplica automaticamente a política de Foco Agora a outro produto. Corpus 1.16.0 conserva os mesmos 105 casos e o fingerprint de requests da versão 1.15.0.

## Aceite e dependências

Entrada, desenho determinístico e vertical de persistência existente: `../qa/TAROT_QUESTION_PRODUCTS_2026-09-28.md`. Provas da coerência: `../qa/TAROT_FOCUS_BASE_2026-09-28.md`. E1 integral permanece bloqueado pela revisão da política candidata. E2–E5 dependem de leitura completa, conteúdo/modelo e revisão legítimos, resultado e percurso hospedado. Gates desligados, R$0, sem migração ou chamada paga.
