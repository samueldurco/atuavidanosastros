# P02 — persistência da entrega de teste privado

RUN_ID `ATV-20260902-170644Z-01A0630F`, 04/11/2026. A skill `supabase` foi aplicada. A migration foi criada pela CLI instalada 2.116.0: `pnpm exec supabase migration new p02_launch_readings`. Depende de `20261104102635_p02_launch_preparations.sql`; nenhum ambiente hospedado foi alterado.

## Identidade e imutabilidade

`public.atv_launch_readings` guarda uma única entrega por `preparation_id`, PK e FK para a preparação original. Esse UUID também é `reading.executionId`. Não há segundo ID. `owner_id`, `product_id` e `input_digest` precisam corresponder à preparação existente, no estado `FACTS_READY_AWAITING_REVIEW`. Entradas e evidências dessa preparação já são imutáveis após a transição de cálculo.

São armazenados `calculation_digest`, `reading_digest`, `reading`, `review` e `created_at`. Os três digests de coluna exigem SHA-256 hexadecimal minúsculo. O contrato confirmado com o runtime usa:

- Leitura: `atv-launch-reading/1`, com `executionId`, `productId`, `inputDigest`, título, resumo, seções, ação, reflexão, limites e proveniência.
- Revisão: `atv-launch-reading-review/1`, política `atv-launch-private-editorial-policy/1`, `checks` e `reasons` como arrays e `digest` igual ao `reading_digest`.
- Estado inserível: somente `APPROVED_FOR_PRIVATE_TEST`. `REJECTED` não é persistido nessa tabela. O servidor pode apresentar a rejeição na preparação, sem criar uma entrega aprovada.
- `review.provenance.scope=private-editorial-consistency`, `commercialPrecisionApproved=false` e `commercialReleaseApproved=false`. Aprovação de consistência privada não autoriza comércio, publicação ou promessa de precisão.

O banco valida o envelope, vínculo, versão, estado privado e limite em bytes: leitura até 2.000.000 e revisão até 262.144. O servidor precisa validar conteúdo de cada seção/check, referências a fatos/corpus, reexecutar a revisão e calcular os digests sobre JSON canônico antes do `INSERT`. O SQL não tenta substituir a ordenação canônica binária de chaves do runtime por `jsonb::text`. Ter um digest com formato válido não prova que o conteúdo foi calculado corretamente; o escritor de serviço continua uma fronteira de confiança.

Repetir a preparação causa conflito de PK. A API pode inserir com `ON CONFLICT DO NOTHING` e reler a primeira entrega, comparando digests. Não pode atualizar a leitura ou gerar outra tiragem para substituir a primeira persistida. Nem `authenticated` nem `service_role` recebem `UPDATE`, `DELETE` ou `TRUNCATE`; um trigger de `UPDATE` também rejeita alterações. Exclusão administrativa deliberada de usuário/preparação mantém a cascata de FK; não é uma operação concedida a esses papéis.

## Acesso

RLS libera `SELECT` ao próprio proprietário somente enquanto `has_atv_trial_access()` for verdadeiro. Os grants padrão são revogados explicitamente. `anon` não tem acesso; `authenticated` recebe apenas `SELECT`; `service_role`, somente `SELECT, INSERT`.

O trigger é `SECURITY INVOKER`, com `search_path=''` e nomes qualificados. Confere a concessão atual, ausência de revogação e expiração também na inserção privilegiada. Em seguida vincula proprietário, produto, entrada e estado à preparação persistida. O navegador não escolhe um proprietário autoritativo. Revogação/expiração oculta a leitura existente e impede novas inserções; restaurar o acesso não apaga nem reescreve a entrega.

## Verificação

`node --test scripts/p02-launch-preparations-db.test.mjs scripts/p02-launch-readings-db.test.mjs scripts/migration-versions.test.mjs`

Resultado: **18 testes aprovados**. Os oito testes específicos da leitura cobrem leitura entre proprietários/anon, privilégios, imutabilidade, primeira entrega preservada, preparação inexistente ou sem cálculo, substituição de identidade/produto/entrada, envelopes/digests/tamanho, rejeição editorial/flags comerciais, revogação/expiração e forward-fix. Os testes da preparação também verificam cálculo dos onze IDs e chave UUID de pedido não restrita à versão 4.

PGlite executou PostgreSQL/RLS descartável com usuários e dados sintéticos. Os fixtures de revisão no teste SQL são envelopes de segurança, não homologações editoriais reais. Não houve teste de JWT/PostgREST, deploy, pagamento ou modelo externo. O advisors local segue indisponível por ausência de cluster em `127.0.0.1:54322`, conforme [preparation-persistence.md](preparation-persistence.md). Changelog e documentação oficial já consultados para essa mesma alteração de Supabase; nenhuma nova integração ou versão foi adicionada.

## Forward-fix

`supabase/rollbacks/20261104103423_p02_launch_readings.sql` revoga acesso de cliente e escritor, preservando entregas e revisões. O teste aplica o arquivo e comprova o fechamento sem perda de dados. Se ambas as superfícies precisarem ser fechadas, fechar leitura e preparação; restaurar exige nova migration revisada. Não marcar as migrations como aplicadas remotamente nem modificar scripts de deploy nesta etapa.
