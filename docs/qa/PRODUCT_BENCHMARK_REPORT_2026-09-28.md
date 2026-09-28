# Diagnóstico offline do corpus de produto

RUN_ID `ATV-20260902-170644Z-01A0630F`. WU-107, 28/09/2026.

Relatório/CLI1.0.0 e captura1.0.0, conforme [contrato](../contracts/product-benchmark.md). Não gera respostas nem chama modelo/API. Reutiliza `evaluateSample`, sem alterar prompt/schema/rubrica, constituições, motor, corpus, dataset de release, gate de promoção ou os vinte registros históricos. Gasto0; nenhum modelo homologado.

## Verificação

- 12 testes focais PASS;13 testes do corpus preservados, **25 PASS** juntos (`test-results/wu107-corpus-report.log`). Manifesto estável entre execuções, fingerprint `edde71a4d22332655441b5a322bddf446d72f5b3c98588b265977a4d406cc228` preservado.
- 44 testes IA PASS (`wu107-ai.log`),71 worker PASS (`wu107-worker.log`), check IA e diff-check PASS (`wu107-check.log`).
- CLI testado em subprocessos: manifesto0; captura parcial1; lote completo sintético0 ainda sem promoção; JSON inválido/arquivo excessivo/caminho inexistente/uso inválido2. Não modifica entrada nem vaza conteúdo/caminho em erros.
- Casos de identidade, versão, request/prompt, repetição, execução reutilizada e campos indevidos rejeitam lote; falhas de schema/fato/token/latência/custo são distintas. Métricas desconhecidas permanecem desconhecidas. Saídas e recibos brutos não entram no relatório.

O lote completo usado nos testes é uma fixture genérica, não captura real nem leitura editorial:312 respostas artificiais exercitam os104 casos preparados e demonstram que todas as checagens mecânicas podem passar sem atestar qualidade semântica. Não é publicado como benchmark de nenhum modelo. Um caso bloqueado e12 produtos indisponíveis continuam visíveis; revisão humana de cada resposta e calibração dos casos seguem pendentes.

OpenAI Docs orientou regressões por tarefa e calibração humana; formato/cobertura/limites são decisões ATV. Não houve API Evals, geração externa, promoção, migração hospedada ou mudança de release. Skill não autoriza novas chamadas ou notas editoriais inventadas.

CI da WU106 `e869787ecade88573b9d5726c6e0e233ce99a4b2`: quality `109066792958`, secrets `109066792477`, Pages `109067177951`, completed/success. A falha inicial do preview local da WU106 permanece documentada separadamente.
