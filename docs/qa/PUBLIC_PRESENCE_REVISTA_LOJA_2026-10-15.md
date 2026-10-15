# Revista, presença pública, contato e Loja — revisão de interface

Data: 2026-10-15. Checkout: `arquitetura-integral-20261015`.

Decisão da revisão: **INTERFACE_REVIEW_PASS** para a copy e as superfícies descritas abaixo. Esta decisão não substitui a aprovação assinada dos artigos, os gates dos produtos privados nem a validação e liberação hospedada da execução principal.

## Escopo e resultado

- Revista com navegação pelos seis universos, busca sem distinção de acentos/maiúsculas, filtros por formato real, ordenação, contagem e estado sem resultados. Os 12 documentos publicados admitidos continuam vindo do registro editorial validado. Nenhum artigo, aprovação ou evidência assinada foi reescrito.
- Artigo com índice, autoria institucional, datas reais, referências, artigos relacionados e próximo passo contextual: ferramenta gratuita e universo correspondente. A leitura permanece pública e o contato para correções é direto.
- Presença da marca em nove redes verificadas, disponível no rodapé, no componente de presença e na página de canais oficiais. WhatsApp e Telegram aparecem apenas como canais em preparação, sem número, bot ou serviço público inventado.
- Fale conosco com assunto selecionável e link `mailto:` para o endereço comprovado. A página informa que a mensagem é enviada pelo aplicativo de e-mail; não simula formulário, atendimento ou automação.
- Loja dos Signos com duas artes reais do piloto P04, descritas como prévias de pôsteres de uma coleção em preparação. Sem estoque, qualidade física, preço, prazo, fornecedor, checkout ou disponibilidade comercial alegados.
- A vitrine funciona na home com título h2 e na Loja com título h1. Os títulos das peças acompanham a hierarquia. As descrições alternativas foram conferidas nas imagens.

## Fontes verificáveis

Redes: `C:/ATVNA/docs/30-execucao/REDES_SOCIAIS_INVENTARIO.json`, atualização de 12/10/2026. Threads adicionalmente confirmado pelo post publicado registrado em `C:/ATVNA/app/test-results/social-live-tests-2026-10-09/meta/threads-published-verification.json`.

| Rede | Destino público |
| --- | --- |
| Instagram | https://www.instagram.com/atuavidanosastros/ |
| Facebook | https://www.facebook.com/profile.php?id=61594840114291 |
| YouTube | https://www.youtube.com/@atuavidanosastros |
| Threads | https://www.threads.com/@atuavidanosastros |
| X | https://x.com/atvnastros |
| TikTok | https://www.tiktok.com/@atuavidanosastros |
| Pinterest | https://br.pinterest.com/atuavidanosastros/ |
| LinkedIn | https://www.linkedin.com/in/atuavidanosastros/ |
| Reddit | https://www.reddit.com/user/Logical_Try7048/ |

O inventário comprova os perfis; não se afirma frequência de postagem nem operação de APIs. LinkedIn usa o perfil existente, sem criar uma página empresarial fictícia. Bluesky foi excluído pelo proprietário. O bot Telegram privado não foi exposto.

E-mail `atuavidanosastros2026@gmail.com`: `C:/ATVNA/docs/30-execucao/DIAGNOSTICO_ACESSO_META_2026-09-29.md` e `PREPARACAO_REDES_SOCIAIS_2026-09-28.md`.

Artes: `C:/ATVNA/docs/20-produto/loja-signos-v1-seis-projetos/execucao/P04-ciclo-zodiacal-lunar/piloto-digital`. Aceite do proprietário registrado em `ACEITE_ARTES_E_PAINEL.json` em 07/10/2026; ambos os itens aprovados. A mostra digital atual foi autorizada nesta conversa; não implica liberação de comércio. Qualidade física permanece não testada.

| Arte | Origem | SHA-256 da cópia pública |
| --- | --- | --- |
| Percurso dos doze | `previews/P04-CICLO-A001-prova.png` | `5094a1b3832d195a78e0b9798dd5d8182a3762504c69947278321808fdb10635` |
| Ciclo lunar | `previews/P04-CICLO-A003-prova.png` | `e8747439fe9d8c8ef15b1e88b4377a1b7748d161e531af78c422a881e7b26c47` |

