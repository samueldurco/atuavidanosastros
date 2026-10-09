# V4-09 — proposta finita de QA do runtime

Status: proposta de validação; não representa testes executados, aceite funcional ou publicação.

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Base inspecionada: `85519cbfc966975ca80bee54dbd5219c5d684fb0`, com runtime V4 em implantação na worktree `E:/ATVNA/.worktrees/visual-v4-integration-20261009`. Manifesto aprovado: `576f6d5fa1dee7d009f066b85432a5e5c84ea3dc9fc59efd6cf8f4160b49061d` (`docs/qa/VISUAL_V4_ASSETS.json`, ainda `measured_runtime:false`).

Autoridade: `E:/ATVNA/DESING SITE/SITE atvna desing/V4/FECHAMENTO_V001/INTEGRACAO_V001.md`, seção V4-09. Exige mobile/desktop, 320 px, zoom, contraste, teclado, erros/carregamento, acesso privado, compartilhamento, impressão, SVG, medição do app real, gates, commit/CI e validação hospedada antes de declarar publicação. A base visual congelada não substitui a reconstrução funcional.

## 1. Atualização de visual-v3.e2e.ts

Manter o nome do arquivo nesta WU preserva sua inclusão explícita no CI. Alterar nomes das provas para V4 e os pontos abaixo, conservando contratos de produto/URLs/estados.

| Linhas antes da alteração | Atualização e contrato |
|---|---|
| 5–19 | Manter as 13 superfícies existentes; usar nomes explícitos de rota/estado nos artefatos. As rotas `_spec` continuam identificadas como regressão sintética local. |
| 21–23 | Matriz principal de larguras 320, 360, 390, 430, 768, 1280 e 1440. Preservar 1024 já existente e tablet 820 no Gate B. Parametrizar caso por rota/largura para falha e artefatos independentes, evitando acumular toda a matriz em um timeout de 60 s. |
| 25–46 | Preservar resposta 200, H1 acessível e overflow de no máximo 1 px. Conferir `.v4-experience`, identidade visual esperada, fontes efetivamente carregadas, imgs visíveis decodificadas e backgrounds CSS V4. Uma lista vazia de imagens não pode aprovar a entrega de arte. |
| 33–38 | Prefixo integrado `/brand/v4/`. Registrar requests/responses e falhas; conferir imagens e fundos esperados por referência. Backgrounds com `image-set` devem verificar o recurso realmente escolhido pelo browser, sem exigir download das alternativas não selecionadas. Incluir pseudo-elementos relevantes e evitar dependência apenas de `<img>`. |
| 47–57 | Capturar todas as superfícies da matriz principal, além do catálogo em 390 e 1440. Manter captura de viewport e página inteira com nomes únicos. Esperar fonts/decode e arte visível; não usar `catch(() => {})` como prova de sucesso de decode. Registrar consentimento antes de sua recusa e composição após a recusa. |
| 63–69 | Preservar os 26 itens do catálogo, rotas reais e título exatamente igual a `product.name`. Para os 25 produtos dos universos, substituir `.v3-experience[data-v3-theme]` por `.v4-experience[data-universe]` e conferir o mapeamento independente: `meu-ceu→meu-ceu`, `ciclos-tempo→ciclos`, `amor-relacoes→amor`, `proposito-prosperidade→proposito`, `tarot-arcanos→tarot`, `sonhos-simbolos→sonhos`. Tratar `atv-plus/global` separadamente; não inventar universo temático. Não importar a função runtime que o próprio teste pretende verificar. |
| 72–93 | Abortar arte V4, preservar título longo e controles acessíveis/acionáveis, verificar reflow e axe. Evitar depender de `h1 span`, um detalhe V3: utilizar o H1 semanticamente. Rotular `CSS zoom:2` como simulação; acrescentar ampliação de texto 200% e reflow equivalente a 400%, com evidência específica. Não declarar zoom nativo ou AT humano sem execução real. |
| 95–100 | Manter axe sem exclusões nos seis universos a 390 px; adicionar captura/identidade de cada universo. Não dispensar contraste efetivo por aprovação dos tokens globais. |

A matriz é finita: superfícies principais nas sete larguras; catálogo completo em mobile/desktop; estados críticos dos modelos de autenticação, biblioteca/leitor, formulário e ATV+ nos testes existentes. Isso não é prova de cada estado de cada produto em cada largura: registrar a cobertura exata.

## 2. Reutilizar provas existentes

