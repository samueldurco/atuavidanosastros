# WU078 — base editorial do Ascendente indisponível

RUN_ID: ATV-20260902-170644Z-01A0630F

O corpus WU077 revelou que o aviso calculado `ascendant-unavailable` satisfazia a regra genérica de presença de fatos calculados. A preparação específica de `ascendant` agora exige ângulo numérico finito em [0,360), o fato calculado `angle-ascendant` e ausência de aviso contraditório. Sem esses requisitos, retorna `insufficient_facts` antes de analisar resposta, revisão ou produzir digests. Não altera o snapshot persistido, o motor ou produtos com outros fatores interpretáveis. Não certifica a correção científica de um snapshot arbitrário: a entrada continua sendo cálculo persistido de origem confiável.

Contrato de evidência editorial 1.1.0; mudança intencional da base de revisão. Corpus factual 1.1.0 mantém 84 casos, com 83 requisições preparadas e um negativo (`ascendant-boundary`) sem requisição/digest factual. Fingerprint: `49ff8dedac35ca3a028d7bd610895f316858e3ce5df57ad69df8d24ead520d1f`. O teste detectou a mudança esperada antes da atualização deliberada de versão/hash; o registro histórico v1.0.0 não foi reescrito.

## Evidências

- 15/15 testes focais PASS: dois hemisférios polares, contexto adversarial, revisão sintética perfeita sem poder de override, preservação do snapshot, ângulo ausente/malformado/fora de faixa, fato ausente ou relatado e aviso contraditório. `test-results/wu078-focal-final.log`.
- TypeScript Worker PASS (`test-results/wu078-check.log`). Suíte unitária completa PASS: 770 web, 65 worker, 26 AI, 23 astrologia, 18 domínio, 6 integrações, 6 corpus (`test-results/wu078-unit.log`). Alterações concorrentes preservadas; CI verifica a árvore do commit isoladamente.
- Persistência/publicação editorial PostgreSQL local: 11/11 PASS (`test-results/wu078-editorial-db.log`), incluindo falta de aprovação e revogação de recibos.
- CI da WU077 `d056caf`: quality108922214045, secrets108922214770 e Pages108922594302 completed/success.

As orientações [Workers Best Practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/) informaram a recusa explícita e testes negativos. Tipos atuais consultados via unpkg; nenhuma API, binding, configuração ou dependência Cloudflare foi alterada. Sem modelo, chamadas pagas, promoção, migração hospedada, alteração de gates ou ativação de produto. Nenhum modelo homologado.