Proveniência distribuída com as artes em `apps/web/static/brand/shop/p04/provenance.json`. Nenhum mockup de produto físico foi usado como prova de amostra.

## Copy, autoria e revisão

Aplicados `atvna-web-design/SKILL.md`, `docs/DESIGN.md`, `docs/editorial/GUIA_LINGUAGEM_ATVNA.md` e os critérios pertinentes de `atvna-editorial-approval/SKILL.md`. Esta última skill foi usada para revisão de claims, identidade, fontes e limites; o contrato de aprovação de documentos editoriais não foi aplicado artificialmente à copy de interface.

A instrução expressa do usuário de retirar referências públicas à geração por IA prevalece sobre o padrão anterior de divulgação. Foi removida a divulgação renderizada, preservando os dados internos. O helper `publicEditorialAuthor` apresenta apenas o autor institucional conhecido como `ATVNA`, de tipo `Organization`, com perfil canônico `/pessoas/atvna`. O perfil anterior redireciona com 308. Não foi inventada pessoa, experiência pessoal, equipe humana, especialidade ou revisão humana independente. Artigo, perfil, hub, JSON-LD e sitemap usam a mesma identidade pública; o autor e a assinatura na fonte permanecem intactos.

Revisão finita da copy final:

| Critério | Resultado | Evidência |
| --- | --- | --- |
| Informação verificável | PASS | Perfis, e-mail e artes correspondem às fontes acima. |
| Oferta e disponibilidade claras | PASS | Coleção em preparação; canais futuros sem serviço falso; contato por e-mail identificado. |
| Identidade e direitos | PASS | Autoria institucional; fontes/licenças preservadas; artes P04 com aprovação e hashes. |
| Utilidade e ação clara | PASS | Filtros, estado vazio, índice, ferramenta por tema e assunto de contato testados. |
| Linguagem simples e específica | PASS | Sem escassez falsa, promessas de resultado, superlativos vazios ou jargão de implementação na nova copy. |
| Integridade editorial | PASS | Fontes, datas, corpo e evidências assinadas dos artigos não alterados. |
| Não atribuição enganosa | PASS | Não se declara autoria humana ou revisão humana. |

