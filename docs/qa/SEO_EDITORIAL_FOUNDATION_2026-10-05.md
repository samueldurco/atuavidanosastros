# SEO editorial — infraestrutura local

Data: 05/10/2026. RUN_ID: `ATV-20260902-170644Z-01A0630F`.

## Resultado e alcance

Implementação local da infraestrutura aprovada de SEO e descoberta editorial. Não representa publicação das 125 URLs propostas, validação de demanda das 835 consultas, admissão no Google Notícias, configuração do Search Console ou liberação hospedada.

O registro editorial de produção permanece vazio: `apps/web/src/lib/server/editorial-registry.ts`. Autores e chaves de revisão não foram inventados. As identidades e assinaturas sintéticas existem apenas no teste unitário, sem rota HTTP de publicação ou acesso ao registro pelo cliente.

## Entrega

- Hubs SSR `/noticias`, `/signos`, `/horoscopo` e `/compatibilidade`, com estado vazio explícito e `noindex` enquanto não houver conteúdo aprovado.
- Leitura SSR de documentos aprovados, perfis de autoria e suporte aos 15 novos guias evergreen do mapa. Os quatro caminhos de carreira existentes não foram substituídos.
- Aprovação Ed25519 independente vinculada a ID, revisão e digest exatos. Alteração de texto, metadados ou revisão invalida a aprovação. Ausência de confiança, conflito de autoria/identidade ou publicação futura fecha o acesso.
- Canonical, Open Graph, robots e JSON-LD seguro. Somente reportagem usa `NewsArticle`; guias, colunas e horóscopos usam `Article`. Sem datas fabricadas ou marcação de artigo nos hubs vazios.
- Índice de sitemaps, preservação dos 14 caminhos anteriores, sitemap editorial, News Sitemap com janela de 48 horas e partições de até 1.000 notícias, e RSS.
- Ausência de documento aprovado resulta em 404, inclusive signos, pares, guias e autores candidatos. Redirecionamento de par invertido só existe quando o documento canônico está aprovado.
- Imagens exigem dimensões inteiras, crédito, licença e descrição; previsões exigem referência versionada de facts. Isso não comprova arquivos, direitos ou cálculos reais: esses insumos ainda precisam de revisão e evidência.

Contrato: [public-editorial-seo.md](../contracts/public-editorial-seo.md). Arquitetura proposta: [mapa mestre](../seo/MAPA_MESTRE_SEO_ATVNA_2026-10-05.md).

## Validação local

| Prova | Resultado | Evidência local |
| --- | --- | --- |
| `pnpm --filter @atv/web check` | PASS: zero erros e avisos | `test-results/seo-check.log` |
| ESLint dos arquivos de SEO | PASS | `test-results/seo-lint.log` |
| `vitest run src/lib/server/editorial.spec.ts` | 36/36 PASS | `test-results/seo-unit.log` |
| `playwright test tests/seo.e2e.ts` | 6/6 PASS; build + preview Wrangler local | `test-results/seo-e2e.log` |
| `node scripts/validate-seo-keyword-map.mjs` | PASS: 125 propostas, 835 consultas, zero conflitos ou referências pendentes | Validador e manifesto versionados |
| `git diff --check` focal | PASS | Diff dos arquivos alterados |
| Suíte completa web `vitest run` | **Não passou**: 1.580 PASS / 4 falhas, 76 arquivos PASS / 3 com falhas | `test-results/seo-all-unit.log` |

Os testes editoriais cobrem assinatura adulterada, revisão divergente, revisor igual ao autor, revogação, conflito, datas inválidas/futuras, sources, dimensões inválidas, paths públicos, tipos de artigo, escaping de JSON-LD e corpo SSR, preview de imagens, janela de notícias, chunking de 1.001 itens, GUID/datas RSS e bloqueio de staging. O digest de facts é uma declaração assinada; não há conexão nova com motor nem prova astronômica de conteúdo real.

Os testes de navegador exercitam hubs vazios, HTML SSR, canonical único sem UTM, ausência de JSON-LD em acervo vazio, páginas privadas, 404, sitemaps e RSS sem fixtures, robots de staging e leitura mobile sem overflow. Um erro 404 simples sem documento HTML não requer meta robots; erros com HTML são conferidos como `noindex,nofollow`.

Revisão visual das capturas 390 × 844 e 1.440 × 1.000 após recusar analytics: conteúdo legível, espaçamento interno do card e nenhuma rolagem horizontal. Evidências: `test-results/seo-noticias-mobile.png` e `test-results/seo-noticias-desktop.png`. Não houve mudança de consentimento ou analytics.

Na primeira tentativa final de E2E, o build/preview excedeu a espera de 60 segundos do Playwright. Nova execução, sem alterar o timeout ou os testes, passou os seis casos em 45,1 segundos. A evidência válida é o log final acima.

## Falhas fora do recorte editorial

Na suíte completa, falharam os renders de PDF de `couple-dossier-reader.spec.ts`, `synastry-reader.spec.ts` e dois casos de `product-artifact-formats.integration.spec.ts` (Week PDF e Dossier). Esses arquivos não foram alterados pela implementação editorial. Não se atribui causalidade nem se declara falha preexistente sem comparação equivalente.

Reexecução serial isolada com `--maxWorkers=1`: 11/13 PASS, dois renders continuam falhando em `couple-dossier-reader.spec.ts` e `synastry-reader.spec.ts`. Os sete casos de `product-artifact-formats.integration.spec.ts` passaram nessa reexecução. Evidência: `test-results/seo-pdf-recheck.log`, duração 85,44 segundos. A causa dos dois renders restantes não foi diagnosticada nem corrigida nesta entrega.

## Limites e próxima liberação

Implementação e validação são locais. Não houve push, deploy, prova de CI desta entrega, alteração de DNS, acesso ao Search Console, submissão de sitemap, concessão de direitos, publicação editorial ou gasto. A suite ampla não é verde; a revalidação global e hospedada continua obrigatória antes de release.

Antes de publicar: proprietário/editorial fornecem textos originais, autores reais, revisor autorizado e chaves públicas legítimas; comprovam fontes, direitos de imagens e facts calculados quando aplicável; aprovam revisão/digest sob os gates existentes. Depois, engenharia valida o commit selecionado em CI e no domínio canônico disponível; o proprietário configura a propriedade legítima do Search Console e comprova envio dos sitemaps. Infraestrutura não substitui esses aceites.

RUN_ID, Gate B/Lab, default13, R$0, decisões de produto e trabalho paralelo de Loja, login e integrações foram preservados. A fila mestra não foi assumida por esta entrega de SEO. Rollback é focal, conforme contrato, sem reverter alterações paralelas.
