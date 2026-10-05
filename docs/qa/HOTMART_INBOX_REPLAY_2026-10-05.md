# Hotmart — recepção idempotente e conflito de ID

RUN_ID `ATV-20260902-170644Z-01A0630F`. WU225, 05/10/2026. Dependência do plano mestre §13 para comércio e ATV+.

O webhook continua atrás de `FEATURE_HOTMART_LIVE`, valida Hottok e grava somente no `webhook_inbox`. A chave única `(provider, external_event_id)` e o `upsert` com `ignoreDuplicates` preservam o primeiro registro; o endpoint agora relê `event_type` e `payload_hash` antes de responder. Replay com o mesmo corpo é aceito sem voltar o estado a `RECEIVED`. Mesmo ID com evento ou bytes diferentes responde `409 event_id_conflict`, sem substituir o evento já guardado. IDs/eventos vazios e `data` em array são recusados. Erro ou ausência na releitura responde `503`, sem declarar ingestão confirmada.

Provas locais: `vitest` focal 5/5, `pnpm --filter @atv/web check` com zero erros/avisos, ESLint focal e diff check PASS. Os testes usam inbox simulado; a unicidade é imposta pelo esquema SQL existente. Nenhum worker consumiu eventos, associou comprador à conta, reconciliou API, criou compra/entitlement ou demonstrou transporte hospedado. O hash é do corpo bruto, portanto um novo corpo com o mesmo ID é tratado como conflito para revisão operacional, mesmo quando diferenças forem apenas de serialização. Não se registra payload real nesta evidência.

Próximo requisito direto: consumidor idempotente e vínculo de identidade, com mapeamento de ofertas e ciclo de assinatura aprovados; reembolso, chargeback, atraso, expiração e cancelamento devem reconciliar o estado antes de conceder ou revogar acesso. A integração permanece desligada, sem cobrança, liberação ou gasto automático.
