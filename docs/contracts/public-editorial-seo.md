# SEO editorial público — contrato local v1

Data: 05/10/2026. RUN_ID: `ATV-20260902-170644Z-01A0630F`.

Esta implementação prepara a arquitetura aprovada em `docs/seo/MAPA_MESTRE_SEO_ATVNA_2026-10-05.md`. Não publica as 125 páginas propostas, não configura Search Console e não substitui os gates de produto, Gate B ou a revisão humana independente exigida pelo ADR-0006.

## Superfícies e inventário

| Superfície | Comportamento |
| --- | --- |
| `/noticias`, `/signos`, `/horoscopo`, `/compatibilidade` | Hubs SSR; sem publicações aprovadas, mostram o estado vazio e permanecem `noindex` |
| `/signos/{signo}`, `/horoscopo/{signo}` | Somente os 12 signos conhecidos; documento não aprovado retorna 404 |
| `/compatibilidade/{a}-{b}` | Ordem zodiacal canônica, incluindo pares do mesmo signo; inversão retorna 301 somente se o documento canônico estiver publicado |
| `/noticias/YYYY/MM/slug` | Reportagens, colunas e guias com mês válido |
| `/noticias/horoscopo/YYYY/MM/DD/slug` | Horóscopos datados com dia válido e proveniência de cálculo declarada |
| Guias evergreen | 15 novos caminhos de `evergreenGuidePaths`; somente documentos do tipo `guide`. As quatro páginas de carreira já existentes mantêm suas rotas dedicadas |
| `/pessoas/{slug}` | Perfil derivado de autoria real presente em documento aprovado; sem autor autorizado, 404 |

O calendário astral público é um guia editorial. Esta alteração não implementa calendários personalizados, cálculo astronômico, produtos privados, ofertas ou entrega de produtos.

As 835 consultas do mapa continuam candidatas sem métricas observadas. Rotas propostas não são prova de conteúdo existente nem de demanda medida.

## Registro e revisão independente

Fontes de execução: `apps/web/src/lib/server/editorial.ts` e `editorial-registry.ts`.

O registro começa vazio: nenhum texto, autor ou autoridade pública de revisão foi recebido para publicação. Os autores, matérias e chaves dos testes são sintéticos e não são importados pelo registro. Não existe endpoint de aprovação, emissor de assinaturas, CMS nem chave privada no app.

Para entrar no inventário público, um documento precisa de:

1. Estado `PUBLISHED`, ID e revisão válidos, caminho permitido, título, descrição e corpo não vazios, autoria identificada com biografia e fontes HTTPS.
2. Publicação original e modificação com fuso explícito, datas reais, sem data futura nem modificação anterior à publicação.
3. Aprovação da revisão exata por revisor diferente do autor, com SHA-256 do documento e assinatura Ed25519 verificável por uma chave pública previamente autorizada pelo proprietário.
4. Ausência de colisões de ID/caminho e de biografias conflitantes para o mesmo autor.

Estado textual `APPROVED` ou `PUBLISHED`, isoladamente, não libera publicação. Uma mudança no corpo, nas datas, na autoria, nas fontes, na imagem ou nos fatos altera o digest e exige nova aprovação. Remover a chave confiável retira os documentos dependentes na próxima leitura do registro. Não usar esta revogação para apagar o histórico de revisão externo.

### Protocolo da assinatura

`documentDigest(document)` serializa JSON recursivamente: arrays preservam a ordem, chaves de objetos usam ordenação lexical por unidades UTF-16, propriedades `undefined` são omitidas e valores primitivos usam `JSON.stringify`. Calcula SHA-256 dos bytes UTF-8 e retorna hexadecimal minúsculo. O documento editorial é dado JSON, sem funções ou ciclos.

`approvalPayload(approvalSemSignature)` serializa pelo mesmo método o objeto com `protocol: "atv-editorial-approval-v1"`, `keyId`, `documentId`, `revision`, `digest`, `reviewerId` e `approvedAt`. A assinatura Ed25519 é Base64 desses bytes; a chave pública é Base64 no formato raw. A chave privada fica com o revisor externo, nunca no runtime nem neste repositório.

