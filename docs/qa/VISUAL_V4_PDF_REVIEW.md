# V4 PDF - revisão visual final local

Data: 2026-10-09. Revisão de fixtures sintéticas, sem dados de produção, chamadas externas, alteração de código ou reexecução de testes. HEAD base observado: **85519cbfc966975ca80bee54dbd5219c5d684fb0**, com alterações locais do executor.

**Resultado:** aceite visual local da rodada final para as páginas inspecionadas. Capas dos seis universos, seis métodos Tarot, mapas A/B, calendário, texto, fontes e paginação passam. Os 22 PDFs têm novos hashes; a tinta **#193549** está presente nos bytes atuais. Não foi encontrado defeito visual concreto nas amostras finais. As pendências preliminares de tinta, geração pública e expectativa do teste DB foram encerradas pelas provas abaixo.

Este aceite não concede liberação hospedada, aprovação editorial de fixtures, autorização de entrega de formatos adicionais ou dispensa dos gates de acesso e cálculo.

## Evidências e método

- [Exports e produtos privados](E:/ATVNA/tmp/v4-formats-final.log): 92/92 testes, 5 arquivos, 80,77 s.
- [Históricos e DB](E:/ATVNA/tmp/v4-db-final.log): 7/7 testes, zero falhas, 25,67 s.
- [PDF público final](E:/ATVNA/tmp/v4-public-pdf-final.log): 6/6 testes, 1 arquivo, 8,86 s. O executor habilitou ATV_PDF_QA=1; esta rodada efetivamente regenerou os arquivos públicos.
- [SVG histórico e rollback final](E:/ATVNA/tmp/v4-svg-db-final.log): 1/1 teste, zero falhas, 3,87 s, com fixture birth-chart e geometria sintética.
- Estes são logs existentes do executor. A auditoria apenas os leu; não reexecutou testes.
- 20 PDFs privados em [fixtures privadas](E:/ATVNA/.worktrees/visual-v4-integration-20261009/apps/web/.trial-qa) e 2 públicos em [fixtures públicas](E:/ATVNA/.worktrees/visual-v4-integration-20261009/test-results/pdf): **244 páginas**, sendo 237 privadas e 7 públicas. O caminho público observado é test-results/pdf na raiz do worktree; apps/web/test-results/pdf não contém estes arquivos.
- **50 páginas renderizadas a 120 dpi por Poppler; 37 páginas distintas inspecionadas visualmente.** Incluem capas dos seis universos, capas e diagramas dos seis métodos Tarot, mapas A/B, calendário e páginas finais. A verificação automática de todas as páginas não equivale à inspeção visual integral.
- [Manifesto final](E:/ATVNA/tmp/v4-pdf-qa/final/manifest.json), observado às 07:09:05: paths, SHA-256 dos 22 PDFs, quantidade de páginas, PNGs selecionados, fontes, dimensões e matrizes de desenho. Todos os 22 hashes diferem da rodada preliminar.
- Todas as 244 páginas são A4, **595,28 × 841,89 pt**. A sequência de rodapés i / n foi encontrada em todas as páginas. Nenhum U+FFFD foi encontrado na extração pypdf.
- A proporção da imagem de capa coincide com a matriz efetiva de desenho nos 22 arquivos: erro absoluto máximo **1,1102230246251565e-16**. Não há deformação da arte.
- As capas atuais contêm os operadores de cor correspondentes a **#193549**; os dois renderers usam rgb(25 / 255, 53 / 255, 73 / 255): [privado](E:/ATVNA/.worktrees/visual-v4-integration-20261009/apps/web/src/lib/trials/pdf.ts:45) e [público](E:/ATVNA/.worktrees/visual-v4-integration-20261009/apps/web/src/lib/server/product-pdf.ts:48). Recursos de fonte identificados: Bodoni Moda, Newsreader e Onest.

## Amostras e observações

