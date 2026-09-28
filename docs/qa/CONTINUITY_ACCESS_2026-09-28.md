# WU-089 — auditoria privada de seleção

RUN_ID: ATV-20260902-170644Z-01A0630F. Ambiente local sintético; sem migração hospedada, modelo homologado, executor, custo ou ativação de continuidade.

## Evidência

- `node --test scripts/product-continuity-access-db.test.mjs`: 10/10 PASS. Default-off/retenção NULL, grants e núcleo privado, isolamento, metadados sem conteúdo, ordem/revisões, rollback da escrita, quota de 1.000, expiração, purge estreito, exclusão por item/fonte/perfil, seleção multi-fonte e forward-fix. Limpeza preservada com policy desligada/consentimento revogado/perfil soft-deleted. `test-results/wu089-db.log`.
- `pnpm test:db`: 93/93 PASS; `test-results/wu089-db-regression.log`.
- Vitest web completo: 908 testes/46 arquivos PASS; `test-results/wu089-web-regression.log`. Inclui arquivos concorrentes locais não integrantes do commit.
- Integração focal SQL → servidor → domínio: 11/11 PASS, inclusive seis universos sintéticos e falha de auditoria sem texto ou evento parcial; `test-results/wu089-integration.log`.
- `svelte-kit sync` + `svelte-check`: 0 erros/0 avisos após corrigir tipagem de contagens nos testes; `test-results/wu089-check.log`.
- Prettier/ESLint focal PASS. Sem mudança visual; E2E/Gate B não reexecutados nesta unidade. Lint global tinha quatro arquivos concorrentes TikTok/admin fora do escopo na WU-088; não alegado aprovado aqui.

## Limites e recuperação

Contrato [continuity-access.md](../contracts/continuity-access.md). Expiração lógica, descarte em nova seleção e RPC de manutenção comprovados apenas localmente; **não existe scheduler de descarte físico**. Retenção de produção não definida (NULL); 7 dias exclusivamente fixture. Registro não comprova consumo por IA ou entrega ao chamador. API/UI de gestão dos acessos, descarte de derivados, executor e QA hospedado/concorrência real pendentes.

Forward-fix desliga policy e revoga leitura auditada/núcleo, preservando inspeção/limpeza/revogação/manutenção. Não reativa caminho sem auditoria nem remove dados existentes. Nenhum segredo, dado pessoal real ou alteração concorrente é incluído deliberadamente nesta unidade.
