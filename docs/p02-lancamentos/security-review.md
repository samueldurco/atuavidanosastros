# Revisão de segurança e consistência P02

Data: 2026-11-04. Revisão independente de código e SQL sobre o commit `00625d1`, sem acesso ou alteração de dados hospedados.

Escopo: `launch-preparations.ts`, `launch-readings.ts`, os endpoints de preparação/cálculo/leitura/feedback, os três arquivos `20261104*_p02_launch_*.sql` e os auxiliares vigentes de identidade, grant e bindings.

Não foi identificado bypass de identidade, leitura entre proprietários, concessão comercial ou aumento de privilégio a clientes anônimos/autenticados. Os caminhos usam identidade verificada e grant vigente, consultas com proprietário e RLS; as gravações privilegiadas usam apenas entrada/fatos do servidor e precisam de confirmação por leitura autenticada. Os triggers vinculam proprietário e preparação e impedem substituição de fatos/leitura. Feedback usa o cliente autenticado, tem vínculo com a edição e não concede entitlement. As migrações não criam grants de teste nem alteram os contratos de compra.

## Achado concreto

- **P3 corrigido — UUID válido com maiúsculas provocava conflito após salvar feedback.** Em `apps/web/src/routes/api/launch-preparations/[id]/feedback/+server.ts:53`, a confirmação comparava `row.request_key` com o valor literal recebido. `validTrialId` aceita maiúsculas, mas uma coluna PostgreSQL `uuid` devolve a forma canônica minúscula. A primeira submissão com, por exemplo, `ABCDEFAB-1234-4234-8234-ABCDEFABCDEF` podia persistir e em seguida responder 409; a repetição também falhava. Não permitia acesso a outra conta ou alteração da edição. Após o merge `1d1d041`, a chave validada passou a ser normalizada antes da consulta/gravação/comparação. O teste focal cobre primeira submissão e repetição maiúsculas, garantindo somente uma INSERT.

Evidência focal: uma consulta local PGlite `select $1::uuid::text` confirmou que a chave acima passa no validador e volta como `abcdefab-1234-4234-8234-abcdefabcdef`, tornando falsa a comparação literal. A suíte `src/routes/api/launch-preparations/[id]/feedback/+server.spec.ts` passou 32/32 testes após a correção, incluindo autorização, revogação, vínculo com edição, falhas do banco, idempotência e o novo caso de UUID. Não foi executado outro check amplo nesta revisão.

Esta revisão local não afirma execução de migrações, validação de JWT/PostgREST reais ou publicação hospedada. A liberação comercial continua separada da consistência editorial privada.
