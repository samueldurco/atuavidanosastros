# Ascendente — base persistida E1

WU-126 · RUN_ID `ATV-20260902-170644Z-01A0630F` · executor único.

## Requisito e resultado

O guard da WU078 admitia ângulo e fato sem conferir sua correspondência ou o escopo completo. A inspeção existente das projeções natais agora cobre ASC isolado: contrato, proveniência, fontes e display, nenhum planeta/MC/cúspide injetado. Erros falham antes do draft/review. Snapshots polares coerentes ficam preservados, mas sem base interpretativa. Implementação e validação locais concluídas; não é autenticação de origem, precisão científica ou produto liberado.

## Evidência local

- `ascendant-calculation.test.mjs`: 31 mutações de geometria, domínio, fatos e proveniência rejeitadas por `calculation_invalid`, inclusive antes da avaliação de saída/revisão; snapshots originais permanecem iguais.
- Quatro latitudes sintéticas ±66/±70 conservam aviso/ASC nulo e retornam `insufficient_facts`. Aviso com fonte incoerente é inválido. Nenhum sistema alternativo ou contexto substitui ASC.
- Limites 0/29.999999999/30/359.999999999 e ordenação JSONB/facts passam com display coerente. Relato adversarial continua `reported` e não altera a geometria.
- Worker focal: **23 PASS**; suíte completa: **84 PASS**; TypeScript PASS. Logs ignorados `test-results/wu126-worker-focal.log`, `wu126-worker-unit.log`, `wu126-worker-check.log`.
- Corpus: **13 PASS**, versão `1.10.0`, 105 casos/102 preparados/3 bloqueados/306 posições. Requests e hashes preservados; SHA-256 do conjunto `870a360458e37d3e7ef49f201ad557a7fc5810828204541fbc38852828627a68`. Logs/prova em `test-results/wu126-corpus.log` e `wu126-corpus-proof.json`.
- CI da WU125 `11a017cbbb09bcbb5abb6ae52c7cd737fbc6b52d`: [36501550022, success](https://github.com/samueldurco/atuavidanosastros/actions/runs/36501550022). Os dois setups SQL corrigidos passaram no CI completo.

O código alterado usa funções puras síncronas, sem novas APIs, bindings ou efeitos de I/O. Revisão conforme [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/); tipos oficiais `5.20260928.1` consultados localmente. Não há migração ou operação hospedada nesta WU.

## Marcos e pendências

E1 **BLOQUEADO para aceite integral**: motor experimental sem homologação aplicável. E2 começa pela cobertura editorial útil de ASC, ligada ao fato calculado: primeiro contato/abordagem, possibilidades de ação e tensão/excesso, síntese e perguntas práticas; não inferir planetas, casas, regências ou aspectos ausentes. E3–E5 pendentes de integração/QA específica e aprovação legítima. Fixtures não satisfazem leitura aprovada. Supabase pausado; proprietário deve retomar antes de prova de login/sessão hospedada. Gates off, R$0.
