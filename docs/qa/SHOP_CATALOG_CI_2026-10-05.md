# Loja: teste do catálogo privado na suíte de banco

RUN_ID: `ATV-20260902-170644Z-01A0630F`
WU: `WU-229-SHOP-CATALOG-CI`

O script raiz `test:db`, executado pelo workflow `.github/workflows/ci.yml`, agora inclui `scripts/shop-catalog-db.test.mjs`. O teste exercita a migração do catálogo candidato em PostgreSQL local, inclusive isolamento de candidatos e ausência de publicação de ofertas.

Validação local em 05/10/2026: `pnpm test:db` — **102 testes aprovados, 0 falhas**. A linha `shop candidates stay private and cannot become published offers` passou. Log: `test-results/shop-catalog-ci-db-2026-10-05.log` (artefato local ignorado pelo Git).

Esta validação não migra o Supabase hospedado, não cria SKUs/ofertas e não comprova a execução do CI hospedado para este commit. Gates de publicação, catálogo comercial e checkout permanecem fechados.