O horário da revisão não pode ser posterior à modificação nem ao instante atual. Este protocolo não cria uma autoridade editorial legítima: o proprietário ainda precisa aprovar a identidade e a chave pública do revisor por um processo externo auditável. O app verifica a assinatura, não a veracidade biográfica de uma pessoa.

Horóscopos exigem motor, versão, digest dos fatos e intervalo de cobertura válidos. Esses campos são incluídos na revisão assinada, mas ainda não há ligação automática deste registro com o motor de cálculo nem verificação independente dos bytes dos fatos. Sem essa integração e os gates exigidos, não liberar previsões reais.

## Metadados e conteúdo visível

O conteúdo renderiza no servidor como texto escapado. Autoria, referências, publicação original, atualização efetiva e créditos de imagem aparecem no corpo. As datas visíveis usam `America/Sao_Paulo`, identificado como horário de Brasília.

Cada novo documento aprovado tem title, description, canonical absoluto na origem configurada, Open Graph e Twitter Card. Reportagens usam `NewsArticle`; colunas, guias, perfis, compatibilidade e horóscopos usam `Article`. JSON-LD escapa delimitadores de HTML e corresponde aos dados renderizados, sem autor, imagem ou data inventados.

Uma imagem editorial exige caminho local permitido, dimensões inteiras positivas, texto alternativo, crédito e licença declarados. Prévia grande exige largura mínima de 1200 px e área mínima de 300.000 pixels. O gate não comprova sozinho a existência do arquivo ou seus direitos: ambos devem integrar a revisão real antes de publicar. O logo geral não recebe automaticamente a regra de prévia grande.

Metadados novos não substituem title/canonical das páginas legadas. Páginas privadas, erros, caminhos desconhecidos e origens diferentes de `SITE.url` ficam `noindex`. `robots.txt` não é autorização de acesso; autenticação e RLS continuam necessárias e não foram relaxadas. A integração atual de analytics e seu consentimento não foram alterados.

## Descoberta e feeds

| Endpoint | Inventário |
| --- | --- |
| `/sitemap.xml` | Índice dos sitemaps de páginas, editorial e notícias |
| `/sitemap-pages.xml` | Os 14 caminhos legados anteriores e somente hubs com documentos aprovados |
| `/sitemap-editorial.xml` | Documentos aprovados e seus perfis de autoria; `lastmod` da modificação real |
| `/news-sitemap.xml` | Somente reportagens aprovadas, publicadas originalmente há menos de 48 horas |
| `/news-sitemap/2.xml` e seguintes | Partições adicionais quando necessárias; máximo de 1.000 notícias por arquivo, sem truncamento |
| `/noticias/feed.xml` | Até 100 publicações aprovadas sob `/noticias/`, com GUID canônico e data original |

O News Sitemap usa namespace de notícias, nome da publicação, idioma `pt` e data original. Uma atualização não recoloca uma reportagem antiga na janela de notícias. Ausência de notícias recentes produz um sitemap vazio válido; partição inexistente retorna 404. Feeds usam revalidação para não manter artificialmente a janela temporal por cache longo.

As regras seguem a [documentação do News Sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap) e de [dados estruturados de artigos](https://developers.google.com/search/docs/appearance/structured-data/article). Elegibilidade não garante indexação, Google Notícias ou Discover.

## Liberação restante

Antes da primeira publicação real, fornecer textos originais, fontes, autores e revisores autorizados; validar fatos, imagens e direitos; executar os gates editoriais aplicáveis; e preencher o registro com a revisão e aprovação correspondentes. Páginas institucionais não ganham nomes, credenciais ou contatos fictícios para satisfazer SEO.

Antes de liberação hospedada, verificar build/CI do commit selecionado, disponibilidade do ambiente, respostas SSR no domínio canônico, origem de staging, XML/RSS e validação dos dados estruturados. Configurar Search Console somente na propriedade legítima com acesso do proprietário e verificar a submissão dos sitemaps. Não houve alteração de DNS, cadastro externo, automação de tendências ou gasto nesta etapa.

Rollback de publicação: retirar do registro a revisão afetada ou sua aprovação e reconstruir o app, preservando a evidência externa. Rollback desta infraestrutura: reverter apenas o commit de SEO, incluindo a restauração do sitemap anterior e do arquivo estático de robots; não reverter trabalho paralelo de Loja, login ou integrações.
