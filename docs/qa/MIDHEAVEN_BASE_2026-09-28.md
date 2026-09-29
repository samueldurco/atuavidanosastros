# Meio do Céu — base persistida

WU-129 · RUN_ID `ATV-20260902-170644Z-01A0630F` · executor único.

## Escopo e resultado

O validador natal existente foi estendido à projeção MC-only antes da preparação editorial. Não houve outro motor, novo cálculo, novo intake ou geometria adicionada. Contrato: [midheaven-calculation.md](../contracts/midheaven-calculation.md).

- 33 mutações recusadas antes de draft/revisão/digests: domínio, projeção, ângulo, fato, fonte, contexto e proveniência; sem alterar o snapshot recebido.
- Latitudes 66°, −66°, 90° e −90°: MC disponível, ASC nulo, posições vazias, casas não solicitadas e um fato geométrico; aviso de cálculo separado preservado.
- Quatro limites de setor e ordenação JSONB/fatos: preparação válida; contexto adversarial continua relato e não altera o MC.
- UTC 1900-01-01 e 2099-12-31 e longitudes ±180°: aceitos; cinco entradas fora do período, incoerentes ou fora das coordenadas: `input_invalid`.
- Worker check PASS; unit 90/90 PASS; corpus 13/13 PASS. Evidências: `test-results/wu129-worker-check.log`, `wu129-worker-unit.log`, `wu129-corpus.log`, `wu129-corpus-proof.json`.

Corpus `1.12.0`: 105 casos, 102 preparados, três bloqueados, 306 posições, sem ampliar solicitações. Fingerprint de todas as solicitações: `c7d419b297da780a5b09f4ffbde88456b13d08ad0c7feba4380df978dc45edce`. Evidência editorial `1.10.0` exige nova avaliação vinculada a esta inspeção.

CI anterior WU128, SHA `14ca2ac76819df738ec4be738d038810922bc982`: [36505409085](https://github.com/samueldurco/atuavidanosastros/actions/runs/36505409085), success. A correção da fixture ASC passou no CI completo.

## Limites e próximo marco

Implementação e validação locais PASS. **E1 integral BLOQUEADO**: coerência não autentica origem nem homologa precisão. E2 ainda exige cobertura específica do MC e interpretação útil aprovada; a próxima WU trata essa cobertura. E3–E5 e release dependem de revisão legítima, gates e sessão hospedada. Supabase continua pausado; proprietário deve executar Resume project. Resolução do bloqueio de modelo/revisão já registrado continua necessária antes de novas chamadas. Nenhum gasto, promoção de engine, mudança de gate ou dado real. Formato do produto: web.
