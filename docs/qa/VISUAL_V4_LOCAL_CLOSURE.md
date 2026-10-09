# ATVNA V4 — fechamento da validação local

RUN_ID `ATV-20260902-170644Z-01A0630F`. Base funcional `85519cbfc966975ca80bee54dbd5219c5d684fb0`; branch `codex/visual-v4-integration`. Integração L01–L07 concluída no app. A aprovação visual original permanece registrada no pacote V4; este relatório comprova o delta integrado, sem promover aceites de produto.

## Gates locais

| Verificação                        | Resultado                              | Evidência em E:/ATVNA/tmp                        |
| ---------------------------------- | -------------------------------------- | ------------------------------------------------ |
| Build production                   | PASS                                   | v4-build-corrections.log                         |
| Svelte/TypeScript                  | 0 erros, 0 avisos                      | v4-check-corrections.log                         |
| Lint completo                      | PASS                                   | v4-lint-complete.log                             |
| Unitários completos                | 2776 PASS; 13 skips existentes no web  | v4-unit-complete.log                             |
| Banco completo                     | 130 PASS                               | v4-db-complete.log                               |
| Formatos focais                    | 92 PASS                                | v4-formats-final.log                             |
| PDFs públicos regenerados          | 6 PASS                                 | v4-public-pdf-final.log                          |
| Histórico SVG/rollback/reaplicação | 1 PASS                                 | v4-svg-db-final.log                              |
| E2E focal production               | 72 PASS + 3 regressões corrigidas PASS | v4-e2e-corrections.log; v4-final-regressions.log |

Os 75 casos únicos do conjunto focal passam na união das duas rodadas sobre o mesmo build. Os três casos finais corrigem o parser de contraste para hexadecimal abreviado e os títulos esperados com pontuação aprovada. Nenhum limiar WCAG, gate, timeout ou lista canônica foi reduzido. O CI Ubuntu/Node22 ainda deve executar suas suites completas no SHA candidato.

A primeira rodada é preservada como diagnóstico: quatro falhas reais de contraste, corrigidas no app, e 54 cascatas após desconexão fatal do Wrangler no Windows. Ela não constitui aprovação. A rodada posterior confirmou menu, teclado, reduced motion, reflow de 320 a 1440, zoom, estados privados, impressão e indisponibilidade de arte.

O primeiro CI da PR 29 passou em `quality` e `sbom` e identificou dois problemas no material de QA. A inspeção dos artigos candidatos carregava o CSS sem o contêiner `v4-experience v4-internal` usado pelo layout real; o harness passou a reproduzir esse contexto, preservando os 12 artigos, as três larguras e todos os critérios Axe. A regressão local passou nos três testes, auditando 36 superfícies (`E:/ATVNA/tmp/v4-editorial-corrected.log`). O scanner classificou dois digests de conteúdo como chaves de API porque o nome do arquivo era a chave JSON; a prova agora separa `path` e `sha256`, preservando todos os digests e checks. Os logs anteriores permanecem em `E:/ATVNA/tmp/v4-audit/ci`; nenhuma regra ou exceção do scanner foi alterada.

## Provas visuais, formatos e desempenho

O CI `37920454678`, no candidato `0a9bc065`, passou em quality, secrets, sbom e Pages; accessibility registrou 147 de 149 casos PASS. Os dois casos de Horóscopo em 320/390 px tentavam marcar o consentimento de avisos sob o banner de cookies, que interceptava o clique. O fluxo do harness agora escolhe explicitamente “Recusar opcionais” e confirma o fechamento do banner antes de continuar; a inspeção inicial Axe com o banner, os estados de armazenamento e as verificações do consentimento de avisos permanecem. O resultado anterior é diagnóstico, sem promoção da produção. Regressão local: cinco testes PASS em 1,4 min, incluindo 320/390/1440 px, URLs inválidas e armazenamento indisponível; lint focal PASS (`E:/ATVNA/tmp/v4-horoscope-consent-corrected.log`, `E:/ATVNA/tmp/v4-horoscope-consent-lint-final.log`). Logs e contextos anteriores: `E:/ATVNA/tmp/v4-audit/ci/new-candidate/`.

- [PDFs](VISUAL_V4_PDF_REVIEW.md): 22 arquivos, 244 páginas; 37 páginas distintas inspecionadas. Seis universos e seis métodos de Tarot, tinta `#193549`, proporção, fontes e rodapés conferidos. Histórico dos quatro formatos preservado.
- [Budget production](VISUAL_V4_PRODUCTION_BUDGET.md): quatro cenários abaixo de 650 KiB iniciais de imagens/fontes; dez checks passam; CLS máximo 0,0194. Home final desktop/mobile expõe nove artes completas.
- O controle com os mesmos 49 assets verificados por SHA256 mediu LCP entre 184 e 352 ms; a comparação serial atribui os samples lentos à entrega local do Wrangler. Essa prova é diagnóstica. CWV hospedado/de campo permanece sem aprovação.
- [Revisão dos componentes](VISUAL_V4_COMPONENT_REVIEW.md) e [plano QA](VISUAL_V4_QA_PLAN_2026-10-09.md) mantêm a matriz e os contratos.

## Limite da liberação

V4-08 está implementada e validada localmente. V4-09 permanece em execução até CI completo no SHA exato, candidato, integração e deploy canônico, rotas/assets oficiais e evidência de reversão. [Preparação de release](VISUAL_V4_RELEASE_PREPARATION.md) registra a produção anterior `69949ee4-1720-489f-8ef4-d73d3606a970` e o SHA correspondente.

O Supabase hospedado contém somente a esteira privada. A migração da pilha pública de exports não será aplicada isoladamente; os exports privados usam o servidor existente. RLS, flags, preços, acesso gratuito, IA paga desativada e gates de interpretação permanecem preservados. Sessão Google real, aceite pessoal E5 e o programa integral continuam pendentes conforme seus contratos.
