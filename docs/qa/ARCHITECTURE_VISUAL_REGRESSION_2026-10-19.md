# Arquitetura integral — regressão visual de 19/10/2026

Status: **PASS local**. Este relatório não confirma publicação em produção.

## Escopo e critérios preservados

Revisão das falhas 14–26 registradas em `test-results/architecture-integrated-e2e.txt`, seguindo a skill `atvna-web-design`, o MVP visual aprovado e `docs/contracts/architecture-offers-20261015.md`.

A esteira pública continua com 19 ofertas. Os IDs históricos, as entregas privadas e os redirecionamentos expressos permanecem preservados. Não houve alteração em autenticação, gates, preços ou pagamentos.

## Causas e correções

| Causa comprovada | Correção | Evidência |
| --- | --- | --- |
| O helper exigia decodificação de imagens lazy ocultas por CSS, com caixas 0 × 0, e de cards fora da área visível. | Exigir imagens efetivamente renderizadas; para lazy, conferir interseção horizontal e vertical com o viewport. A marca deve existir e ao menos uma imagem requerida deve decodificar. | As 13 superfícies passaram nas nove larguras, sem remover os checks de imagem entregue. |
| A palavra “Aprofundamento” determinava a largura mínima da coluna e causava transbordamento no produto do casal. Documento com 367 px em viewport de 320 px. | `min-width: 0` nas colunas, quebra defensiva do título e tamanho mobile fluido de 32 a 43 px. | Documento final de 320 px; título integral legível, sem separação da palavra na captura inspecionada. |
| Dinheiro e Carreira — 30 Dias repetia a composição do Calendário Pessoal; eram apenas 18 desenhos distintos entre 19 ofertas. | Composição própria de bússola gravada sobre calendário de 30 dias, reaproveitando asset aprovado e a paleta do MVP. | 19 composições distintas em 320 e 1440 px, comparadas após remoção dos textos SVG. |
| O cabeçalho usava apenas media query de viewport e excedia a largura disponível com zoom de 200%. Documento de 1684 px em viewport de 1440 px. | Container query local oculta os atalhos quando falta espaço e conserva o botão Menu. | Documento final de 1440 px; Menu abre, Escape fecha e devolve o foco ao botão. Desktop sem zoom conserva atalhos. |
| O loader público consultava o catálogo histórico e expunha páginas que saíram da esteira. | Consulta a `customerOffers`, após resolver redirecionamentos explícitos. | Todas as ofertas vigentes retornam 200; aliases mantêm 308; produtos históricos sem oferta/alias retornam 404. |

## Validação executada

Servidor local recompilado em `http://127.0.0.1:4182`, coordenado pela execução principal.

```text
pnpm exec playwright test tests/visual-v3.e2e.ts --config test-results/architecture.playwright.config.ts --workers=2
22 passed (2.7m)
```

A suíte executou com um worker efetivo, conforme sua configuração, e cobriu:

- Reflow e imagens entregues em 320, 360, 390, 430, 768, 820, 1024, 1280 e 1440 px, para 13 superfícies.
- Todas as 19 páginas de oferta e seus cards em 320 e 1440 px: assets decodificados, arte distinta, texto separado da ilustração, CTA presente e ausência de transbordamento.
- Falha real de carregamento dos assets, título longo, zoom de 200%, navegação aberta, Escape, retorno de foco e análise de acessibilidade.
- Contraste e semântica dos seis universos com axe; impressão do catálogo e da leitura privada de fixture.
- Redirecionamentos 308 expressos, atalho da Bússola de Carreira e 404 para todos os produtos históricos fora das ofertas que não possuem alias explícito.

Também passaram Prettier, ESLint focal dos arquivos TypeScript/Svelte alterados e `git diff --check`.

## Evidências locais

- Log completo: `test-results/architecture-visual-regression-20261019.txt`.
- Screenshots e artefatos da suíte: `apps/web/test-results/architecture-local-e2e/`.
- Captura adicional inspecionada visualmente: `apps/web/test-results/career-calendar-1280.png` — bússola, calendário e texto equilibrados, sem colisão.
- Captura adicional inspecionada visualmente: `apps/web/test-results/couple-title-320.png` — título completo, CTA legível e ilustração abaixo da copy, sem corte lateral.

Os arquivos extensos de execução e capturas são evidências locais ignoradas pelo Git. O resultado cobre Chromium e o build local validado; a liberação hospedada permanece sob a execução principal.
