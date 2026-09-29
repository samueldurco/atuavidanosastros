# Carta do Dia — cobertura editorial local

RUN_ID `ATV-20260902-170644Z-01A0630F`; WU133; 28/09/2026. Produto `daily-card`, rota `/carta-do-dia`, entrega web. Executor único; dados sintéticos; R$0; gates desligados.

## Alteração e limites

Perfil `atv-daily-card-editorial/1.0.0`, prompt 1.0.8 e preparação 1.13.0. A base coerente seleciona cinco afirmações: carta e pergunta copiadas dos fatos, observação simbólica, conexão à pergunta e prática reversível. Os três papéis devem compartilhar uma síntese; há uma pergunta prática e nenhuma relação entre cartas. Relatos consentidos são delimitados como dados, sem autoridade sobre perfil, sorteio ou aprovação.

As inspeções rejeitam cobertura incompleta e a revisão permanece vinculada ao digest do conteúdo e da preparação. Elas não aprovam significados nem avaliam sozinhas profundidade/utilidade. A fixture de transporte declara seu caráter sintético e não é conteúdo publicável. Fixtures genéricas de transporte usam Foco Agora; os testes editoriais e a integração SQL web exercitam a Carta do Dia com seu perfil específico.

## Provas locais

| Verificação | Resultado | Evidência em `test-results/` |
| --- | --- | --- |
| AI unit/check | 74 testes PASS; TypeScript PASS | `wu133-ai-unit.log`, `wu133-ai-check.log` |
| Worker unit/check | 95 testes PASS; TypeScript PASS | `wu133-worker-unit.log`, `wu133-worker-check.log` |
| Corpus | 13 testes PASS | `wu133-corpus-test.log`, `wu133-corpus-fingerprints.json` |
| Lab e comparações | 50 testes PASS | `wu133-lab-tests.log` |
| SQL editorial | 11 testes PASS | `wu133-sql-editorial.log` |
| Vertical web SQL | 15 testes PASS, incluindo Carta do Dia | `wu133-web-unit.log` |
| Svelte check | 0 erros e 0 avisos | `wu133-web-check.log` |

Corpus 1.15.0: 105 casos, 102 preparados e três bloqueados; 306 candidatos, sem expansão de casos/produtos. Fingerprint `6e31af227a9271a9cc07eaaa1b5f95549048e137ab902bdb0dc77bb0e91ab7e7`. Remover somente o novo perfil restaura `022b697884ebabe85a1bf2f6b8a9be9fee0402dbe1e015bacb1350c54311b041`, da versão anterior. Sorteios, relatos e demais fatos foram preservados.

CI da base WU132: SHA `8695282323eaf61fa87e60ac8309db50175b638a`, execução [36508922707](https://github.com/samueldurco/atuavidanosastros/actions/runs/36508922707), sucesso confirmado. CI da WU133 será registrado após commit/push; evidências locais não substituem CI nem release hospedado.

## Aceite e próxima entrega

Cobertura candidata implementada e validada localmente. E1 integral continua bloqueado por política candidata; E2 integral por conteúdo/significados, modelo e revisão legítimos. A revisão anterior da Bússola não autoriza novas chamadas enquanto identificação autêntica do modelo/uso continuar pendente. Responsável: operador/revisor da engine. Não houve chamada paga, aprovação, migração ou alteração de gate.

WU134 atende E3/E4 independentes: projeção e leitor web com títulos próprios, persistência/reabertura local e QA visual/acessibilidade. Supabase pausado e login hospedado continuam dependentes do proprietário (`Resume project` e confirmação); nenhuma liberação hospedada foi comprovada.
