# Semana 1.2 — perfil editorial temporal (WU192)

RUN_ID `ATV-20260902-170644Z-01A0630F`. Implementação e validação **locais** em 29/09/2026. O perfil `atv-week-temporal-editorial/1.0.0` só aceita a projeção experimental `atv-week-reading-calculation/1.2.0` após a verificação original da geometria no Worker. A busca continua opt-in interno, com o padrão de 13 bases intacto e gasto automático R$0.

## Requisito entregue

- Envelope parcial com resumo UTC, dez contagens nominais por corpo em ordem, fonte/política/versão e contexto consentido como relato. Totais, data, ordem e proveniência são validados; o relato não muda a geometria.
- Perfil de rascunho com três hipóteses ligadas aos fatos, duas sínteses ordenadas, três perguntas práticas e quatro limites literais. O parser, o diretor, o prompt, o gateway e o Lab reconhecem os limites de 16.000 caracteres, 4.000 tokens, três claims e zero relações.
- A entrega para revisão preserva os onze fatos calculados, o relato opcional, hipóteses, sínteses e limites. O caminho legado 1.0 conserva seus títulos e agrupamento. `prepareProductDelivery` retorna `prepared_for_review` e `publication=blocked` para a fixture estrutural; a remoção de evidência é rejeitada.

## Provas

- `pnpm --filter @atv/ai check` e `pnpm --filter @atv/worker check`: PASS.
- `pnpm --filter @atv/ai test`: 124/124, `test-results/wu192-ai-full-test.log`.
- `pnpm --filter @atv/worker test`: 333/333, `test-results/wu192-worker-full-test.log`.
- Teste integrado `apps/worker/week-temporal-calculators.test.mjs`: motor real com 336 linhas, 86 eventos, 34 janelas, 635 chamadas e projeção íntegra; rascunho estrutural preserva todas as referências e bloqueia publicação. `apps/worker/week-reading-delivery.test.mjs` cobre a rota legada. Ambos incluídos na suíte Worker.
- Prettier focal e `git diff --check`: PASS.

## Limites e aceite restante

As contagens/janelas da grade horária não certificam cobertura contínua, precisão celeste, favorabilidade, intensidade, prioridade, tendência, aplicação/separação ou dias locais completos. O teste usa contexto e texto de fixture sintéticos; nenhuma chamada a modelo, avaliação de utilidade, validação de prompt/modelo, revisão editorial ou aprovação legítima ocorreu. E2 e E5 continuam pendentes; E1/E3/E4 são parciais. Não houve liberação hospedada nem alteração de gate. Supabase pausado e Cloudflare 403 continuam bloqueios externos já registrados com responsáveis.
