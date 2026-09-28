# QA — handoff editorial por produto

RUN_ID `ATV-20260902-170644Z-01A0630F`. WU-111. 28/09/2026.

Entrega: formulário offline `atv-product-review/1.0.0`, todos os campos de julgamento nulos; vínculo exato à captura, saída, corpus, prompt, schema, rubrica, política e critérios/tier. Diagnóstico distingue falta de captura, falta de anotação, incompletude e atendimento condicional às regras existentes. Não há promoção/autenticação ou coleta de revisão humana. Contrato: [product-benchmark-review](../contracts/product-benchmark-review.md).

## Evidência local

- `node --test scripts/product-benchmark-review.test.mjs`:14PASS. Log local `test-results/wu111-review-tests.log`.
- Regressão conjunta de corpus/benchmark/comparação/revisão:50PASS,0FAIL,~13s. `test-results/wu111-lab-regression.log`.
- `pnpm --filter @atv/ai test:unit`:44PASS,0FAIL,~2,4s. `test-results/wu111-ai-tests.log`.
- `pnpm --filter @atv/ai check`:PASS. `test-results/wu111-ai-check.log`.
- `git diff --check` no escopo:PASS; avisos de normalização CRLF não são erros de validação.

Cobertura: template nulo;105casos/104preparados/1bloqueado/312posições e12indisponíveis preservados; todas as12dimensões obrigatórias; pisos7/8/10 reutilizados; critérios falhos; schema/mecânica não sobrepostos por notas; notas malformadas/NaN/Infinity/coerções; notas/evidências ausentes; aliases/datas/campos extras inválidos; adulteração da captura/métrica/identidade/critério; duplicatas e posições estrangeiras; ausência de conteúdo/alias/recibo nos relatórios; imutabilidade; ordem das anotações; custo/latência/tokens desconhecidos; CLI0/1/2, limites16MiB/erros sanitizados/sem gravação de entrada.

O teste com312 declarações sintéticas completas prova apenas que `trustedReviews=0`, `publication=blocked` e `promotionEligible=false` não mudam. Os outputs/notas dos testes são fixtures deliberadamente genéricas, não leituras boas, avaliações humanas, goldens ou chamadas de modelo. Anotações não são importadas para `ReviewAuthority`; o gate de promoção1.4.0 não foi alterado.

Sem alterações visuais/runtime web/Workers/migrações. Gates web da WU110 não foram repetidos para scripts offline. Alterações concorrentes de admin/TikTok/pacotes/lockfile preservadas. Sem rede de inferência, segredos, gasto, email, release ou modelo homologado.

Referência CI anterior WU110 `90a8113b9fdeb2300d4364165e63206db48a9b39`: quality109089157432, secrets109089157295 e CloudflarePages109089602595 completed/success, conferidos por API dedicada. Não substitui CI do novo commit.
