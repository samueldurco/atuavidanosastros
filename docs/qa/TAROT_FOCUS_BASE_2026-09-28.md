# Foco Agora — WU135 / E1

RUN_ID `ATV-20260902-170644Z-01A0630F`. Requisito finito: rejeitar incoerência do sorteio persistido antes de preparar interpretação. Produto `tarot-focus`, `/foco-agora`, somente web.

## Falha e mudança

Antes, adulterar nome da carta e `productPolicy.binaryVerdict` ainda retornava `prepared` (`test-results/wu135-before.log`). Inspeção pura agora confere carta, pergunta, contexto, proveniência, quatro limites e política exata, preservando o registro. Preparação 1.14.0 e corpus 1.16.0; sem perfil editorial novo nesta WU. Carta do Dia conserva a mesma inspeção e perfil.

## Validação

- Worker TypeScript PASS (`wu135-worker-check.log`). Worker final 99/99 PASS (`wu135-worker-unit-final.log`): três novos testes de Foco Agora com e sem contexto, 49 adulterações, relato alterado sem novo sorteio e regressão da Carta do Dia. Nenhuma mutação silenciosa.
- Primeira rodada Worker: 97/99; duas expectativas antigas tratavam projeções incompatíveis como simples revisão desatualizada. Corrigidas para exigir rejeição `calculation_invalid`, sem conteúdo nem aprovação (`wu135-worker-unit.log`).
- Corpus 13/13 PASS (`wu135-corpus.log`); mesmos 105 casos, 102 preparados, 3 bloqueados. Fingerprint integral `6e31af227a9271a9cc07eaaa1b5f95549048e137ab902bdb0dc77bb0e91ab7e7` conservado.
- Processamento PostgreSQL local completo 15/15 PASS (`wu135-processing-db.log`): persistência, recuperação, isolamento, bases simbólicas e parada editorial. Prettier focal PASS (`wu135-prettier.log`).
- Entrada, golden draw, consentimento, isolamento, processamento/recuperação SQL e QA de quatro larguras permanecem documentados em `TAROT_QUESTION_PRODUCTS_2026-09-28.md`; esta WU não altera intake nem UI e não repete suas capturas.

## Limites e próxima etapa

Coerência interna não autentica o UUID nem homologa política ou significados. E1 integral BLOQUEADO por revisão da política; código local comprovado. E2: contrato de leitura ligada à carta/pergunta/contexto, possibilidade, tensão e prática, com revisão legítima. Supabase pausado pelo proprietário; conteúdo/modelo/revisão legítimos pendentes; gates off e R$0. Sem provider, geração de conteúdo real, publicação ou mudança de release.

CI da WU134 `228b4d2`: SUCCESS, run `36511405629`; corrigiu a fixture SQL da WU133. CI da WU135 acompanha seu commit; aprovação de pipeline não homologa o produto.
