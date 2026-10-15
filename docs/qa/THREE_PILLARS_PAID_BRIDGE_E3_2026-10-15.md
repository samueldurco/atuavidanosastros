# Três Pilares — ponte candidata da leitura paga 5.1

Data: 15/10/2026. Escopo: motor local e contrato de transporte. **O produto pago não está liberado.** Esta prova não constitui processamento persistido, aprovação editorial paga, aceite Lab/Gate B nem liberação hospedada.

## Alcance comprovado

- `apps/worker/src/natal-calculators.ts` mantém o cálculo v1 para snapshots históricos e oferece uma projeção v2 isolada com fatos natais completos. A v2 não foi registrada no processador pago.
- `apps/web/src/lib/server/three-pillars-paid-bridge.ts` usa o provedor natal, verifica origem e projeção, compõe a leitura `atv-three-pillars-editorial/5.1.0` e a revisa por recomposição. Seu resultado é um candidato bloqueado com cálculo e evidências; não grava nem promove uma entrega.
- `apps/worker/src/three-pillars-paid-candidate.ts` converte os capítulos em seções limitadas, com IDs de fatos existentes, sem conceder autoridade editorial ou de publicação.
- `apps/worker/src/product-runtime.ts` rejeita `three-pillars` em `enabledProducts`. O teste de integração confirma que uma nova execução enfileirada continua sem cálculo, candidato, promoção ou entrega v1. O leitor pode continuar consultando snapshots históricos existentes pela versão deles.
- Após a revisão editorial `a931932`, `pnpm --filter @atv/web exec vitest run src/lib/trials/reconstruction/pillars-paid-bridge.spec.ts src/lib/trials/reconstruction/pillars.spec.ts` passou: 27/27 testes. A suíte `natal-vertical.integration.spec.ts` passou 78/78 após separar a fixture v1 histórica da expectativa de bloqueio de novas execuções.

## Gates e dependência E3

| Etapa | Estado local nesta frente | Evidência ainda necessária |
| --- | --- | --- |
| E1, fatos e origem | Projeção v2 e replay de origem exercitados em memória. | Comprovar o mesmo contrato sobre um snapshot v2 persistido, incluindo `RUN_ID`, versões e limites. |
| E2, interpretação | Compositor privado 5.1 revisado; a ponte recompõe exatamente o candidato pago sintético. | Revisão editorial independente da entrega paga e recibo da versão efetivamente persistida. |
| E3, fluxo pago | **Bloqueado.** Não existe adapter de leitura v2 persistida nem execução paga nova habilitada. | Teste local isolado com service role: recuperar input e cálculo confiáveis de uma execução, validar produto, estado, versões e revisão, reconstruir o candidato 5.1 e provar que adulterações falham. O resultado deve permanecer `AWAITING_EDITORIAL`, sem promoção ou liberação. |
| E4, leitor e PDF pago | A representação da Biblioteca permanece vinculada ao fluxo publicado e aos seus snapshots. | Capturar e inspecionar a leitura paga 5.1 pelo leitor/PDF real depois da prova E3 e da aprovação legítima, conforme a diretriz visual de 14/10/2026. |
| E5, aceite | **Bloqueado.** | Cadeia persistida, revisão independente, Lab/Gate B e aceite hospedado da versão exata. |

A menor próxima alteração segura é um teste de integração local, separado do caminho público, que prove a persistência/releitura v2 e seus invariantes com service role. Só então caberá implementar o adapter de recomposição sobre a execução persistida. O guard, as flags e os gates continuam ativos durante essa prova; o teste não pode fabricar uma aprovação válida nem liberar a Biblioteca. Os testes atuais usam fatos e contextos sintéticos e não fazem chamadas de IA paga.
