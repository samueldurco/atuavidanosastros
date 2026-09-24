# WU-052 — continuidade natal no dashboard

RUN_ID: ATV-20260902-170644Z-01A0630F. Data: 2026-09-24.

## Escopo e evidência

Dashboard MEM-01 integrado ao estado natal recuperado. Consulta da Biblioteca e RPC natal isoladas, com limite de dez segundos e erro sanitizado. Proprietário vem da sessão validada pelo layout; consulta da Biblioteca filtrada por esse proprietário, além de RLS. Snapshot natal estritamente validado antes de projetar somente estado/precisão. Não serializa nascimento, revisão ou consentimentos.

- 22 testes novos de servidor: estados, precisão, projeção mínima, erros independentes, payloads inválidos, escopo, timeout, autenticação, headers e isolamento da rota QA.
- Suíte web: 147 testes, 20 arquivos, PASS (`test-results/wu052-web.log`).
- Navegador local: 11 PASS (`test-results/wu052-e2e.log`), seis estados, recuperação independente, teclado/Enter/foco, alvo natal mínimo de 44px, reduced-motion e ausência de overflow em 1440/820/390/320.
- Capturas finais em `test-results/wu052-browser/dashboard.e2e.ts-visual-and-keyboard-{width}/dashboard-{width}.png`, inspecionadas nas quatro larguras. Corrigida corrida do teste: aguarda hidratação, recusa analytics explicitamente e aguarda remoção do banner antes de capturar; sem consentimento simulado.
- Check: zero erros/warnings; ESLint/Prettier focais, diff-check e build web PASS. Logs `wu052-check.log`, `wu052-lint-focused.log`, `wu052-format-check.log`, `wu052-build.log`. `pnpm lint` amplo bloqueado por formatação em quatro arquivos concorrentes de admin/TikTok, não alterados nesta WU (`wu052-lint.log`); não é PASS global.

## Referência visual e limites

Stitch canônico 2141801333950500965, MEM-01 7b0e4e8f0a1140c58d1709a6f7cdfde0. Cache em `test-results/gate-b/references`. HTML SHA256 D125FB94157C029529157FEBA3D9C638DA8E4380E6A8588D02C98F477E88EA5F; PNG SHA256 336A79109C9E9B674A238F9FD4B27625D427B337055F18F66CFBE901ED1607DC.

Mantida a composição existente de atenção, retomada de Biblioteca, contexto e universos. Export PNG de referência incompleto, majoritariamente em branco: não certifica paridade pixel a pixel. QA local usa dados sintéticos e servidor de teste; não prova JWT/PostgREST hospedado, leitor de tela humano ou zoom nativo 400%. A rota `_spec` recusa hosts não loopback, sem dados reais.

Nenhuma migração hospedada, ativação de ATV+, processamento, promoção ou gasto. Perfil salvo não equivale a produto liberado. Todos os releases/policies permanecem false; nenhum modelo homologado. Alterações concorrentes de admin/integrações/fábrica de mídia preservadas.
