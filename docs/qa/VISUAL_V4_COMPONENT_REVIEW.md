# Revisão final estática de componentes V4

Data: 2026-10-09. Worktree: `E:/ATVNA/.worktrees/visual-v4-integration-20261009`. HEAD observado: `85519cb`, com alterações locais do executor em curso. Inspeção com `git -c core.autocrlf=false diff --ignore-space-at-eol`. Esta nota é o único arquivo escrito pela auditoria. Não executou navegador, fornecedores, exportações, testes ou migrações; não constitui aceite V4-09 nem liberação hospedada.

## Resultado final

Nenhum bloqueador adicional de composição, autorização, integridade de versões ou perda de conteúdo foi identificado no delta inspecionado. As duas diferenças concretas encontradas nesta releitura foram corrigidas pelo executor e conferidas novamente no código:

| Diferença encerrada | Evidência da correção |
| --- | --- |
| Marca A do rodapé Meu Céu estava com tinta azul escura sobre painel azul. | `SiteFooter.svelte:18` agora passa `onDark={!universe || universe === 'meu-ceu'}`. A variante `escuro` tem tinta `#FCFBF8`; a variante `claro` tem tinta `#031744`. Meu Céu usa painel `#1a3a50ed`, como a referência. A escolha coincide com o rodapé aprovado de `INTERNAS/m03-01.html`; header sobre papel claro e demais universos mantêm a variante apropriada. |
| Ao imprimir, a arte era ocultada, mas seu espaço de título permanecia reservado. | `visual-v4.css:381` agora limpa altura mínima/altura/padding/margin/largura máxima de `.v4-title-group.with-object` no papel. Corresponde ao reset aprovado de `INTERNAS/fechamento-v003.css:24`. |

O servidor/build 4173 dos testes anteriores antecede essas duas correções. O resultado visual final depende do build/E2E/CI da revisão exata; o relatório não reaproveita testes anteriores como prova dessas correções.

## Composição e estados preservados

| Superfície | Contrato confirmado no código |
| --- | --- |
| `ui/PageIntro.svelte` | Recebe identidade opcional, reúne `V4Artwork title` e `VisualHeading` em `.v4-title-group.with-object` e conserva descrição/ações. O primeiro bloco tem `min-width:0`; ações e introdução permitem reflow. O título continua em texto semântico independente da imagem. |
| `ProductRunReader.svelte:281` | Passa `identity={data.run.productId}`. Não existe mais artwork órfão ou vinheta V3 antes da introdução. Aviso sintético, `ReadingShell`, capítulos, origem, histórico, ações e condicionamento à liberação permanecem. `.atlas` em `ReadingShell` representa o leitor calculado de `birth-atlas`, não marca Atlas antiga. |
| `testar-produtos/leituras/[id]/+page.svelte:133` e `ReadingExperience.svelte` | O `PageIntro` recebe `data.saved.product_id`; a arte anterior saiu do corpo de `ReadingExperience`. Identidade, percurso, progresso, notas e feedback não foram substituídos por material decorativo. |
| `NatalIntake.svelte:416`, `SymbolicIntake.svelte:91`, `DirectionJourneyIntake.svelte:85` | Usam o grupo de título e a identidade real do produto. `VisualHeading` mantém `natal-product-title`, `intake-title` e `journey-title`; `aria-labelledby`, `aria-busy`, formulários e estado de erro continuam vinculados aos elementos existentes. |
| Gravuras Meu Céu/Tarot | `V4Artwork.svelte` usa `zodiac-object` com `MATERIAS/ZODIACO_V003/mandala-autonoma-640-v003.webp`, como o HTML aprovado, e `MATERIAS/simbolos/cartas.svg` em Tarot. Gravuras têm `aria-hidden`/`alt=""`; não substituem mapas calculados nem títulos. |
| Marca A e V3 | `BrandLogo` usa assinatura horizontal/compacta do `KIT_A_V001`; layout usa micro 32 e apple-touch 180 do kit. Busca em componentes/rotas por `visual-v3`, `/brand/v3`, `atlas-theme`, `atlas-stage`, `v3-heading`, `v3-product-mark`, `atv-symbol.svg` e `atv-monogram.svg` não encontrou consumidores. |
| Impressão do conteúdo | `visual-v4.css` oculta decoração e `.v4-paper-card::before`; não oculta o artigo `.v4-paper-card`. O reset final fixa tinta/superfície também em `#conteudo`. `reader-content` continua visível, com papel branco; reserva da gravura foi removida. |

