# WU-080 — geometria cruzada experimental

RUN_ID: ATV-20260902-170644Z-01A0630F. Data: 2026-09-28.

## Entrega

API determinística separada para aspectos entre dois mapas, com papéis Pessoa A/B, pares de corpos iguais admitidos e até 100 pares cartesianos. Validação compartilhada com a geometria natal; política explícita/versionada, sem default editorial. Cópias de entradas/política e incerteza independente dos dois mapas, incluindo pares sem aspecto nominal. Nenhuma inferência de compatibilidade, emoção ou consentimento.

## Evidências locais

- Pacote astrologia: 32/32 testes PASS (`test-results/wu080-astro.log`), incluindo 9 novos testes e 900 pares sintéticos comparados com oráculo vetorial independente. Cobertura de fronteiras representáveis dos orbes, wrap, papéis, ordem canônica, cópias, dados inválidos, conjuntos vazios/desiguais e perturbações independentes sob orçamento.
- Typecheck PASS (`test-results/wu080-check-final.log`). Primeiro check apontou apenas tipagem de fixtures; corrigida sem mudar algoritmo.
- Regressão unitária completa PASS (`test-results/wu080-unit.log`): 778 web, 65 worker, 26 AI, 32 astrologia, 18 domínio, 6 integrações e 6 corpus.

## Limites

Contrato: `docs/contracts/astrology-cross-aspects.md`. As políticas `qa-*` não são políticas editoriais aprovadas. Precisão de entrada continua `not-certified`, movimento `not-evaluated`; hipóteses de erro não certificam o provedor. Não há calculador de Sinastria/Dossiê, fato editorial novo, modelo homologado, promoção, gasto, migração ou gate ativado. Permanecem 12 bases parciais e 13 calculadores indisponíveis. Integração exige política de orbes aprovada, proveniência compatível e envelope factual sem truncamento.
