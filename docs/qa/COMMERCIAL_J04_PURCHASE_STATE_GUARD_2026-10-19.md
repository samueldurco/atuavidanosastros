# J04 — guarda local do ciclo de compra

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Escopo estrito: estados de `public.purchases` no banco. **Implementado e testado localmente; migração não aplicada no Supabase hospedado.** Não há checkout ou cobrança ativados.

## Problema e mudança

O domínio define `PENDING → APPROVED/CANCELLED` e `APPROVED → CANCELLED/REFUNDED/CHARGEDBACK`, com `CANCELLED`, `REFUNDED` e `CHARGEDBACK` terminais (`packages/domain/src/commerce.ts:1–14`). A tabela existente verificava apenas a lista de estados (`supabase/migrations/20260902170000_initial_platform.sql:116–129`), permitindo, por exemplo, reaprovar um reembolso por uma atualização atrasada.

A migração `supabase/migrations/20261019143000_purchase_state_guard.sql` aplica esse grafo a cada `UPDATE OF state` com trigger. Mudanças para o mesmo estado são idempotentes. Um evento tardio que tente `REFUNDED → APPROVED` falha com `23514`; a compra continua reembolsada. A função do trigger não concede direitos, não lê webhook e não está executável diretamente pelos papéis da API.

## Contenção e reversão

- `supabase/forward-fixes/freeze_purchase_approvals.sql` suspende novas inserções `APPROVED` e transições para `APPROVED`, preservando as transições de revogação de uma compra já aprovada. Reaplicar a migração principal remove a suspensão e restaura o grafo original.
- `supabase/rollback/20261019143000_purchase_state_guard.sql` remove a função e os triggers sem alterar compras ou entitlements. Usar somente com o reconciliador/checkout desativado, pois deixa de bloquear transições inválidas.
- A migração é transacional. O teste confirma que um `ROLLBACK` antes de commit não deixa função ou trigger instalado.

## Prova focal

`node --test scripts/purchase-state-guard-db.test.mjs scripts/purchase-entitlement-gate-db.test.mjs scripts/owned-offer-lookup-db.test.mjs`: 3 testes passaram. O teste novo em PGlite cobre transições permitidas, idempotência, rejeição de estados terminais reabertos e de transições inválidas, preservação de compra/entitlement existente, contenção, retomada e rollback. Os dois testes adjacentes de autorização também passaram. `git diff --check` passou.

## Limites para a liberação comercial

Esta guarda cobre **atualizações de estado**, não a autenticidade de uma inserção inicial `APPROVED`. A inserção direta permanece possível para o futuro reconciliador autorizado; a contenção pode suspendê-la se necessário. O receptor Hotmart hoje apenas verifica Hottok e grava o inbox, com a flag live desativada (`apps/web/src/routes/api/webhooks/hotmart/+server.ts:9–51`); não existe consumidor `hotmart.reconcile` (`apps/worker/src/index.ts:30`). Os gates de produto já revalidam compra `APPROVED`, mas esta migração não sincroniza entitlement automaticamente após cancelamento/estorno. Ainda faltam mapeamento externo aprovado, prova de titularidade, fixtures de eventos e reconciliador com autoridade Hotmart para conceder ou revogar direitos. PGlite não substitui teste no ambiente hospedado.
