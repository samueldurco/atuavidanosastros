# Consentimento em telas de pouca altura — 05/10/2026

WU238 / plano §0.6, Ondas 8/9 §15. RUN_ID `ATV-20260902-170644Z-01A0630F`.

## Defeito e alteração

O banner fixo podia ultrapassar a altura da janela sem permitir rolagem interna. Em 320×200, seu topo estava em y=-197,56 e a explicação ficava acima da tela. A reprodução contra o build da WU237 falhou em 320×200 e em paisagem 568×320; passou em 320×844. Evidências preservadas: `test-results/consent-short-viewport-before.png`, `.json`, `wu238-baseline.log` e `wu238-before-artifacts/` no checkout isolado.

`ConsentBanner.svelte` recebe apenas `max-height: calc(100dvh - 2rem)` e `overflow-y: auto`. O banner respeita as margens existentes e permite alcançar todo o conteúdo quando a janela é curta. Texto, armazenamento da escolha, reload após aceitação, cores e ordem dos botões permanecem iguais.

O teste `consent-reflow.e2e.ts` verifica as três dimensões: banner dentro da janela, ausência de overflow horizontal interno, título alcançável, política, sequência Tab/Shift+Tab pelos dois botões com foco visível e recusa por Enter persistida após reload. Capturas de explicação e ações preservam os dois extremos da rolagem. A CI inclui os três casos no job accessibility existente.

## Validação

Check sem erros/avisos, lint e build aprovados. Regressão completa após build: **45/45 PASS em 5,7 minutos** (três consentimento, nove Gate B, 16 privados e 17 públicos). Os 33 relatórios axe têm zero violações automáticas; os 16 privados não têm inconclusivos. Revisão visual das capturas em janela curta, paisagem e mobile confirmou texto sem sobreposição e foco visível nos controles. Provas locais: `test-results/wu238-{check,lint,build,e2e-final}.log`, `wu238-final-artifacts/` e `wu238-axe-final-summary.json`. O CI será registrado após conclusão, com o SHA exato no log canônico externo.

## Limites

Em 320×200, o parágrafo e os botões exigem rolagem; não é possível mostrar todo o conteúdo simultaneamente. A largura de 320 CSS px é uma condição de reflow descrita na referência primária [WAI — Understanding Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). Este teste de viewport não comprova zoom nativo, leitor de tela ou certificação WCAG integral. Relatórios axe completos e inconclusivos permanecem preservados.

Nenhuma sessão, persistência de produto, autoridade editorial/comercial ou liberação hospedada foi validada por esse teste local. Gates desligados, analytics condicionado ao consentimento e R$0 preservados. Produtos E1–E5 e dependências externas continuam pendentes.
