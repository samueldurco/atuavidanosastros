# QA WU-086 — continuidade na Biblioteca

RUN_ID `ATV-20260902-170644Z-01A0630F`. Dados sintéticos, API interceptada na suíte de navegador e verificação local. Sem ativação, migração hospedada, gasto ou modelo homologado.

- 17 testes novos de parser/transporte: projeção estrita, limites, cópia defensiva, rótulos, sessão/no-store/timeout e ausência de retry. Regressão web completa: **870 testes / 44 arquivos PASS**, incluindo testes locais concorrentes que não fazem parte do commit (`test-results/wu086-unit.log`).
- **11 testes Chromium PASS** (`test-results/wu086-e2e.log`): consentimento explícito, nota, revisão CAS, revogação, exclusão; Escape/restauração de foco; HTTP 401/409; perda de resposta após commit; falha de consulta após recibo; nova consulta/reload sem reenvio; snapshot inválido; texto hostil escapado; policy desligada; mudança de escopo invalida aceite; ausência de nota/ID em URL/storage.
- Build local executado pela suíte PASS. Reflow sem overflow horizontal a 1440×1000, 820×1180, 390×844 e 320×800, com reduced-motion. Screenshots: `apps/web/test-results/tests-continuity.e2e.ts-continuidade-composição-<largura>-chromium/continuity-<largura>.png`.
- Svelte-check **0 erros/0 avisos**, ESLint focal, diff-check e scanner de segredos staged PASS (`wu086-check.log`, `wu086-lint.log`).
- Revisão visual direta dos PNGs 1440 e 390: hierarquia editorial, campos/consentimento legíveis, ações e notas sem corte; verificações de geometria nos quatro tamanhos. 320 px é evidência de reflow, não teste de zoom nativo 400%. Não certifica leitor de tela humano.
- MEM-02/CMP-02/SH-02 reutilizados conforme [contrato](../contracts/continuity-library.md); exports de referência incompletos. Estado visual continua **VISUAL_REVIEW_PARTIAL**, não Gate B integral ou aprovação humana.

A suíte de navegador não é prova de JWT/PostgREST/CSRF hospedados. Os handlers reais e SQL têm evidência separada WUs 084/085. Gestão persistente não é execução longitudinal, homologação editorial ou conclusão dos seis universos. CI pelo SHA será registrada no log canônico.
