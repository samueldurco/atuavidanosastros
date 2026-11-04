# P02 — continuidade visual e QA local

Verificação em 04/11/2026 no worktree `C:/ATVNA/.worktrees/p02-lancamentos-20261104`, com aplicação real renderizada em `http://127.0.0.1:4178`. Resultado: continuidade visual preservada nas superfícies verificadas; onze composições próprias integradas à família existente; descoberta, fichas, destaque da home e preparação privada sem falhas de renderização nas matrizes abaixo. Esta evidência comprova implementação local e não equivale a publicação, homologação do cálculo ou aprovação de uma leitura.

## Fontes visuais verificadas

- Skill aplicada: `C:/Users/samue/.codex/skills/atvna-web-design/SKILL.md`, com referências `project-sources.md` e `web-design-criteria.md`.
- Direção vigente: `docs/DESIGN.md`, MVP aprovado de 14/10/2026 e revisão de 15/10/2026.
- Imagens aprovadas visualizadas antes da implementação: `C:/ATVNA/DESING SITE/REDESIGN_COMPLETO_2026-10-14/verificacao/fechamento/depois-produto-jornada-tarot-arte-1440.png` e `depois-produto-mapa-astral-390.png` no mesmo diretório.
- Aplicação existente comparada em execução: `/leituras`, incluindo catálogo, cards, papel, tipografia e gravuras. Captura original: `C:/ATVNA/tmp/p02-design-20261104/current-catalog-1440.png`.
- Prompt canônico consultado na árvore principal: `C:/ATVNA/docs/20-produto/programa-comercial-atvna/P02-lancamentos/PROMPT.md`.

## Decisões de implementação

`/lancamentos` reutiliza `MvpProductCard`, fontes Newsreader/Onest, tokens por universo, papel e microartes existentes. Há três produtos de estreia e oito próximos temas, todos identificados como **Em preparação**, com links para a proposta canônica em `/produtos/[slug]` e sem oferta de compra.

As artes foram compostas com gravuras e elementos aprovados do repositório, usando o mesmo sistema de SVG e classes de produto. O conjunto anterior de 28 entradas permaneceu semanticamente idêntico; foram adicionadas exatamente onze entradas, totalizando 39. Cada nova composição possui organização própria relacionada ao recorte da entrega.

| Produto | Composição e relação com a entrega |
| --- | --- |
| Mapa da Data de Casamento | Três fólios e mandalas para comparar opções de data |
| Tarot do Ex: Saudade e Arrependimento | Duas cartas e direção entre episódio e atitudes |
| Mapa do Recomeço Amoroso | Fases da Lua e três caminhos em um intervalo de 30 dias |
| Mapa da Sexualidade | Gravura floral, Vênus e Marte em duas linguagens do desejo |
| Mapa da Intimidade a Dois | Fólio aberto, desejo e convite em dois campos |
| Mapa das Reações Emocionais | Lua e sequência de gatilho, pausa e resposta |
| Tarot dos Bloqueios Financeiros | Três cartas em progressão de impasse, sinal e primeiro passo |
| Mapa do Talento Oculto | Bússola, Sol e fólio de oferta a experimentar |
| Meu Estilo pelo Ascendente | Horizonte e três composições para uma ocasião |
| A Hora da Conversa – Horóscopo Amoroso | Falar/esperar, Lua e período de sete dias |
| Mapa da Convivência a Dois | Planta abstrata de casa e três pontos de acordo |

## Matriz de renderização

| Superfície | Cobertura | Resultado |
| --- | --- | --- |
| Descoberta `/lancamentos` | 1440, 768, 390 e 320 px | 4/4 HTTP 200; onze cards/artes; sem overflow, erro JavaScript ou imagem quebrada |
| Fichas canônicas dos onze produtos | 1440 e 390 px | 22/22 HTTP 200; sem overflow, erro JavaScript ou imagem quebrada |
| Destaque da home | 1440 e 390 px | 2/2 HTTP 200; ordem correta e carrossel funcional |
| Recomeço após refinamento da copy | 1440 e 390 px | 2/2 HTTP 200; legenda duplicada removida; método público e exemplo ilustrativo legíveis |
| Preparação privada dos onze produtos | 1440 e 390 px | 22/22 HTTP 200; rótulos, IDs e consentimentos corretos |
| Recibo salvo sintético dos onze produtos | 1440 e 390 px | 22/22 HTTP 200; estado aguardando cálculo explícito |

Na matriz privada completa não houve controles sem rótulo, IDs duplicados, imagens quebradas, erros JavaScript ou overflow horizontal. O consentimento de armazenamento é obrigatório nos onze formulários; a confirmação de maioridade é obrigatória em Sexualidade e Intimidade a Dois. As telas privadas foram renderizadas pela fixture somente local `/testar-lancamentos/_spec?product=ID[&view=saved]`, com dados fictícios e sem conceder acesso real ou gravar preparações.

