# Foco Agora — E2 local

RUN_ID: ATV-20260902-170644Z-01A0630F. WU136, 28/09/2026. Cobertura editorial candidata integrada ao prompt, Director, preparação persistida, corpus e fixtures explicitamente sintéticas. Nenhuma interpretação de fixture é conteúdo aprovado.

Antes: `test-results/wu136-before.log` mostra que uma leitura mínima com apenas um fato chegava a `needs_editorial_review`, sem interpretação, contexto ou prática. Agora faltas e desvinculações dos três papéis, contexto recebido omitido, fatos alterados, síntese incompleta e pergunta adicional são rejeitados mecanicamente. Uma alteração textual válida invalida a revisão anterior. Relatos maliciosos não escolhem o perfil confiável.

Provas:

- AI: 80/80 PASS (`wu136-ai.log`); Worker: 100/100 PASS (`wu136-worker.log`); TypeScript de ambos PASS (`wu136-checks.log`).
- Lab: primeira rodada 62/63; única falha era fingerprint antigo do manifest. Corpus histórico é restaurado removendo somente o perfil Focus (`wu136-corpus-digests.json`), sem mudança do sorteio ou dos fatos. Benchmark corrigido 12/12 PASS (`wu136-benchmark-final.log`); demais testes do conjunto passaram em `wu136-lab.log`.
- PostgreSQL local: processamento 15/15 PASS (`wu136-processing-db.log`).
- Vertical Focus local: cálculo real → publicação privada com autoridade de teste → web persistida → histórico do proprietário → reprocessamento revisado PASS (`wu136-web-vertical-final.log`). Primeira rodada esperava a síntese mínima anterior; a asserção foi ajustada à cobertura sintética nova, seis seções e uma carta. Não comprova sessão hospedada nem revisão editorial real.
- Web check PASS (`wu136-web-check.log`); Prettier focal PASS (`wu136-prettier.log`, `wu136-prettier-web.log`). UI de resultado e QA visual seguem na WU137.
- CI135 `36512133608`, SHA `dfd0b3a`, SUCCESS; prova `wu135-ci.json`.

E2 integral BLOQUEADO por conteúdo/modelo e revisão legítimos. E1 permanece BLOQUEADO pela política candidata. Supabase pausado depende do proprietário; ambiente hospedado continua sem aceite. Gates/releases desativados, R$0, sem novo provider. Próximo requisito independente: apresentação das seis seções no resultado Focus, salvamento/reabertura e estados, sem ampliar o formato web.
