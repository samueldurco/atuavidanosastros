# Registro de sonho — fidelidade da base relatada

Produto `dream-journal`, rota `/registro-de-sonho`, entrega de catálogo web. RUN_ID `ATV-20260902-170644Z-01A0630F`.

O contrato de entrada `atv-workflow/1.0.0` exige consentimento de armazenamento `atv-input-consent/1`, data válida, relato e listas de emoções/associações pessoais dentro dos limites existentes. Contexto é opcional. Continuidade é uma escolha separada e não carrega histórico automaticamente. A entrada privada e a recuperação permanecem vinculadas à conta, à chave da tentativa e à política SQL vigente.

`calculateDreamRecord` produz `atv-symbolic-calculation/1.0.0`, tipo `dream`, estado `recorded`. Mantém o relato completo, separando trechos sem dividir pares UTF-16. Todos os fatos são `reported`: data, trechos, emoções, associações e contexto, com IDs/proveniências próprios. Não calcula significado, emoção, diagnóstico ou recorrência.

Na WU144, `validDreamJournalProjection` verifica a projeção salva antes do preparo editorial. Reusa o parser/calculador determinístico para comparar cada fato, ordem, texto, fonte e os três limites originais. Exige a estrutura exata da entrada, contexto e continuidade; histórico e recorrência permanecem `false`, hipóteses simbólicas vazias. Campos adicionais nos fatos são recusados antes da normalização genérica. Não trunca nem corrige um snapshot incoerente: o resultado é `calculation_invalid`.

O preparo `atv-product-editorial-evidence/1.20.0` e corpus `atv-product-facts-synthetic/1.20.0` vinculam essa regra ao fluxo existente. Facts permanecem `atv-facts/1.0.0`, capacidade `dream-exploration`, completude `partial`. A inspeção não autentica consentimento/origem, não substitui controle de acesso e não aprova conteúdo editorial. As regras específicas de `dream-reading` serão tratadas em seu próprio marco.

E1 implementado/validado localmente não comprova sessão ou percurso hospedado. E2–E5 exigem seus aceites, conteúdo/revisão legítimos e gates aplicáveis. Não há interpretação universal dos símbolos, consulta longitudinal, nova chamada a provedor, liberação ou custo automático. Evidências: [QA WU144](../qa/DREAM_JOURNAL_BASE_2026-09-29.md), WU056/057 e testes da entrada/vertical existentes.