| Universo / família         | PDF e páginas inspecionadas                                        | Resultado visual                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Meu Céu                    | birth-chart: 1, 2, 21                                              | Lua correta, título longo em duas linhas, mapa e legenda íntegros, referências e rodapé 21/21 legíveis.                                   |
| Ciclos e Tempo             | personal-calendar: 1, 2, 3, 20, 39                                 | Fases da Lua proporcionais; grade mensal, texto diário e página final cabem na área útil; rodapé 39/39.                                   |
| Amor e Relações            | synastry: 1, 3, 4, 21                                              | Arte do casal correta; mapas A/B separados, títulos e referências íntegros; rodapé 21/21.                                                 |
| Propósito e Prosperidade   | purpose-career: 1, 2, 15                                           | Sol correto; capa e mapa preservam espaço e proporção; fatos finais não invadem o rodapé 15/15.                                           |
| Tarot e Arcanos            | Seis métodos: 1 e 2; adicionalmente tarot-astrological-mandala: 11 | Mão/vara correta; layouts de 1, 3, 5, 10, 7 e 13 posições sem corte ou sobreposição; lista da Mandala e rodapé 11/11 íntegros.            |
| Sonhos e Símbolos          | dream-journal: 1, 2; dream-dossier: 5                              | Retrato correto; perguntas, prática, método, limites e referências com hierarquia legível; rodapés 2/2 e 5/5.                             |
| Público / leitura longa    | atv-synthetic-report: 1, 2, 4                                      | Arte do Meu Céu proporcional; palavra sintética extensa quebra dentro da largura útil; histórico indica atv-pdf-export/1.4.0; rodapé 4/4. |
| Público / leitura temporal | atv-week-temporal-synthetic: 1, 2, 3                               | Arte de Ciclos correta; resumo, fatos, fontes e histórico legíveis; atv-pdf-export/1.4.0 e rodapé 3/3.                                    |

Página externa branca confirmada nas amostras. As capas privadas usam recorte maior e as públicas um pequeno marcador, ambos proporcionais. Não foram observados elementos pretos indevidos, letras ausentes, acentos quebrados, texto cortado, elementos sobrepostos ou falha de transparência nas páginas inspecionadas.

Os diagramas mantêm painéis internos em creme/ouro e suas cores semânticas; a página externa permanece branca. Isso está registrado como característica visual observada, não como pendência da rodada preliminar. Geometria, posições Tarot, mapas A/B e legendas permanecem íntegros.

## Versões, históricos e gates

Os renderers, o domínio e o produtor usam as mesmas versões atuais. A [política de artefatos](E:/ATVNA/.worktrees/visual-v4-integration-20261009/packages/domain/src/artifacts.ts:4) preserva a recuperação dos bytes anteriores:

| Formato | Versão atual           | Históricos reconhecidos |
| ------- | ---------------------- | ----------------------- |
| HTML    | atv-web-export/1.3.0   | 1.0.0–1.2.0             |
| PDF     | atv-pdf-export/1.4.0   | 1.0.0–1.3.0             |
| SVG     | atv-svg-export/1.2.0   | 1.0.0–1.1.0             |
| Card    | atv-reading-card/1.2.0 | 1.0.0–1.1.0             |

A [migração V4](E:/ATVNA/.worktrees/visual-v4-integration-20261009/supabase/migrations/20261009090221_visual_v4_pdf_renderer.sql:24), apesar do nome PDF, atualiza a allowlist dos quatro formatos. A revisão estática confirmou a preservação de proprietário, revisão, reviewDigest, política, liberação e promoção editorial; locks e idempotência continuam ligados ao run/revisão/formato/seção/renderer.

Elegibilidade permanece finita: PDF público somente para birth-chart, life-atlas, personal-calendar, solar-return, synastry, couple-dossier, purpose-career, dream-dossier, dream-atlas e week-reading; SVG somente birth-chart/ascendant com projeção cartográfica disponível; card somente seção válida, índice 0–39; demais formatos exigem seção -1. A cobertura de 20 PDFs privados pertence à esteira privada e não amplia a lista pública. Produtos sem PDF continuam fora da entrega PDF.