A composição horizontal reserva área para a gravura; em até 767px o grupo passa a coluna, padding zero e arte de 220px escalada. `overflow-wrap:anywhere`, grids com `minmax(0,1fr)`/coluna única e `min-width:0` ajudam o texto a refluir. Essa leitura de CSS não substitui prova de ausência de sobreposição/overflow em 320, 360, 390, 430, 768, 1280 e 1440px.

## Paleta, versões e política dos formatos

`data/visual-v4-export.ts` transporta tinta/linha aprovadas em `INTERNAS/universos-v002.css`: Meu Céu `#193345/#c09c73`, Ciclos `#193549/#8b7256`, Amor `#442d32/#965c48`, Propósito `#303a2d/#7d7048`, Tarot `#3d3027/#8b673e`, Sonhos `#30364e/#76748f`. A tinta funcional Meu Céu sobre papel claro é distinta de seu marfim sobre painel azul. O kit de marca exige azul `#031744`, marfim `#FCFBF8` e contraste sobre campo estável; não autoriza uniformizar os universos.

Os exports web/PDF/SVG/card e `packages/domain/src/artifacts.ts` concordam em `atv-web-export/1.3.0`, `atv-pdf-export/1.4.0`, `atv-svg-export/1.2.0` e `atv-reading-card/1.2.0`. O domínio conserva todas as versões históricas já admitidas, limites de bytes/MIME, elegibilidade por produto/formato, revisão/digest/sha256 e rejeição de versão futura. Os produtores usam essas constantes.

Na comparação local de `supabase/migrations/20261009090221_visual_v4_pdf_renderer.sql` com a migração anterior de versões, a mudança funcional é a lista das novas versões. Continuam ownership, bloqueios transacionais, política, release/promotion, revisão/digest, formatos específicos do produto, validação de base64/hash/quotas, idempotência e execução restrita a `service_role`. O forward fix retira novas escritas sem invalidar bytes históricos recuperáveis. Testes locais foram adaptados para a migração; o teste de versões inclui recuperação histórica, rejeição futura, roundtrip, idempotência e desativação. A auditoria usou a skill Supabase somente para leitura do contrato local, sem acesso a projeto remoto.

`chart-engine-v2.ts` altera papel/tinta de apresentação e preserva azul `#365d7d`, vermelho `#99513d` e ouro `#967536` com significado nos aspectos e distinção de pessoas. `tarot-diagram.ts` recebe a paleta Tarot sem mudar cartas, posições ou fatos. Diagramas continuam calculados; as versões do esquema geométrico não precisam mudar apenas por tinta/papel. Os renderizadores de formato avançaram suas versões.

Nenhuma conclusão sobre existência/aplicação dessas tabelas ou funções no hospedado decorre desta comparação. O executor informou que a implantação hospedada segue somente a esteira privada reconstruída e não possui as tabelas públicas de artifact/workflow/editorial; a prova hospedada deve respeitar esse contrato real.

## Prova V4-09 a registrar pelo executor

O arquivo existente `tests/visual-v3.e2e.ts` já verifica V4 em 320/360/390/430/768/820/1024/1280/1440px, resposta 200, h1, carregamento de gravuras e largura global. Hoje salva capturas somente de Home e produto Bússola; o único leitor na matriz é a fixture `career-compass` pronta. O teste de 200%/falha de arte usa o produto público; a impressão privada verifica apenas h1 de uma fixture de entrada. Isso ainda não prova a composição dos consumidores privados recém-alterados.

Para fechar o delta finito, reutilizar a matriz existente para registrar entrada natal, Tarot/sonhos, jornada, leitor de workflow e leitor de teste. Conferir grupo de título sem sobreposição, nome/título longo, controles e mensagem de erro/carregamento, foco visível, 200% de texto e gravura indisponível. Na impressão, confirmar h1 e parágrafos/sections visíveis e sem reserva da gravura. Anexar capturas de internas e rodapé Meu Céu nas larguras requeridas; a matriz de foco/estados privados existente é regressão técnica útil.

Fixtures e rotas `_spec` continuam identificadas como sintéticas e não comprovam leitura homologada, promoção de produto ou liberação hospedada. Aceites reais exigem evidência autorizada da esteira privada e seus gates, conforme `FECHAMENTO_V001/INTEGRACAO_V001.md:13–20` e a proposta já salva em `docs/qa/VISUAL_V4_QA_PLAN_2026-10-09.md`.

O executor informou `build/check`, 92 testes de exports e 7 testes DB aprovados; essa informação não é execução independente da auditoria. E2E de produção, inspeção das capturas, verificação da revisão exata e registro dos aceites permanecem sob responsabilidade do executor.
