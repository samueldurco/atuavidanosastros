# WU202 — leitura privada da grade civil do Calendário pessoal

RUN_ID `ATV-20260902-170644Z-01A0630F`. Escopo: tornar acessível a entrada privada de `personal-calendar` e preparar a leitura factual da grade de 28–31 dias somente para um run legitimamente liberado. Este aceite local não aprova método astrológico temporal, editorial nem publicação hospedada.

## Aceite local

- A rota `/biblioteca/nova/personal-calendar` aceita sessão autenticada e consulta o acesso mínimo; o gate de `request_product_run` continua fechado. O formulário de WU201 conserva a autorização específica dos marcos pessoais.
- `read_product_run` projeta somente mês, datas civis e fatos existentes quando os gates de titular, estado, release, entitlement, recibo editorial e promoção passam. Antes da liberação e após revogação, cálculo e grade são nulos. Outro titular não lê o run. Input, carta natal completa e `calculation.data` não atravessam a função.
- A projeção limita 28–31 datas de formato civil. O parser exige primeiro dia do mês, limite exclusivo correto, sequência contínua, fatos civis com fonte e até cinco marcos `reported` com IDs, datas e fontes correspondentes. Corrupção ou conflito oculta a grade.
- O leitor web identifica o Sol natal como referência estática, atribui os marcos ao relato do titular e explicita que não há trânsito, evento ou previsão diária.

## Provas

- PGlite: `node --test scripts/personal-calendar-grid-reader-db.test.mjs scripts/solar-return-calendar-reader-db.test.mjs` — 2/2 PASS, incluindo regressão da projeção Solar após a nova migração.
- Vitest focal: `pnpm --filter @atv/web exec vitest run src/lib/personal-calendar-grid.spec.ts src/lib/server/symbolic-intake.spec.ts src/lib/server/personal-calendar-request.integration.spec.ts` — 45/45 PASS.
- `pnpm --filter @atv/web check` — 0 erros, 0 avisos. ESLint e Prettier dos arquivos web afetados passaram.
- Suíte web completa: 1464/1466 PASS em 75 arquivos. As duas falhas de renderização de PDF em `couple-dossier-reader` e `synastry-reader` ocorreram sob carga paralela; ambos os arquivos passaram isolados, 6/6 testes. Não houve alteração de código PDF nesta WU.

E1 permanece parcial: grade civil e marcos declarados não suprem fonte, licença, método ou homologação temporal por dia. E2–E5 continuam pendentes. A migração não foi aplicada no Supabase hospedado; default13/gates off, R$0. Para reverter localmente, restaure a função `read_product_run` da migração anterior e retire o componente e parser da leitura web; os recibos privados de WU201 não são alterados.
