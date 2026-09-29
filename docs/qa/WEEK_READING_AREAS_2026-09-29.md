# Semana — resumo por áreas (WU185)

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Requisito do produto: resumo por áreas, previsto com timeline web e PDF. Esta WU cobre a organização editorial das hipóteses da base parcial de sete amostras às 12h UTC; não amplia sua geometria ou cobertura temporal.

## Implementação local

- Perfil `atv-week-reading-editorial/1.1.0`, prompt `atv-editorial/1.0.20`, admissão `atv-product-editorial-evidence/1.34.0` e entrega `atv-product-delivery/1.18.0`.
- Quatro sínteses, todas referenciando as oito hipóteses em ordem: Conversas e vínculos; Organização e prioridades; Ritmo e cuidado cotidiano; síntese geral com três perguntas práticas. As áreas são possibilidades editoriais para observação e escolhas reversíveis, sem casas, diagnósticos, previsões ou janelas favoráveis.
- Os mesmos 88/89 fatos e suas proveniências são preservados. Novas entregas têm 21/22 seções, incluindo os três resumos, sem alterar limites de transporte, quota ou autoridade.
- Leitor privado apresenta três links por teclado aos resumos originais. Títulos, prefixo de hipóteses, texto não vazio e todas as referências únicas são conferidos. Uma área incompleta/ambígua suprime a navegação por áreas, preservando leitura e timeline válida. Leituras antigas de 18/19 seções permanecem imutáveis.
- O exportador PDF privado existente inclui as novas seções integralmente. Estados não liberados continuam sem leitura, áreas, timeline ou downloads.

## Provas e limites

Validação local: AI 122/122; Worker 301/301; web 1426/1426 em 70 arquivos; leitor focal 6/6; SQL privado com/sem contexto 2/2; E2E 6/6 em 1440/820/390/320 px, incluindo teclado, reabertura, contexto ausente e estados não liberados. Tipos do AI/Worker sem erros; Svelte 0 erros/0 avisos. ESLint, formato, diff e segredos staged conferidos no fechamento.

Os dois PDFs têm 24 páginas cada. Extração comparada com a entrega integral: 955 verificações com contexto e 938 sem contexto, sem ausências, preservando 89/88 fatos e 22/21 seções. As 48 páginas foram inspecionadas em oito folhas de contato, com conferência adicional de páginas de áreas na resolução original, sem cortes ou sobreposições. Navegação por áreas e referências foram inspecionadas nos screenshots desktop/mobile; não houve overflow horizontal nos quatro tamanhos.

Provas extensas: `test-results/wu185-{ai-tests,worker-full,web-tests,reader-tests,db,e2e,ai-check,worker-check,web-check,eslint,format-check,secrets}.log`; `test-results/wu185/extraction-proof.json`; páginas/folhas de contato em `test-results/wu185/pages-{context,no-context}/`; 24 screenshots em `test-results/wu185-visual/`. CI184 `36587473874` SUCCESS no SHA anterior `299ee6921cf66887d841d28da61e36b767bd5327`. CI desta alteração será conferido pelo novo SHA. Fixtures são sintéticas, com publicação bloqueada e sem aprovação editorial legítima.

O resumo por áreas implementado localmente não conclui E2 ou E5. Escopo temporal integral, homologação do motor, utilidade/aprovação editorial real e aceite hospedado continuam pendentes. Gates desabilitados e gasto automático R$0 permanecem.
