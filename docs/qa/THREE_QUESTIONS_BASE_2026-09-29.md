# Três Perguntas — coerência da base local

RUN_ID: ATV-20260902-170644Z-01A0630F. WU141, 29/09/2026. Produto `three-questions`, rota `/tres-perguntas`, formato web. Base e política candidatas; nenhuma interpretação, aprovação ou liberação hospedada.

## Falha e alteração

Antes (`test-results/wu141-before.log`), preparação aceitava carta duplicada, pergunta divergente, índice errado e fonte inválida. Depois (`wu141-after.log`), os quatro snapshots são bloqueados com `calculation_invalid`; a base válida segue preparada, parcial e sem perfil editorial. UUID sintético `00000000-0000-4000-8000-000000000141` conserva Quatro de Espadas, Ás de Copas e Cavaleiro de Ouros, cálculo intacto e zero chamadas a provedores.

Inspeção compartilhada verifica três pares posicionais, seis fatos alternados e contexto opcional, identidade canônica, unicidade, fontes, versões, política candidata e limites exatos. Preparação 1.18.0 vincula a nova regra ao digest; não concede autoridade ou READY. Nenhum cálculo, schema de entrada, seed ou snapshot persistido foi alterado.

## Provas

- Worker 109/109 PASS (`test-results/wu141-worker-final.log`), incluindo três testes novos com 78 mutações de cardinalidade, identidade, índices e fontes dos três pares; saída preservada e independência do sorteio em relação ao texto. Regressões dos três produtos de uma carta PASS.
- Worker check PASS (`wu141-worker-check.log`). Uma expectativa anterior tratava limite de cálculo adicional como base válida; foi movida ao conjunto inválido do teste de revisão, mantendo a prova de invalidação de digest para mudanças válidas.
- SQL vertical Três Perguntas 1 PASS/14 omitidos (`wu141-web-vertical.log`): persistência, Biblioteca, leitura privada, snapshot, reprocessamento e revogação sob fixtures explícitas. Corpus/revisão/DB/benchmarks 78/78 PASS (`wu141-root.log`). Prettier focal PASS (`wu141-prettier-check.log`).
- CI140 `36516870133`, SHA `fa2c004`, SUCCESS (`wu140-ci.json`). Diff e scanner de segredos são exigidos antes do commit desta WU.
- Intake/consentimento e QA nas quatro larguras existentes [WU056](SYMBOLIC_PRODUCT_INTAKE_2026-09-25.md), persistência/recuperação/reprocessamento sem novo sorteio [WU057](SYMBOLIC_INTAKE_VERTICAL_2026-09-25.md). Não houve mudança visual nesta WU.

## Aceite

E1 local de coerência implementado/validado; E1 integral BLOQUEADO por política candidata sem homologação. E2 leitura útil e conteúdo/modelo/revisão legítimos permanece pendente de implementação e bloqueado externamente. E3–E5 não concluídos: provas locais existentes não certificam aprovação real, sessão hospedada ou conteúdo final. Proprietário/editor deve homologar política e conteúdo, fornecer metadados autênticos do modelo/revisão e retomar Supabase `irgnhvouvzyoqfmltrna`. Gates fechados, R$0, paralelo preservado.

Próxima WU142: implementar cobertura editorial de três pares e síntese conjunta ligada à base, sem fabricar significado aprovado. Os 25 produtos, ATV+ e todo o plano original permanecem no escopo.
