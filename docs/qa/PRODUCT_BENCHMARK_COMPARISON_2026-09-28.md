# WU-109 — comparação offline do benchmark de produto

RUN_ID `ATV-20260902-170644Z-01A0630F`. Data:28/09/2026.

## Entrega

Comparador `atv-product-comparison/1.0.0` e opção CLI `--compare`. Ambas as capturas são reavaliadas pelo avaliador atual, nunca por métricas de um relatório fornecido. Mantém o corpus1.4.0/fingerprint `edde71a4d22332655441b5a322bddf446d72f5b3c98588b265977a4d406cc228`,104 casos preparados/312 posições,1 caso bloqueado,13 bases parciais/12 produtos indisponíveis.

Estados pass/fail/unknown por checagem. Regressões medidas são distintas de perda de evidência; melhorias são distintas de evidência recuperada. Falhas persistentes e cobertura ausente continuam explícitas, inclusive por produto. Deltas candidato−baseline apenas para medições conhecidas. Identidade de execução reutilizada no mesmo provedor rejeita os lotes, sem alegar autenticidade. Não imprime payloads, prompts, recibos ou referências de execução.

## Provas locais

- `node --test scripts/product-benchmark-comparison.test.mjs scripts/product-benchmark.test.mjs scripts/product-lab-corpus.test.mjs`:36/36 PASS;11 testes novos. Log local ignorado:`test-results/wu109-tests.log`.
- Inclui lotes vazios, regressões independentes de schema/mecânica/latência/tokens/custo, falha de grounding sem confundir schema, melhoria parcial com falhas persistentes, perda/recuperação de evidência, amostras removidas, stale corpus/prompt em ambos os lados, campo de aprovação indevido, caso bloqueado, referências de execução reutilizadas e mudança de provedor.
- Ordem de amostras não muda relatório; capturas não são alteradas. Canários de output/recibo não são divulgados. CLI comprova saídas0/1/2, arquivos preservados e erros sanitizados.624 fixtures deliberadamente genéricas passam mecanicamente, mas não aprovam semântica/release.
- Integração no `test:unit` da raiz para CI. Nenhuma alteração em motor, rotas web, banco, gateways, prompts ou políticas de release.
- `pnpm --filter @atv/ai check` e `git diff --check`:PASS. Log local:`test-results/wu109-check.log`.

## Limites

Não há novas chamadas de provedor, amostras reais, custo, modelo homologado, release ou migração hospedada. Comparação só aceita o corpus/prompt atual; comparação entre versões de prompt não foi implementada. Sem ranking, média agregada ou significância estatística. `publication=blocked`, `promotionEligible=false`, revisão humana pendente, procedência declarada/não autenticada. OpenAI Docs orientou a separação entre comparação específica e calibração humana; o contrato contém a referência oficial.
