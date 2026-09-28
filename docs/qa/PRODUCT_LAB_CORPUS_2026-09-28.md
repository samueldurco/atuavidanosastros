# WU077 — corpus factual por base de produto

RUN_ID: ATV-20260902-170644Z-01A0630F

Corpus offline `atv-product-facts-synthetic/1.0.0`: 84 casos, 12 bases parciais, seis capacidades, sete estratos. Usa os calculadores reais e a preparação editorial existentes; entradas integralmente sintéticas, sem rede, banco, segredos, modelo ou transporte hospedado. Varia datas/coordenadas/pares/UUIDs de sorteio/relatos, não apenas contexto. Os 13 produtos sem base de cálculo continuam fora da cobertura.

Cada entrada contém input, snapshot calculado, limites, proveniência, hashes, critérios e requisição factual quando representável. Nenhuma resposta, nota, revisão humana, golden aprovado ou promoção é fabricada. Publicação bloqueada, `promotionEligible:false`. O corpus de release de 42 casos e as 20 amostras históricas permanecem intocados.

## Verificação

- `node --test scripts/product-lab-corpus.test.mjs`: cobertura, diversidade sem contar contexto, fingerprint, projeção literal sem perda de fonte, limites polares, ausências em Sonhos, injection como relato e preservação de cartas para o mesmo UUID.
- Replay verifica entradas/requisições exatas. O timestamp `calculatedAt` original é preservado, não congelado/falsificado; portanto o snapshot integral e seu hash variam com o horário real da execução.
- Fingerprint de requisições v1: `c01bd6c886289d83cf5c410721b2dd6394b56c8ead0209ed6c53ac21a6004ad3`. Detecta drift, não certifica motor ou modelo. Mudanças intencionais requerem revisão/versionamento, não atualização cega do hash.
- CLI: `node scripts/product-lab-corpus.mjs > test-results/wu077-corpus.json`; testes incorporados ao comando raiz `pnpm test:unit` usado no CI.
- Resultado local: 6/6 testes de corpus PASS (`test-results/wu077-corpus-tests.log`); `pnpm test:unit` PASS, incluindo 770 web, 63 worker, 26 AI, 23 astrologia, 18 domínio, 6 integrações e 6 corpus (`test-results/wu077-unit.log`). O workspace contém alterações concorrentes preservadas; o CI do commit é a evidência isolada da árvore publicada.
- CI anterior WU076 `25fe4ba`: quality108918873896, secrets108918873389 e Pages108919279925 completed/success. WU075 `53d7b99`: quality108917896764, secrets108917896913 e Pages108918467976 completed/success.

Limitações: não é corpus semanticamente calibrado, não cobre todos os limites de entrada nem todos os produtos. As bases continuam experimentais/parciais. Não houve interpretação ou avaliação de qualidade de modelo. A orientação de [evals oficiais](https://developers.openai.com/api/docs/guides/evaluation-best-practices/) informa diversidade e separação de evidência factual de julgamento humano; não substitui calibração independente.