A migração mantém validação de base64 canônico, SHA-256, limite de 8.388.608 bytes por artefato e 2.000.000 bytes para SVG/card, quotas de proprietário/run e limite de 200 artefatos. A RPC continua restrita a service_role, com search_path vazio e privilégios revogados de PUBLIC/anon/authenticated.

O [forward-fix](E:/ATVNA/.worktrees/visual-v4-integration-20261009/supabase/forward-fixes/disable_visual_v4_pdf_renderer.sql:3) bloqueia novas escritas V4 de HTML/PDF/SVG/card e conserva as versões anteriores. A leitura histórica continua passando pelo gate existente. O [teste DB V4](E:/ATVNA/.worktrees/visual-v4-integration-20261009/scripts/product-visual-v4-renderer-db.test.mjs:90) cobre persistência, leitura, hashes e idempotência das versões PDF 1.0–1.4, HTML 1.0–1.3 e card/SVG 1.0–1.2. O trecho SVG usa birth-chart com cartografia sintética; rollback rejeita novas versões, preserva recuperação e reaplicação restaura escritas idempotentes. A política desativada mantém a leitura indisponível. O comentário do forward-fix também identifica os quatro formatos.

## Distinção hospedada

**Condição informada pelo executor:** o Supabase hospedado dispõe da esteira private_trials reconstruída. product_runs, product_artifacts, workflow_releases, editorial_promotions e persist_product_artifact da esteira pública estão ausentes.

A migração V4 é destinada à pilha pública atualmente inativa. **Não aplicar isoladamente nem criar/ampliar o schema hospedado para acomodá-la.** As provas locais/PGlite não demonstram implantação pública hospedada. O aceite visual não altera Gate B/Lab, autorizações editoriais, cálculo, entrega privada nem a necessidade de validar o contrato hospedado real.

## Imagens e hashes finais

- [Seis universos](E:/ATVNA/tmp/v4-pdf-qa/final/covers-six-universes.png) e [seis capas Tarot](E:/ATVNA/tmp/v4-pdf-qa/final/covers-six-tarot.png).
- [Diagramas](E:/ATVNA/tmp/v4-pdf-qa/final/diagrams.png) e [seis layouts Tarot](E:/ATVNA/tmp/v4-pdf-qa/final/diagrams-six-tarot.png).
- [Páginas finais](E:/ATVNA/tmp/v4-pdf-qa/final/last-pages.png) e [calendário / público](E:/ATVNA/tmp/v4-pdf-qa/final/calendar-and-public.png).
- Ampliações inspecionadas: [mapa natal](E:/ATVNA/tmp/v4-pdf-qa/final/birth-chart-p2.png), [Mandala](E:/ATVNA/tmp/v4-pdf-qa/final/tarot-astrological-mandala-p2.png), [calendário diário](E:/ATVNA/tmp/v4-pdf-qa/final/personal-calendar-p20.png), [histórico público longo](E:/ATVNA/tmp/v4-pdf-qa/final/atv-synthetic-report-p4.png) e [histórico público temporal](E:/ATVNA/tmp/v4-pdf-qa/final/atv-week-temporal-synthetic-p3.png).
- SHA-256 final de birth-chart: **223a815923bda55b43c091ae26b3ac5b754a1b517a276f97be149cfc97544f6a**.
- SHA-256 final de atv-synthetic-report: **57be50bb0a0b3e2633a01a71fe933174e643c33ab1e12aaa9efefafe92808239**.
- SHA-256 final de atv-week-temporal-synthetic: **4f94d9875e80efa2d405901ac539abd8e9d731195dafa45c29c17ec90858bf44**.
- O [manifesto final](E:/ATVNA/tmp/v4-pdf-qa/final/manifest.json) contém os 22 hashes completos. PNGs preliminares não são prova da tinta final.

Aceite local concluído dentro da amostragem descrita; nenhuma pendência preliminar antiga permanece aberta neste relatório.