A inspeção visual incluiu os onze cards na descoberta, home nas duas larguras, fichas representativas dos diferentes universos e tipos de composição, Recomeço final em ambas as larguras, formulários de Casamento/Sexualidade/Ascendente e recibos. Hierarquia, materialidade, cor, recorte de gravura, fluxo de leitura e espaçamento foram comparados à referência aprovada. As capturas originais completas dos onze produtos estão em `C:/ATVNA/tmp/p02-design-20261104`.

## Navegação e teclado

- Descoberta: títulos e links dos onze produtos correspondem ao catálogo; âncora da estreia e abertura da primeira ficha funcionam; onze estados de preparação presentes e nenhuma oferta ativa.
- Home: `#produtos` precede `#atv-mais-home`, que precede `#lancamentos`, que precede `#universos`, em desktop e celular. Enter/Space avançam pelos três produtos; os extremos retornam corretamente. Controles medem 44 × 44 px e têm foco visível.
- Casamento, 1440/390 px: duas datas e horários preenchidos; cidades selecionadas por ArrowDown e Enter com `aria-activedescendant` válido; terceira opção adicionada por Enter e removida por Space; foco visível no campo da cidade. Os seletores preservam cidade, estado e país.
- Consentimento e maioridade: inicialmente inválidos quando desmarcados e acionáveis por Space. Nenhuma requisição de persistência foi disparada no QA de interação.
- Recibo, 1440/390 px: “Consultar evidência salva” abre por Enter; conteúdo continua dentro da largura disponível com foco visível. O texto distingue dados salvos de uma leitura aprovada.

## Evidências versionadas

Resultados detalhados em `evidencias-visuais/`: `visual-qa-results.json`, `controls-results.json`, `home-results.json`, `refreshed-ficha-results.json`, `private-results.json` e `private-controls-results.json`.

Capturas representativas:

- [Destaque na home, desktop](evidencias-visuais/home-launches-1440.png)
- [Destaque na home, celular](evidencias-visuais/home-launches-390.png)
- [Ficha do Recomeço final, celular](evidencias-visuais/love-restart-map-final-390.png)
- [Preparação de Sexualidade, celular](evidencias-visuais/private-sexuality-map-intake-390.png)
- [Duas cidades selecionadas, terceira opção e foco](evidencias-visuais/private-wedding-keyboard-390.png)
- [Recibo com evidência aberta e foco](evidencias-visuais/private-saved-expanded-390.png)

Scripts de captura e originais: `C:/ATVNA/tmp/p02-design-20261104/qa-launches.cjs`, `qa-controls.cjs`, `qa-home.cjs`, `qa-refreshed-ficha.cjs`, `qa-private.cjs` e `qa-private-controls.cjs`. As capturas iniciais de fichas precedem o refinamento da copy; para Recomeço, usar as capturas com sufixo `final`.

## Testes das APIs de preparação, cálculo e leitura

Os dois arquivos novos `apps/web/src/routes/api/launch-preparations/+server.spec.ts` e `apps/web/src/routes/api/launch-preparations/[id]/calculate/+server.spec.ts` passaram **40/40 testes**. A suíte usa helpers reais de identidade, origem/JSON, parser e leitura com isolamento por proprietário, com cliente de persistência simulado. Abrange autenticação/grant, origem ausente/estrangeira, validação e tamanho do payload, idempotência, concorrência com entrada igual/diferente, revogação, persistência obrigatória e respostas de erro em falha de banco. O cálculo é simulado nesta suíte; os testes do módulo de cálculo são uma verificação separada.

Comando: `pnpm --filter @atv/web exec vitest run 'src/routes/api/launch-preparations/+server.spec.ts' 'src/routes/api/launch-preparations/[id]/calculate/+server.spec.ts'`. Execução de 04/11/2026: dois arquivos e quarenta testes aprovados; o runner informou aviso de fechamento após o sucesso e terminou com código zero. Nenhum banco ou provedor externo foi acionado.

Após implementar o endpoint de leitura, foi adicionado `apps/web/src/routes/api/launch-preparations/[id]/reading/+server.spec.ts`: **31/31 testes aprovados**. A composição e avaliação são simuladas; `launchPreparation`, `savedLaunchReading`, identidade, origem e isolamento por proprietário são reais. Os testes comprovam rejeição 422 sem persistir quando a avaliação reprova, exigência de fatos previamente salvos, reabertura idempotente, confirmação da edição persistida após corrida, conflitos de produto/entrada/cálculo/leitura/política/avaliação, revogação antes e depois da escrita, falhas de banco e bloqueios de acesso. Não comprovam a qualidade editorial do compositor real.

Execução conjunta final das três APIs: **3 arquivos, 71 testes aprovados**, em 04/11/2026 às 07:44 BRT. Comando: `pnpm --filter @atv/web exec vitest run 'src/routes/api/launch-preparations/+server.spec.ts' 'src/routes/api/launch-preparations/[id]/calculate/+server.spec.ts' 'src/routes/api/launch-preparations/[id]/reading/+server.spec.ts'`.

Os produtos continuam em preparação. Publicação comercial, preços, custos, direitos de acesso, cálculo factual e aprovação editorial mantêm seus próprios gates; a aprovação visual local não os substitui.
