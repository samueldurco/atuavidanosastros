# WU-088 — resumo mínimo de continuidade no dashboard

RUN_ID `ATV-20260902-170644Z-01A0630F`. Dados sintéticos locais; nenhuma migração hospedada, ativação ATV+, chamada paga ou homologação de modelo.

- PostgreSQL focal: **7 testes PASS**, incluindo isolamento por proprietário, perfil ausente/excluído, privilégios, chaves exatas sem conteúdo, disabled/revoked, cascata da fonte e forward-fix preservando gestão (`test-results/wu088-db.log`). Regressão `pnpm test:db`: **83 PASS** (`wu088-db-regression.log`).
- Projetor de resumo: **19 testes novos**. Suíte focal com loader: **44 testes / 2 arquivos PASS** (`wu088-unit.log`). Regressão web: **907 testes / 46 arquivos PASS** (`wu088-regression.log`), incluindo arquivos concorrentes não incluídos nesta WU.
- Svelte-check: **0 erros/0 avisos** (`wu088-check.log`). Prettier/ESLint focal dos arquivos alterados PASS. Lint web global encontrou formatação em quatro arquivos concorrentes da integração TikTok/admin; preservados, fora deste commit (`wu088-lint.log`). Não alegar lint global aprovado.
- Primeira rodada E2E: 12 aprovados, seis falhas após queda do servidor local Wrangler/ProxyController (`wu088-e2e.log`). Causa não confirmada; não é evidência de aprovação. Reexecução isolada serial: **18 Chromium PASS** (`wu088-e2e-retry.log`). Build local incluído, sem alterar configuração/bindings.
- Prévia, indisponibilidade, disabled, empty, granted e revoked explícitos; ausência de mutações/API de gestão; cabeçalho no-store; falhas independentes de Biblioteca/perfil natal e nova leitura recuperando o resumo.
- Reflow sem overflow, foco visível e alvo de 44 px a **1440/820/390/320**, reduced-motion. Revisão direta dos PNGs desktop 1440 e mobile 390: hierarquia, contagens e gestão legíveis, sem recorte. Capturas em `apps/web/test-results/tests-dashboard.e2e.ts-visual-and-keyboard-<largura>-chromium/dashboard-<largura>.png`.

MEM-01 (`7b0e4e8f0a1140c58d1709a6f7cdfde0`, Stitch `2141801333950500965`) mantém revisão parcial, não paridade pixel-a-pixel ou Gate B integral. Fixture local não certifica JWT/PostgREST hospedado; 320 px não certifica zoom nativo 400% ou leitor de tela humano. Auditoria persistente, descarte de derivados e executor com revalidação continuam pendentes.
