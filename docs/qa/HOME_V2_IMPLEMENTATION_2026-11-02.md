# HOME v2 — implementação e validação local

Data: 2026-11-02. Checkout: `C:/ATVNA/.worktrees/home-editorial-20261102`.
RUN_ID: `ATV-20260902-170644Z-01A0630F`.

Registro local da revisão visual da HOME, validada em 2026-11-02 e sem deploy. Este documento complementa a entrevista e o registro anterior; os resultados abaixo correspondem à versão integrada da v2.

## Cinco pontos atendidos

1. **Imagens próprias por seção:** 26 composições novas, incluindo nove ferramentas, três leituras, três miniaturas mais contidas para a Revista e uma ilustração de continuidade para ATV+. A seleção das artes das ferramentas depende do contexto HOME; `/ferramentas` e demais páginas mantêm suas referências existentes.
2. **Loja com cenas de coleções:** carrossel manual de quatro cenas — roupas, canecas, acessórios e decoração/papelaria — com peças reais do catálogo e links individuais. Controles nomeados, grupo de seletores identificado, contador anunciado e respeito a movimento reduzido. As cenas são identificadas como ilustrativas.
3. **Divisões entre seções:** fundos, faixas de cor e linhas de separação reforçam a passagem entre ferramentas, amostra, leituras avulsas, ATV+, universos, Revista e loja; a hierarquia numerada e os títulos em HTML permanecem legíveis.
4. **Vitrine de produtos digitais:** três composições distintas para Mapa Astral Completo, Tarot de três cartas e Interpretação do Sonho. A apresentação separa imagem, formato digital avulso, resumo, estado real e acesso à página do produto.
5. **Pigmentos e texturas nos universos:** seis paisagens próprias para Mapa Astral, Previsões, Amor, Carreira, Tarot e Sonhos, com paletas temáticas, textura de pigmento e desenho de gravura; os títulos continuam em HTML e levam aos destinos existentes.

## Pedidos finais integrados

- **Marca antes das ferramentas:** a primeira seção mantém a composição assimétrica e sua gravura, com logo e nome mais destacados e identificação do posicionamento da marca. O H1 aprovado — “Ferramentas e leituras para explorar o seu momento.” — e os CTAs permanecem. O reforço móvel usa os novos tamanhos em 320 e 390px, sem o override antigo que os reduzia.
- **Rodapé compacto:** apresentação da marca, links de navegação e atendimento, termos e políticas em grupos que se acomodam à largura disponível. As redes são apresentadas por ícones com nomes acessíveis, foco visível e links oficiais.

## Inventário das 26 artes

Arquivos em `apps/web/static/brand/home-v2/`. Conferência estática: **26 WebP, 26 SHA-256 distintos e 4.755.646 bytes**; nenhuma duplicata binária entre os arquivos atuais.

| Grupo       | Quantidade | Arquivos `.webp`                                                                                                                                                        |
| ----------- | ---------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ferramentas |          9 | `tool-ascendant`, `tool-birth-chart`, `tool-horoscope`, `tool-compatibility`, `tool-midheaven`, `tool-money`, `tool-daily-card`, `tool-love-card`, `tool-dream-journal` |
| Universos   |          6 | `universe-mapa-astral`, `universe-previsoes`, `universe-amor`, `universe-carreira`, `universe-tarot`, `universe-sonhos`                                                 |
| Leituras    |          3 | `product-natal-chart`, `product-three-card-tarot`, `product-dream-reading`                                                                                              |
| Revista     |          3 | `article-ascendant`, `article-mercury-retrograde`, `article-tarot-arcana`                                                                                               |
| ATV+        |          1 | `atv-continuity`                                                                                                                                                        |
| Loja        |          4 | `shop-wear`, `shop-mugs`, `shop-carry`, `shop-space`                                                                                                                    |

## Proveniência e integração