Pesquisa de ferramentas, solicitada pelo usuário: foram verificados os projetos primários [no-ai-slop](https://github.com/petergyang/no-ai-slop/blob/main/skills/no-ai-slop/SKILL.md), [better-writing](https://github.com/forjd/better-writing/blob/main/SKILL.md) e [Humanizer](https://github.com/blader/humanizer). O guia local já adapta essas abordagens ao português, às restrições e aos produtos ATVNA. Mantivemos o scanner integrado e a revisão contextual, sem instalar outro detector ou enviar conteúdo a serviços externos. Essas regras são auxiliares de estilo, não provas de autoria humana ou artificial.

## Verificações e evidências

Diretório local de evidências: `apps/web/test-results/arquitetura-publica-20261015/` (ignorado no Git, sem dados privados).

- `report.json` e `verify.mjs`: Revista, artigo Ascendente, canais e contato em 1440 px e 390 px. Todas HTTP 200, nenhum erro JavaScript, nenhuma imagem quebrada, sem overflow horizontal e zero violações Axe WCAG 2 A/AA e 2.1 AA. Filtros, busca com maiúsculas, busca de sonhos, estado vazio e `mailto:` atualizado por assunto conferidos.
- `shop-report.json` e `verify-shop.mjs`: Loja em 1440 px e 390 px, zero violações Axe, erros JavaScript ou overflow. Ambas as artes carregam em 1701 × 2268 px. Contato abre o assunto Loja.
- `author-report.json` e `verify-author.mjs`: artigo, perfil institucional e alias anterior, identidade Organization no JSON-LD, autor ATVNA, ausência do rótulo antigo renderizado, zero violações Axe ou overflow.
- `copy-report.json` e `audit-public-copy.mjs`: 46 URLs públicas obtidas dos sitemaps, com método, termos, privacidade e perfil. Todas HTTP 200. Nenhuma referência renderizada a geração por IA/produção automatizada nos textos e descrições alternativas. Leitores privados em reconstrução não pertencem a esta varredura.
- `node scripts/check-customer-language.mjs`: 345 arquivos de código públicos examinados; zero achados no ponto da revisão. O scanner não altera textos automaticamente.
- Screenshots de Revista, artigo, canais e contato nas duas larguras; imagens de viewport mobile; Loja completa em desktop e celular. Inspeção confirmou Newsreader/Onest, papel e paleta aprovados, leitura confortável e navegação clara. Textos alternativos dos pôsteres corrigidos após conferência visual.
- `svelte-check`: nenhum diagnóstico nos arquivos desta entrega. A execução conjunta encontrou dois diagnósticos em arquivos de frentes simultâneas (`thirty-day.ts` e `free-tools-calculation.spec.ts`), encaminhados à execução principal para correção.
- `editorial.spec.ts`: 36 de 37 testes passaram; a única divergência foi a contagem antiga do sitemap (25 versus 26 naquele instante da integração). A atualização da contagem e das novas rotas pertence à execução principal. Nenhum teste de assinatura/admissão editorial falhou.

A validação final conjunta e a liberação no domínio principal continuam sob responsabilidade da execução principal. O teste de tipos e os testes afetados devem ser fechados sobre a árvore integrada antes da publicação.

## Revalidação dos artigos na árvore integrada

Em 15/10/2026, `editorial-candidates.e2e.ts` passou os três casos em Chromium contra a compilação integrada servida em `127.0.0.1:4182`: 12 artigos assinados em cada largura de 1440, 390 e 320 px, totalizando 36 renderizações. Cada artigo apresentou um título principal, fontes e referências, link visível “Conheça nosso método” com destino `/metodo`, ausência de overflow horizontal e zero violações Axe WCAG 2 A/AA e 2.1 AA. Foram salvas capturas completas de todas as renderizações.

O teste anterior ainda procurava a copy antiga “Método e limites”. Foi atualizada somente essa expectativa, acrescentando a verificação do destino. Nenhum conteúdo assinado, componente público ou regra de admissão editorial foi alterado nesta correção.

Evidências locais: `test-results/architecture-editorial-e2e.txt` (3/3; 2,5 minutos) e `apps/web/test-results/architecture-editorial-e2e/` (capturas e relatórios). A inspeção usa os corpos assinados renderizados pelo componente SSR real e os estilos da compilação corrente. Trata-se de validação local da superfície de leitura; não constitui publicação nem liberação hospedada dos artigos.

## Correção focal do CI de SEO

O job de acessibilidade `116553542900`, execução `38773045695` do PR #35, falhou em duas expectativas de `seo.e2e.ts`: oito ferramentas em vez das nove atuais e 26 URLs no sitemap em vez de 30. Os outros 15 casos daquela etapa passaram. O log foi obtido pela API oficial GitHub e salvo em `test-results/ci-pr35-accessibility-job116553542900.log`.

A comparação com a arquitetura aprovada confirmou a origem da diferença: substituição da Bússola pela calculadora do Meio do Céu e do Tarot Sim ou Não pela Carta do Amor; inclusão de Dinheiro no Seu Mapa Astral e das páginas ATV+, Canais oficiais e Fale conosco. O teste agora compara o inventário exato das nove ferramentas e das 29 páginas base, mais Notícias quando houver conteúdo admitido, em vez de depender somente de contagens. Também verifica os redirecionamentos 308 dos dois endereços antigos. Foram mantidas as verificações de metadados únicos em SSR e no navegador, canonical, descrição, exclusão de conteúdo não publicado e rotas privadas.

Os dois casos afetados passaram em Chromium usando a compilação integrada em `127.0.0.1:4182`, sem rebuild ou alteração do runtime: **2/2 em 9,3 segundos**. Evidência: `test-results/architecture-seo-e2e.txt`. Prettier e ESLint do arquivo passaram. Esta prova local não substitui a nova execução completa do CI no commit corrigido.
