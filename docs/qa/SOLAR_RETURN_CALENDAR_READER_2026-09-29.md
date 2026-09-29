# WU197 — leitura privada da grade civil Solar

RUN_ID `ATV-20260902-170644Z-01A0630F`. Escopo: projetar o índice civil de 12 meses de `solar-return` 1.1 para a leitura web do titular quando efetivamente liberada. Não aprova motor, editorial ou publicação.

## Aceite local

- A função SQL preserva os gates existentes de dono, release, entitlement, recibo e promoção. Antes da liberação e após revogação, cálculo e grade são nulos; outro titular não lê a execução.
- A resposta liberada projeta apenas os campos permitidos do calendário e os fatos/limites já existentes. Campos privados adicionados ao snapshot, `calculation.data` e input não atravessam a função.
- O parser valida fronteiras com limitação de dia (inclusive 31/01→29/02), 12 intervalos, fontes/IDs de até três datas `reported`, ausência de duplicidade e data terminal fora do mês 12. Alteração de data, fonte, intervalo ou tipo do fato oculta a grade.
- O componente web mostra os 12 intervalos civis e relatos referenciados; o texto explicita a ausência de trânsitos mensais, eventos, períodos favoráveis e interpretação.

## Provas

- PGlite: `node --test scripts/solar-return-calendar-reader-db.test.mjs scripts/week-reading-reader-db.test.mjs` — 3/3 PASS. O teste Solar usa gates e recibo sintéticos somente no banco descartável.
- Vitest: `pnpm --dir apps/web exec vitest run src/lib/solar-return-calendar.spec.ts` — 3/3 PASS.
- `pnpm --dir apps/web check` — 0 erros, 0 avisos; ESLint e Prettier dos arquivos web afetados PASS.

E1 segue parcial por homologação/licença do motor e percurso real autorizado. E2 depende de método e revisão editorial; E3 tem apenas a projeção local preparada. Migração não aplicada no Supabase hospedado; default13/gates off, R$0. E4–E5 pendentes.
