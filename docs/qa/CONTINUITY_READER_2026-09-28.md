# QA WU-087 — referências de continuidade no leitor

RUN_ID `ATV-20260902-170644Z-01A0630F`. Fixtures sintéticas locais; transporte interceptado. Nenhum modelo homologado, gasto, migração hospedada ou ativação ATV+.

- 15 testes novos do projetor de referências; suíte focal com gestão: **32 testes / 2 arquivos PASS** (`test-results/wu087-unit.log`). Regressão web: **885 testes / 45 arquivos PASS** (`wu087-regression.log`), incluindo arquivos concorrentes não incluídos nesta WU. A correção posterior do filtro de controles foi revalidada na suíte focal.
- Cobertura nova: candidatos nos seis universos; gates de leitura; limites de texto/índice; fatos de ciclos calculados e únicos; seletores sem cópia de texto; escolha explícita; limpeza ao trocar origem/tipo; remount de leitura; ausência em fixtures normais sintéticas/revogadas; CAS e recuperação sem repetir save.
- Corrigido erro real de edição de hipóteses: o parser com cópia defensiva recebia um proxy reativo. A UI agora entrega um snapshot; teste de navegador revisa relevância preservando o seletor e exige ausência de erros de página.
- A rodada combinada com dois workers perdeu o servidor local Wrangler após oito testes aprovados (`wu087-e2e.log`; ProxyController, sem diagnóstico conclusivo da causa). Não é evidência aprovada. Reexecução serial: **28 testes Chromium PASS**, em `wu087-e2e-retry.log` (19 de continuidade e nove do leitor).
- Build local e Svelte-check: **0 erros/0 avisos** (`wu087-check.log`); ESLint focal PASS (`wu087-lint.log`). Nenhuma alteração em Workers/bindings/configuração.
- Revisão direta dos PNGs finais a 1440 e 390: hierarquia editorial, foco e controles preservados; nome completo da referência mostrado abaixo do seletor nativo. Reflow automatizado a 1440/390/320, reduced-motion. Capturas: `apps/web/test-results/tests-continuity.e2e.ts-leitor-referências-refluem-em-<largura>-chromium/reader-continuity-<largura>.png`.
- MEM-03/SH-03 mantêm a aprovação restrita do leitor; a extensão de controles tem revisão local parcial, não Gate B integral. A fixture isolada não certifica autenticação nem integração hospedada. 320 px não equivale a zoom nativo 400% ou leitor de tela humano.

O servidor continua responsável por reler a fonte canônica, consentimento e gates. Candidatos no navegador não são autorização para contexto. JWT/PostgREST hospedados, executor, auditoria persistente e conclusão integral dos seis universos seguem pendentes.