- `docs/qa/home-v2-art-provenance/editorial.json`: prompts, referências, originais, otimização e hashes das sete artes de leituras, Revista e ATV+.
- `docs/qa/home-v2-art-provenance/shop.json`: quatro cenas geradas com referências dos SKUs existentes e revisão das aplicações. São imagens ilustrativas de contexto, sem substituir especificações ou provas industriais das peças.
- `docs/qa/HOME_V2_TOOL_UNIVERSE_ARTS_2026-11-02.md`: quinze artes de ferramentas e universos; aponta o manifesto externo com prompts, originais e evidências próprias dessa frente.

Os mapas de artes da HOME ficam em `apps/web/src/lib/home-art.ts`; as ferramentas usam o contexto `home` em `FreeToolsCollection.svelte`. Os componentes `HomeReadings.svelte` e `ShopHomeShowcase.svelte` são integrados pela rota inicial. As novas imagens não substituem as capas globais dos produtos nem as imagens do catálogo da loja.

## Limites preservados

Estados reais, rotas e contratos de produto permanecem vigentes. Leituras e ATV+ em preparação continuam identificados como tal, sem promessa de compra liberada. Os links levam a páginas existentes; a elegibilidade comercial da loja continua sendo decidida pelos seus gates. Cálculos, motores, quotas e aprovação de interpretações não foram alterados pela revisão visual. A amostra de leitura conserva seu escopo de demonstração fictícia local e sua revisão própria.

## Validação final

- Build integrado após as correções responsivas: **exit 0**; quatro assets datados com SHA-256 verificado. Evidência: [build-responsive-final.log](C:/ATVNA/evidence/ATV-20260902-170644Z-01A0630F/home-v2-20261102/build-responsive-final.log).
- Svelte-check final: **0 erros e 0 avisos**. Evidência: [check-clean-final.log](C:/ATVNA/evidence/ATV-20260902-170644Z-01A0630F/home-v2-20261102/check-clean-final.log).
- ESLint dos componentes e testes afetados: **exit 0**. Evidência: [eslint-responsive-final.log](C:/ATVNA/evidence/ATV-20260902-170644Z-01A0630F/home-v2-20261102/eslint-responsive-final.log).
- E2E integrado com Chromium e fixture local: **20 aprovados, zero falhas (4,0 min)**. Inclui os nove testes de HOME e consentimento em 320/390/768/1440px, seis cenários funcionais das ferramentas e cinco testes de artes, carrossel e amostra. Evidência: [e2e-responsive-final.log](C:/ATVNA/evidence/ATV-20260902-170644Z-01A0630F/home-v2-20261102/e2e-responsive-final.log).
- Os testes verificaram as 26 imagens distintas carregadas, rotas reais dos produtos, informações do ATV+, navegação por teclado no carrossel, foco e expansão da amostra, nomes acessíveis dos ícones sociais e ausência de overflow da página. A avaliação axe da amostra/HOME passou em 320 e 1440px; a acessibilidade da ferramenta de Ascendente também foi exercitada.
- A revisão visual confirmou a marca na primeira seção em desktop e celular, rodapé compacto em 320/390/768px e as composições de produtos, Revista, ATV+ e loja. Capturas finais preservadas em `captures-final/` no pacote externo.
- A primeira rodada havia identificado três falhas de overflow em 320px. Foram corrigidas a largura intrínseca de `.universe-main` e uma regra global de padding das ferramentas que atingia a HOME ao abrir painéis. O diagnóstico confirmou overflow zero nos nove painéis em 320px e em 664/678px; os três casos falhos passaram antes da reexecução completa. Evidências: `overflow-diagnostic.log` e `overflow-focal-320.log`. Uma checagem intermediária detectou um arquivo diagnóstico removido durante sua execução; a checagem limpa final acima passou sem avisos.
- `git diff --check`: **exit 0**. Configurações temporárias de diagnóstico e teste removidas após a validação.
- Prévia local aberta na primeira seção em `http://127.0.0.1:4330/`. Pacote de evidências externo ao checkout: `C:/ATVNA/evidence/ATV-20260902-170644Z-01A0630F/home-v2-20261102`.

