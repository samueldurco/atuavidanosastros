# Gate de procedência das amostras

RUN_ID `ATV-20260902-170644Z-01A0630F`. WU-105. 28/09/2026.

## Falha e correção

O gate anterior conferia modelo/prompt/tier, mas não vinculava cada amostra ao provedor declarado. Repetições distintas também podiam referenciar uma mesma execução, sem recusa. Testes prévios reproduziram quatro falhas (5 PASS / 4 FAIL), `test-results/wu105-red.log`.

Política `atv-promotion/1.4.0`: provedor canônico vinculado à candidatura e referência opaca única por invocação no lote. Campos ausentes/inválidos bloqueiam, sem normalização. Não confundir referência declarada com atestação; conferência operacional permanece obrigatória. Notas, referências e outputs de testes são sintéticos, não evidência de homologação.

## Validação local

- Nove testes focais PASS, `test-results/wu105-green.log`.
- Pacote IA: **44 PASS**, `test-results/wu105-ai.log`.
- Worker: **71 PASS**, `test-results/wu105-worker.log`.
- Check IA/worker: PASS, `test-results/wu105-check.log` e `test-results/wu105-worker-check.log`; diff-check PASS.
- Replay offline das vinte amostras históricas, sem alterar fontes: baseline12 (schema10/mecânico6), focal8 (schema6/mecânico6), `test-results/wu105-benchmark-replay.json`. Falhas históricas continuam abertas; replay não é nova rodada nem promoção.

Casos novos cobrem provedor trocado, tipos inválidos/ausência, limites100/120 e excesso, IDs reutilizados intra/intercaso com repetição válida e respostas idênticas com referências distintas. Custo/revisão/artefatos e registro vazio permanecem testados.

Nenhuma mudança em prompt, constituições, schema, rubrica, dataset, benchmark, manifesto de artefatos, UI, gateway ou migração. Sem gasto, API, scheduler, dispatch, release ou modelo homologado. Skill OpenAI Docs influenciou o desenho das regressões e a separação de avaliação humana; ver fonte e limites no [contrato](../contracts/lab-sample-provenance.md).

CI anterior WU-104, SHA `31bf473918fbf8a72b4b14e78e667ff00d8f7e69`: quality `109059066791`, secrets `109059066330`, Pages `109059552605`, todos completed/success.
