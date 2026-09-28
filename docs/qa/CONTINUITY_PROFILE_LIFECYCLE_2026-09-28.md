# QA WU-085 — ciclo de vida do perfil

RUN_ID `ATV-20260902-170644Z-01A0630F`. Oito testes HTTP/PostgreSQL PASS: quatro regressões WU-084 e quatro novos cenários de perfil/ACL/forward-fix. Evidência local: `test-results/wu085-profile-guard.log`. Só fixtures sintéticas/PGlite; não certifica JWT/PostgREST ou concorrência multi-conexão hospedada.

Guard bloqueia grant/create/edit para perfil excluído, com rollback de revisão/texto; permite consulta/revogação/delete. Leitura selecionada permanece bloqueada e perfil ativo de outro usuário não é afetado. Forward-fix fecha escrita/leitura selecionada sem DROP ou apagar dados. Nenhuma ativação, migração hospedada, custo ou modelo homologado.

Regressão focal de continuidade: **75 testes PASS** (`wu085-continuity.log`). ESLint focal PASS; Svelte-check **0 erros/0 avisos** (`wu085-check.log`).

Regressão web anterior no SHA WU-084: 849 testes PASS (`wu084-web-regression.log`); CI quality108948341622/secrets108948341924/Pages108948752694 completed/success. Contrato atual: [continuity-profile-lifecycle.md](../contracts/continuity-profile-lifecycle.md).
