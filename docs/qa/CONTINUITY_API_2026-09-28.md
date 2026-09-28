# QA WU-084 — API de continuidade

RUN_ID `ATV-20260902-170644Z-01A0630F`. Somente fixtures sintéticas e PostgreSQL local. Nenhuma migração hospedada, ativação, gasto ou modelo homologado.

- 57 testes HTTP: quatro adapters reais, autenticação/origem/query, payload/UTF-8/content-type, schemas e limites, recibos estritos, projeção privada, erros sanitizados e ausência de retry.
- 4 testes HTTP → PostgreSQL: gestão/seleção/relevância/revogação/exclusão, commit com resposta perdida e recuperação CAS, sessão estrangeira e policy desligada. Mais 10 regressões do leitor selecionado: total focal **71 PASS** (`test-results/wu084-continuity.log`).
- Domínio: **28 testes PASS** e TypeScript PASS após extrair parser compartilhado do seletor.
- ESLint focal PASS; Svelte-check **0 erros/0 avisos** após gerar tipos das quatro rotas.
- Não é prova de JWT/PostgREST remoto, navegador implantado, concorrência real, qualidade editorial ou entrega completa dos seis universos. Perfil soft-deleted já bloqueia preparação, mas o guard de grant/save ainda é pendência focal.

Contrato: [continuity-api.md](../contracts/continuity-api.md). Evidência estática em `test-results/wu084-check.log`; CI será registrada no log canônico pelo SHA.
