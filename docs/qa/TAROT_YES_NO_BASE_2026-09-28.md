# Sim/Não responsável — WU138 / E1

RUN_ID `ATV-20260902-170644Z-01A0630F`. Requisito finito: rejeitar incoerências da base salva antes da interpretação. Produto `tarot-yes-no`, `/sim-nao-responsavel`, somente web.

## Falha e mudança

Antes, `productPolicy.binaryVerdict: true` ainda retornava `prepared` (`test-results/wu138-before.log`). Inspeção pura agora confere carta, pergunta, contexto, proveniência, quatro limites e política sem veredito, preservando o registro. Preparação 1.16.0; sem perfil editorial ou alteração de sorteio/corpus nesta WU. Prova posterior `wu138-after.log`: base válida preparada; veredito adulterado bloqueado com `calculation_invalid`; Cavaleiro de Espadas preservado, sem mutação.

## Validação

- Worker TypeScript PASS (`wu138-worker-check.log`). Três testes novos cobrem com/sem contexto, 49 adulterações e mudança do relato sem novo sorteio. Primeira rodada Worker: 103/104; expectativa antiga de revisão desatualizada corrigida para exigir rejeição prévia de limites incompatíveis. Revisão focal 8/8 PASS (`wu138-review-fix.log`). Rodada final 104/104 PASS (`wu138-worker-final.log`).
- Corpus 13/13 PASS (`wu138-corpus.log`), versão 1.17.0, 105 casos/102 preparados/3 bloqueados. Fingerprint integral preservado `58d1a7e26bd0398d373733efa0b5de361f48e6099d1dadbe4d7eb28d618e2fc5`.
- Revisão/comparação e PostgreSQL local 28/28 PASS (`wu138-lab-db.log`): declaração fictícia não concede autoridade, persistência/recuperação/isolamento e parada editorial conservados.
- Web check PASS, zero erros/avisos (`wu138-web-check.log`). Vertical SQL Sim/Não 1 PASS/14 omitidos por filtro (`wu138-web-vertical.log`): snapshot privado, proprietário/histórico, reprocessamento e revisão independente fictícia explícita.
- Intake/UI não mudaram; provas de consentimento, isolamento e quatro larguras permanecem em `TAROT_QUESTION_PRODUCTS_2026-09-28.md`. Prettier focal PASS (`wu138-format-final.log`); diff/secrets exigidos antes do commit.

## Limites e próxima etapa

Coerência interna não autentica UUID nem homologa política/significados. E1 integral BLOQUEADO por revisão da política candidata; implementação e validação locais independentes PASS. E2–E5 PENDENTES, dependem de leitura completa, modelo/conteúdo/revisão legítimos e sessão hospedada. Próxima WU139: cobertura editorial específica, ligada à carta/pergunta/contexto e alternativas condicionais, sem resposta binária absoluta. Supabase pausado pelo proprietário; gates off, R$0, sem provider, publicação ou release.

CI WU137 `0615fa6`, run `36514271521`: SUCCESS. CI da WU138 acompanha seu commit; pipeline não homologa produto.
