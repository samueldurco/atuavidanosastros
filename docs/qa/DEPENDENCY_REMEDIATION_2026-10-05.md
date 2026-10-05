# WU234 — remediação de dependências — 05/10/2026

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Requisito: segurança/dependências da Onda 8 do plano integral, após os bloqueios externos registrados na fila de produtos. Base isolada: `2c9cc98f558adcf7c9a66ea21d095fa564741061`.

## Alteração e aceite

A auditoria WU231 encontrou 21 advisories (8 altos, 8 moderados, 5 baixos). Atualizações restritas ao lockfile e três overrides direcionados eliminam esses alertas sem alterar versões principais, manifests dos apps, flags ou contratos de produto.

| Dependência | Anterior | Corrigida | Resolução |
| --- | --- | --- | --- |
| devalue | 5.9.2 | 5.9.4 | Faixa existente |
| brace-expansion | 5.0.9 | 5.0.12 | Faixa existente |
| cookie | 0.6.0 | 0.7.2 | Override somente `@sveltejs/kit>cookie` |
| sharp | 0.35.2 | 0.35.4 | Override somente `miniflare>sharp`; binários/libvips correspondentes |
| undici | 7.29.0 | 7.29.1 | Override somente `miniflare>undici` |

SvelteKit 2.70.3, Svelte 5.57.0 e Wrangler 4.128.0 preservados. Overrides são necessários porque as dependências de origem fixam versões vulneráveis. Reavaliar quando os upstreams incorporarem as correções, removendo-os somente com auditoria e compatibilidade verificadas.

## Provas locais

Checkout `E:/ATVNA/.worktrees/pdf-static-routing`, branch `codex/dependency-remediation`, Node 24.18.0 / pnpm 11.19.0. Evidências extensas em `test-results/wu234-*`, ignoradas pelo Git:

- `pnpm audit --json`: exit 0, zero avisos em todas as severidades (`wu234-audit-patched.json`).
- `pnpm install --frozen-lockfile`: PASS (`wu234-install.log`).
- `pnpm check`: PASS, zero erros/avisos Svelte; configuração Wrangler atual (`wu234-check-lf.log`).
- `pnpm lint`: PASS (`wu234-lint-lf.log`).
- `pnpm test:db`: 102/102 PASS, banco local sintético (`wu234-db.log`).
- Smoke direto: cookies HttpOnly/Secure/SameSite e rejeição de nome/domain/path inválidos; roundtrip SSR de Date/Map/Set/BigInt/undefined com devalue; PNG nativo com sharp; request HTTP sintético em loopback com undici. PASS (`wu234-security-smoke.log`).
- `CI=true pnpm test:unit`: 2.185 PASS (1.550 web; 355 worker; 200 pacotes; 80 scripts Lab), zero falhas (`wu234-unit-ci.log`).
- `pnpm build`: PASS, adapter Cloudflare gerado (`wu234-build.log`).
- Onboarding/Biblioteca E2E: 20/21 PASS na primeira execução; o redirecionamento da coleção sem sessão atingiu o prazo de 5s, com resposta de dados 200 no trace e página ainda na coleção. A repetição isolada do mesmo teste passou, incluindo redirecionamento e proteção HTTP (1/1, 17,3s), sem alterar código ou prazos. Registrar a variação de tempo local; não apagar a primeira falha nem alegar uma rodada integral sem falhas. Logs `wu234-e2e.log` / `wu234-e2e-rerun.log`; build existente, porta local 4194, sem chamada a provedores hospedados.

O primeiro check/lint no checkout Windows sinalizou CRLF. Após restaurar a geração diagnóstica de tipos e normalizar apenas os bytes CRLF locais, ambos passaram. O diff final não inclui esses arquivos. A primeira invocação de testes entrou em watch e foi cancelada; a prova válida usa `CI=true`.

## Limites e continuidade

O lockfile em edição paralela no checkout principal não foi alterado. A integração desse checkout exige conciliação posterior, preservando SEO, administração e social. Auditoria sem alertas é evidência das dependências resolvidas e do banco de advisories consultado nessa data; não encerra segurança, produtos, E2 editorial nem liberação hospedada. Supabase pausado, gates comerciais/IA desativados e gasto automático R$0 permanecem.
