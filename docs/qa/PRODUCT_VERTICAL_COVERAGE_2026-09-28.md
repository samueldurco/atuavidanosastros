# WU-079 — cobertura vertical das doze bases parciais

RUN_ID: ATV-20260902-170644Z-01A0630F.

## Prova local

`apps/web/src/lib/server/product-vertical.integration.spec.ts` cobre agora birth-chart, three-pillars, ascendant, date-reading, pair-preview, daily-card, three-questions, tarot-focus, tarot-yes-no, midheaven, dream-reading e dream-journal. Uma asserção compara a lista explicitamente com o registro de calculadores, impedindo omissão silenciosa de novas bases.

Cada produto atravessa handlers HTTP reais → persistência PostgreSQL/PGlite com papéis/RLS → cálculo → espera editorial → revisão e recibo estritamente sintéticos → publicação local → bytes web persistidos → recuperação autenticada → Biblioteca/histórico → reprocessamento com revisão independente. Repetições são idempotentes; outro usuário não recupera o resultado. Revogação e exclusão do pai não aprovam nem apagam o filho. Todas as quatro bases Tarot preservam o sorteio no reprocessamento.

Um Ascendente polar adicional persiste o cálculo com ângulo indisponível, mas recusa preparação e entrega editorial mesmo com saída estruturalmente válida. Permanece AWAITING_EDITORIAL, recuperável no histórico privado, sem recibo, editorial ou artefato. Ativar políticas somente na fixture não contorna a ausência de evidência.

## Validação

- 14/14 testes integrados PASS: `test-results/wu079-vertical-final.log`.
- Web check: zero erros e avisos, `test-results/wu079-web-check.log`.
- Primeira execução: 13/14; a fixture negativa enviava `{}` e recebia corretamente invalid_schema antes da validação factual. Corrigida a fixture para uma saída válida, que prova insufficient_facts. Nenhuma implementação foi alterada para satisfazer a expectativa.

## Limites

Testes locais não certificam autenticação hospedada, interpretação humana, motor integral, qualidade de modelo ou todas as 25 ofertas. Treze produtos ainda não têm calculador; as doze bases são parciais. Aprovações inseridas pelo proprietário do banco de teste não homologam modelos/prompts. Gates, features, provedores, gasto R$0 e migrações hospedadas permanecem inalterados. Esta WU amplia evidência web, não a cobertura de PDF/SVG/áudio/e-mail.