Nenhum deploy, publicação hospedada ou promoção automática de aprovação de conteúdo é registrado por este documento.

## Ajustes de continuidade — cabeçalho, abertura e assinatura ATV+

Pedidos posteriores do proprietário preservam o ícone original no cabeçalho e substituem a gravura de continuidade por uma apresentação do ATV+ como assinatura premium.

- **Cabeçalho original preservado:** `PublicHeader.svelte` permanece sem diferença em relação ao HEAD desta branch. A abertura conserva o nome da marca e o posicionamento em destaque, retirando apenas a segunda aplicação grande do símbolo.
- **Assinatura ATV+:** apresentação tipográfica em HTML/CSS, com ATV+ dourado, nome da marca, identificação de assinatura, moldura fina e textura sobre azul-noite. A gravura anterior não é mais exibida nessa seção. Os três planos e os estados comerciais reais permanecem; em telas de até 480px, nome e resumo de cada plano aparecem empilhados para evitar palavras partidas.
- **Inventário:** os 26 arquivos de arte e sua proveniência são preservados. A HOME utiliza agora 25 imagens próprias nas ferramentas, produtos, universos, Revista e loja; o bloco ATV+ usa tipografia, sem imagem raster de produto.
- **Prévia local:** servidor restabelecido em `http://127.0.0.1:4330/`, com logs externos `preview-4330-followup.stdout.log` e `preview-4330-followup.stderr.log`. Sem publicação hospedada.
- **E2E:** a rodada de nove cenários teve seis aprovações e três falhas de prontidão do JavaScript no servidor de desenvolvimento. Os traces confirmaram carregamento de módulos após o clique, sem erros de execução ou respostas HTTP de erro. Os testes passam a aguardar o menu habilitado antes de interagir. A reexecução dos três casos afetados e das duas larguras móveis alteradas passou: **5/5**, incluindo carrossel em 390/1440px e HOME em 320/390/1440px. Os outros quatro cenários distintos passaram na rodada anterior, incluindo HOME em 768px, 25 imagens distintas carregadas e avaliação axe em 320/1440px. Evidências: `e2e-signature-final.log` e `e2e-signature-recheck.log`.
- **Revisão visual:** cabeçalho e abertura conferidos; ATV+ conferido em desktop e celular, com nomes inteiros e assinatura completa. Capturas preservadas em `captures-signature-final/` no pacote externo.
- **Formato e lint:** Prettier e ESLint dos arquivos afetados passaram, ambos com exit 0. Evidências: `format-signature-final.log` e `eslint-signature-final.log`. `git diff --check` também passou.
- **Tipos e prévia:** Svelte-check passou com zero erros e zero avisos (`check-signature-final.log`). A HOME respondeu HTTP 200 com a assinatura atual presente no HTML.
- **Build final:** `pnpm build` passou com exit 0; quatro assets datados tiveram SHA-256 validado após o empacotamento. Evidência: `build-signature-final.log`. Permanecem os avisos de depreciação/configuração já existentes do SvelteKit.

Esta continuidade altera somente a apresentação local e a espera de prontidão dos testes. Preserva RUN_ID, gates, catálogo, cálculos e contratos.

## Autorização de publicação — 2026-11-02

O proprietário aprovou a versão final e solicitou expressamente: “aprovado publique”. A autorização cobre a publicação da HOME revisada, incluindo a assinatura tipográfica ATV+, o cabeçalho original e a demonstração identificada com dados fictícios. Não promove aprovações privadas, produtos, modelos ou flags comerciais. A integração preservará as atualizações de produção posteriores à base desta branch, com CI na revisão exata, preflight, identificação do deployment anterior e verificação do domínio canônico após a publicação.
