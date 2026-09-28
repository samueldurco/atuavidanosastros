# WU-082 — persistência privada de continuidade

RUN_ID: ATV-20260902-170644Z-01A0630F.

Migração expand-only e forward-fix locais, feature default-off. Nenhum modelo homologado, gasto, ativação ATV+, provider ou migração hospedada.

## Evidência

- `test-results/wu082-db.log`: 12/12 testes (11 cenários + suíte pai) PASS em PGlite/PostgreSQL sintético. Policy false; consentimento legado sem autoridade; RLS/ACL e papéis anon/authenticated/service; negação de fonte alheia/ausente/indisponível; CAS; parent fixo/UUID alheio; formatos e orçamento UTF-16; promoção revogada; revogação atual; ciclos experimentais; exclusão da fonte; minimização da listagem; quota 100; forward-fix preservando leitura/revogação/exclusão.
- Teste de ciclos inicialmente falhou porque o helper genérico fornecia kind natal para produto cycles. Fixture corrigida explicitamente no teste local; regras produtivas não foram relaxadas. Reexecução PASS.
- `test-results/wu082-db-regression.log`: 76/76 testes de banco PASS. Check global (`wu082-check.log`) interrompido por TS5097/TS2307 em arquivos concorrentes não commitados de `packages/fabrica-de-midia`; não corrigidos nem incluídos nesta WU. Verificação isolada do pacote domínio e CI do commit distinguem essa limitação do código entregue.
- Nenhum dado pessoal real. Testes de papel usam stub de auth.uid; não certificam JWT real, PostgREST, RLS em deployment ou concorrência entre conexões independentes.

## Entrega e pendências

Persistência e controles RPC fecham uma fronteira de segurança, não uma experiência ATV+ completa. UI, repositório minimizado para contexto, auditoria, descarte de derivados e executor ainda pendentes. A lista de gestão é privada, mas não é autorização para uso em modelo. O forward-fix não destrói notas: continua possível revogar e excluir.