- `gate-b.e2e.ts:14–17`: conservar desktop 1440, tablet 820, mobile 390 e reflow 320. Linhas 49–119 cobrem skip link, teclado, menus, Escape/restauração de foco, tabs, trap de dialog/drawer/sheet e recuperação 503. Não enfraquecer essas expectativas.
- `gate-b.e2e.ts:120–160`: conservar reduced motion e limiares 4,5:1 texto / 3:1 foco e controles. Seus cálculos usam tokens sólidos globais; adicionar evidência dos pares realmente usados em cards/painéis transparentes e backgrounds V4, inclusive foco/hover/disabled/erro. A cor composta exige avaliação específica.
- `consent-reflow.e2e.ts:4–6`: manter 320×200, 568×320 e 320×844, controles alcançáveis por teclado, decisão persistida e reload. Não substituí-los por viewport alto.
- `private-accessibility.e2e.ts`: preservar oito estados sintéticos e falhas de API, desktop/mobile; acrescentar screenshots únicas se faltarem. Suítes de reconstrução preservam hierarquia, fatos, consentimento, permissões e capacidades de cada produto.
- Se leitor/formato for alterado, executar `product-svg.e2e.ts`, `product-export.e2e.ts`, `product-card.e2e.ts`, `product-artifacts.e2e.ts`, `product-run-reader.e2e.ts` e `library-reader.e2e.ts`. Preservar segurança/contenção SVG, integridade factual, legibilidade print/PDF e elegibilidade dos controles de exportação/compartilhamento.
- `fixtures/accessibility.ts:5–13`: manter WCAG2/2.1/2.2 AA e violações vazias sem regras desligadas. O JSON completo inclui `incomplete`; revisar/documentar esses resultados. Em loops com múltiplas páginas, usar nome de axe por rota/estado ou teste separado para não sobrescrever `axe-results.json`.

## 3. Servidor e comandos

`apps/web/playwright.config.ts:3–16` já usa Chromium, URL local 127.0.0.1, porta `ATV_E2E_PORT` ou 4173, build + Wrangler Pages local, `reuseExistingServer:false`, timeout de servidor 300 s e traces em falha. V4 não exige mudar config/package scripts. Não iniciar um preview concorrente na mesma porta para esta execução.

Comando principal, na raiz da worktree, depois de atualizar os testes:

```powershell
pnpm --dir apps/web exec playwright test visual-v3.e2e.ts public-accessibility.e2e.ts public-menu.e2e.ts private-accessibility.e2e.ts gate-b.e2e.ts consent-reflow.e2e.ts --workers=1
```

Ele constrói e inicia o servidor local automaticamente. Se Chromium não estiver instalado: `pnpm --dir apps/web exec playwright install chromium`. Para inspeção manual local: executar `pnpm --dir apps/web build` e depois `pnpm --dir apps/web preview`; encerrar esse preview antes do comando E2E acima. Se necessário, definir uma porta livre por `ATV_E2E_PORT`.

Verificação focal durante implementação: `pnpm --dir apps/web check`, lint dos arquivos alterados e teste visual afetado. Gates finais quality para o novo SHA:

```powershell
pnpm install --frozen-lockfile
pnpm audit --audit-level=low
pnpm check
pnpm lint
pnpm test:unit
pnpm test:db
pnpm build
pnpm build:trial-runtime
```

Gate canônico `.github/workflows/ci.yml`: quatro jobs `quality`, `accessibility`, `secrets`, `sbom`. Conservar todas as listas explícitas de accessibility (linhas 49–57: editorial-release, editorial/SEO, público/privado, reconstruções, horóscopo/ATV+ e social). O comando principal acima é focal, não substitui esse conjunto. CI guarda `apps/web/test-results/` por sete dias; copiar a evidência necessária ao registro durável.

## 4. Evidência e encerramento

Registrar SHA final, RUN_ID, manifesto/referência por superfície, viewport/estado, screenshot e hash, axe completo, contraste efetivo, foco/reflow, resultados/logs dos comandos e limitações. Medir assets do build atual: bytes, dimensões, respostas/falhas, fontes, cache e requests. Medir LCP/CLS nas páginas reais representativas, identificando browser/servidor/rede/cache/throttling; não reaproveitar números V3 nem tratar decoded bytes como transferência comprimida ou laboratório como dados de campo.

Fixtures comprovam regressão local de componentes/estados. Não substituem autorização real, persistência hospedada, aceite editorial, marcos E1–E5, compartilhamento elegível ou publicação. Preservar esses aceites separados. Só declarar publicação após gates e validação hospedada do mesmo SHA.
