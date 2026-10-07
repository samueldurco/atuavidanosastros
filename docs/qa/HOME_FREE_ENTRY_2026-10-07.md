# Home: entrada gratuita, leituras e Revista ATVNA

- RUN_ID: `ATV-20260902-170644Z-01A0630F`
- WU: `HOME-FREE-ENTRY-20261007`
- Base: `origin/main` em `5bfcd21`
- Branch: `codex/home-comece-gratuitamente`

## Escopo autorizado

Decisão do proprietário em 07/10/2026: destacar ferramentas gratuitas em **Comece gratuitamente**, adotar **Revista ATVNA**, reservar **Loja dos Signos** aos produtos físicos e reunir os produtos digitais em uma seção própria.

A implementação apresenta, nesta ordem, Comece gratuitamente, Leituras e experiências, Revista ATVNA, Loja dos Signos e método. `/leituras` reúne o catálogo digital existente de 25 produtos nos seis temas, com filtro por tema e disponibilidade individual. ATV+ aparece separadamente como continuidade.

## Disponibilidade preservada

- A entrada gratuita desta release é a Bússola de Carreira em `/bussola-de-carreira`: cálculo público de signo e grau do Meio do Céu, sem cadastro. O resultado salvo continua vinculado à conta.
- Ascendente, horóscopo, prévia do par, carta do dia e registro de sonho não são anunciados como ferramentas públicas liberadas. A navegação vigente não comprova essa disponibilidade. Ascendente também depende da homologação do motor prevista em `docs/adr/0004-astrology-engine.md` e `docs/contracts/astrology-engine.md`.
- O catálogo digital reutiliza os estados do domínio. Os testes gratuitos privados continuam restritos às identidades já autorizadas pelo fluxo existente; esta alteração não concede acesso.
- A Revista mantém a rota canônica `/caderno`, os filtros e os 12 artigos publicados. Os três destaques da home vêm do registro editorial aprovado, em assuntos diferentes. Nenhum texto editorial foi alterado e nenhum rascunho foi publicado.
- A Loja mantém a coleção em preparação. Não foram criados produtos físicos comerciais, preços, estoque, checkout ou ofertas.
- A arte de astrologia da home reutiliza a ilustração oficial existente. Não há geração de mídia ou integração paga.

## Validação local

- `pnpm check`: PASS, zero erros e zero avisos.
- `pnpm lint`: PASS. Os dois arquivos ajustados após essa execução passaram por nova formatação e ESLint focal.
- Playwright: **31 PASS**, cobrindo navegação pública, descoberta dos 12 artigos, teclado, acessibilidade e páginas públicas, incluindo `/leituras` e `/caderno`.
- Playwright final: **5 PASS**, cobrindo acessibilidade da home em desktop e mobile, ordem das quatro seções, catálogo com 25 produtos, filtro Amor, canonical, reflow em 320/1440 px e cálculo público de Meio do Céu com dados sintéticos.
- SEO após inclusão do catálogo: **8 PASS** no Playwright e **37 PASS** na suíte editorial unitária. As duas verificações de quantidade do sitemap agora exigem `/leituras`, preservando a exclusão de conteúdo não publicado.
- `git diff --check`: PASS.
- Conferência visual das capturas de 320 e 1440 px: PASS; hierarquia, arte oficial, seções e acessos presentes. Sem rolagem horizontal nos testes.

Logs completos locais, fora do commit: `E:/ATVNA/.worktrees/home-e2e.log`, `home-e2e-final.log`, `home-check-final.log`, `home-lint.log` e `home-lint-final.log`. Capturas em `apps/web/test-results/` do worktree isolado.

Verificações finais de sitemap: `E:/ATVNA/.worktrees/home-seo-final.log` e `E:/ATVNA/.worktrees/home-editorial-unit-final.log`.

## Publicação

Esta evidência local não comprova publicação. O merge depende dos checks `quality`, `accessibility`, `secrets`, `sbom` e `Cloudflare Pages` no SHA da revisão. A comprovação hospedada deve registrar também os checks do SHA integrado, o deployment canônico com o mesmo SHA e verificações HTTP da home, catálogo, Revista, Loja, arte e cálculo público.

Evidência hospedada após esses gates: `E:/ATVNA/app/docs/qa/HOME_FREE_ENTRY_HOSTED_2026-10-07.json`.
