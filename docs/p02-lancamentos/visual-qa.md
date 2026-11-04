# P02 — continuidade visual e QA local

Verificação em 04/11/2026 no worktree `C:/ATVNA/.worktrees/p02-lancamentos-20261104`, com aplicação real renderizada em `http://127.0.0.1:4178`. Resultado: continuidade visual preservada nas superfícies verificadas; onze composições próprias integradas à família existente; descoberta, fichas, destaque da home, formulários e leitores sem falhas de renderização nas matrizes abaixo. A revisão final inclui os testes gratuitos autorizados, com autenticação e grants preservados. Esta evidência comprova implementação local; não comprova deploy hospedado, aceite humano E5 ou liberação comercial paga.

## Fontes visuais verificadas

- Skill aplicada: `C:/Users/samue/.codex/skills/atvna-web-design/SKILL.md`, com referências `project-sources.md` e `web-design-criteria.md`.
- Direção vigente: `docs/DESIGN.md`, MVP aprovado de 14/10/2026 e revisão de 15/10/2026.
- Imagens aprovadas visualizadas antes da implementação: `C:/ATVNA/DESING SITE/REDESIGN_COMPLETO_2026-10-14/verificacao/fechamento/depois-produto-jornada-tarot-arte-1440.png` e `depois-produto-mapa-astral-390.png` no mesmo diretório.
- Aplicação existente comparada em execução: `/leituras`, incluindo catálogo, cards, papel, tipografia e gravuras. Captura original: `C:/ATVNA/tmp/p02-design-20261104/current-catalog-1440.png`.
- Prompt canônico consultado na árvore principal: `C:/ATVNA/docs/20-produto/programa-comercial-atvna/P02-lancamentos/PROMPT.md`.

## Decisões de implementação

`/lancamentos` reutiliza `MvpProductCard`, fontes Newsreader/Onest, tokens por universo, papel e microartes existentes. Há três produtos em destaque e oito outros temas; os onze têm ficha canônica em `/produtos/[slug]`, selo **Teste gratuito disponível** e CTA para `/testar-lancamentos/{id}`. O catálogo público contém 30 ofertas, incluindo os onze novos testes. Não há preço, cobrança ou CTA de compra nos novos produtos. A preparação comercial continua em seu estado próprio; o teste gratuito usa os mesmos controles de conta e grants dos testes existentes.

As artes foram compostas com gravuras e elementos aprovados do repositório, usando o mesmo sistema de SVG e classes de produto. O conjunto anterior de 28 entradas permaneceu semanticamente idêntico; foram adicionadas exatamente onze entradas, totalizando 39. Cada nova composição possui organização própria relacionada ao recorte da entrega.

| Produto                                | Composição e relação com a entrega                           |
| -------------------------------------- | ------------------------------------------------------------ |
| Mapa da Data de Casamento              | Três fólios e mandalas para comparar opções de data          |
| Tarot do Ex: Saudade e Arrependimento  | Duas cartas e direção entre episódio e atitudes              |
| Mapa do Recomeço Amoroso               | Fases da Lua e três caminhos em um intervalo de 30 dias      |
| Mapa da Sexualidade                    | Gravura floral, Vênus e Marte em duas linguagens do desejo   |
| Mapa da Intimidade a Dois              | Fólio aberto, desejo e convite em dois campos                |
| Mapa das Reações Emocionais            | Lua e sequência de gatilho, pausa e resposta                 |
| Tarot dos Bloqueios Financeiros        | Três cartas em progressão de impasse, sinal e primeiro passo |
| Mapa do Talento Oculto                 | Bússola, Sol e fólio de oferta a experimentar                |
| Meu Estilo pelo Ascendente             | Horizonte e três composições para uma ocasião                |
| A Hora da Conversa – Horóscopo Amoroso | Falar/esperar, Lua e período de sete dias                    |
| Mapa da Convivência a Dois             | Planta abstrata de casa e três pontos de acordo              |

## Matriz inicial de renderização

Esta primeira passagem precede a implementação dos leitores completos e a revisão final dos CTAs gratuitos. As capturas e JSON iniciais preservam os estados da aplicação naquele momento; a matriz final abaixo registra o resultado atual.

| Superfície                               | Cobertura               | Resultado                                                                               |
| ---------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| Descoberta `/lancamentos`                | 1440, 768, 390 e 320 px | 4/4 HTTP 200; onze cards/artes; sem overflow, erro JavaScript ou imagem quebrada        |
| Fichas canônicas dos onze produtos       | 1440 e 390 px           | 22/22 HTTP 200; sem overflow, erro JavaScript ou imagem quebrada                        |
| Destaque da home                         | 1440 e 390 px           | 2/2 HTTP 200; ordem correta e carrossel funcional                                       |
| Recomeço após refinamento da copy        | 1440 e 390 px           | 2/2 HTTP 200; legenda duplicada removida; método público e exemplo ilustrativo legíveis |
| Preparação privada dos onze produtos     | 1440 e 390 px           | 22/22 HTTP 200; rótulos, IDs e consentimentos corretos                                  |
| Recibo salvo sintético dos onze produtos | 1440 e 390 px           | 22/22 HTTP 200; estado aguardando cálculo explícito                                     |

Na matriz privada completa não houve controles sem rótulo, IDs duplicados, imagens quebradas, erros JavaScript ou overflow horizontal. O consentimento de armazenamento é obrigatório nos onze formulários; a confirmação de maioridade é obrigatória em Sexualidade e Intimidade a Dois. As telas privadas foram renderizadas pela fixture somente local `/testar-lancamentos/_spec?product=ID[&view=saved]`, com dados fictícios e sem conceder acesso real ou gravar preparações.

A inspeção visual incluiu os onze cards na descoberta, home nas duas larguras, fichas representativas dos diferentes universos e tipos de composição, Recomeço final em ambas as larguras, formulários de Casamento/Sexualidade/Ascendente e recibos. Hierarquia, materialidade, cor, recorte de gravura, fluxo de leitura e espaçamento foram comparados à referência aprovada. As capturas originais completas dos onze produtos estão em `C:/ATVNA/tmp/p02-design-20261104`.

## Navegação e teclado

- Descoberta: títulos e links dos onze produtos correspondem ao catálogo; âncora da estreia e abertura da primeira ficha funcionam. Na revisão final, os onze cards apresentam teste gratuito e destino para o intake correto.
- Home: `#produtos` precede `#atv-mais-home`, que precede `#lancamentos`, que precede `#universos`, em desktop e celular. Enter/Space avançam pelos três produtos; os extremos retornam corretamente. Controles medem 44 × 44 px e têm foco visível.
- Casamento, 1440/390 px: duas datas e horários preenchidos; cidades selecionadas por ArrowDown e Enter com `aria-activedescendant` válido; terceira opção adicionada por Enter e removida por Space; foco visível no campo da cidade. Os seletores preservam cidade, estado e país.
- Consentimento e maioridade: inicialmente inválidos quando desmarcados e acionáveis por Space. Nenhuma requisição de persistência foi disparada no QA de interação.
- Recibo, 1440/390 px: “Consultar evidência salva” abre por Enter; conteúdo continua dentro da largura disponível com foco visível. O texto distingue dados salvos de uma leitura aprovada.

## Evidências versionadas

Resultados detalhados em `evidencias-visuais/`: `visual-qa-results.json`, `controls-results.json`, `home-results.json`, `refreshed-ficha-results.json`, `private-results.json` e `private-controls-results.json` documentam a passagem inicial. `reader-results-all-eleven.json`, `reader-results-conversation-timing.json`, `free-ui-results.json` e `feedback-ui-results.json` documentam a revisão final.

Capturas representativas:

- [Destaque na home, desktop](evidencias-visuais/home-launches-1440.png)
- [Destaque na home, celular](evidencias-visuais/home-launches-390.png)
- [Ficha do Recomeço final, celular](evidencias-visuais/love-restart-map-final-390.png)
- [Preparação de Sexualidade, celular](evidencias-visuais/private-sexuality-map-intake-390.png)
- [Duas cidades selecionadas, terceira opção e foco](evidencias-visuais/private-wedding-keyboard-390.png)
- [Recibo com evidência aberta e foco](evidencias-visuais/private-saved-expanded-390.png)

Scripts de captura e originais: `C:/ATVNA/tmp/p02-design-20261104/qa-launches.cjs`, `qa-controls.cjs`, `qa-home.cjs`, `qa-refreshed-ficha.cjs`, `qa-private.cjs` e `qa-private-controls.cjs`. As capturas iniciais de fichas precedem o refinamento da copy; para Recomeço, usar as capturas com sufixo `final`.

## Revisão final dos leitores e testes gratuitos

| Superfície                                 | Cobertura                                      | Resultado                                                                                                                      |
| ------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Leitores completos dos onze produtos       | 1440 e 390 px                                  | 22/22 HTTP 200, avaliação `APPROVED_FOR_PRIVATE_TEST`, texto integral correspondente às amostras e nenhum erro de renderização |
| A Hora da Conversa após datas em português | 1440 e 390 px                                  | 2/2 novamente aprovados; títulos em DD/MM/AAAA e instantes com UTC explícito                                                   |
| Fichas públicas e formulários gratuitos    | Onze produtos × duas superfícies × 1440/390 px | 44/44 HTTP 200, CTAs corretos, rótulos e consentimento presentes, sem erro JavaScript, imagem quebrada ou overflow             |
| Descoberta e destaque da home              | 1440 e 390 px                                  | Onze destinos gratuitos na descoberta; os três destinos do destaque avançam por Enter e retornam ao início                     |
| ATV+ sintético                             | 1440 px                                        | 30 destinos de produto: 19 em `/testar-produtos/{id}` e 11 em `/testar-lancamentos/{id}`                                       |
| Intake real sem autenticação               | Casamento e Convivência                        | 303 para `/entrar?next=...`; nenhum acesso anônimo concedido                                                                   |

Os leitores foram renderizados em `/testar-lancamentos/_spec?product=ID&view=reader`, restrito a desenvolvimento e localhost. O loader executa parser, cálculo, composição e avaliação reais com `launchExampleInputs` sintéticos. A comparação textual confere título, resumo, títulos e parágrafos de todas as seções, ação prática, reflexão e limites contra `docs/p02-lancamentos/samples/{id}.json`, normalizando somente espaços. O rerender focal da Conversa substitui o texto anterior desse produto na revisão final. A fixture não persiste dados, concede grants, chama provedores externos ou envia avaliações do proprietário.

As 22 telas foram inspecionadas visualmente em desktop e celular: papel, tipografia, hierarquia, espaçamento e legibilidade acompanham o MVP aprovado. Não houve IDs duplicados, imagens quebradas, erros JavaScript ou overflow horizontal. Todas as âncoras do índice apontam para seções existentes. O link **Um próximo passo** recebeu foco visível e foi acionado por Enter em todas as telas, alterando o hash e trazendo o destino à área visível. A primeira observação de rolagem durante carregamento não se repetiu após aguardar fontes e hidratação; as medições finais constam nos JSON. Em Casamento 390 px, o destino foi observado durante a rolagem suave, ainda visível na viewport.

A home foi repetida com espera explícita de hidratação e confirmação do destino após cada Enter; os três produtos e o retorno ao primeiro funcionam nas duas larguras. Os novos formulários dizem **Salvar e continuar**; a ficha oferece **Testar gratuitamente** e **Abrir teste gratuito**, sem indicar indisponibilidade do cálculo que já funciona. O texto orienta entrar na conta para conferir acesso. Nenhum POST real foi feito no QA de interface.

Capturas finais representativas:

- [Descoberta gratuita, desktop](evidencias-visuais/free-launches-1440.png)
- [Destaque gratuito e foco, celular](evidencias-visuais/free-home-390.png)
- [Casamento com datas locais em português](evidencias-visuais/reader-body-wedding-date-map-1440.png)
- [Talento com entrada sintética própria](evidencias-visuais/reader-body-hidden-talent-map-1440.png)
- [Conversa com datas em português e UTC explícito](evidencias-visuais/reader-body-conversation-timing-1440.png)
- [Próximo passo da Conversa, celular](evidencias-visuais/reader-action-conversation-timing-390.png)
- [Avaliação do proprietário: erro acessível, celular](evidencias-visuais/feedback-error-390.png)
- [Avaliação do proprietário: sucesso e histórico, desktop](evidencias-visuais/feedback-success-1440.png)

Scripts finais e originais: `C:/ATVNA/tmp/p02-design-20261104/qa-readers.cjs`, `qa-free-ui.cjs` e `qa-free-home-club.cjs`. Os browsers foram encerrados ao concluir esta revisão, antes do build integrado.

## Testes das APIs de preparação, cálculo e leitura

Os dois arquivos novos `apps/web/src/routes/api/launch-preparations/+server.spec.ts` e `apps/web/src/routes/api/launch-preparations/[id]/calculate/+server.spec.ts` passaram **40/40 testes**. A suíte usa helpers reais de identidade, origem/JSON, parser e leitura com isolamento por proprietário, com cliente de persistência simulado. Abrange autenticação/grant, origem ausente/estrangeira, validação e tamanho do payload, idempotência, concorrência com entrada igual/diferente, revogação, persistência obrigatória e respostas de erro em falha de banco. O cálculo é simulado nesta suíte; os testes do módulo de cálculo são uma verificação separada.

Comando: `pnpm --filter @atv/web exec vitest run 'src/routes/api/launch-preparations/+server.spec.ts' 'src/routes/api/launch-preparations/[id]/calculate/+server.spec.ts'`. Execução de 04/11/2026: dois arquivos e quarenta testes aprovados; o runner informou aviso de fechamento após o sucesso e terminou com código zero. Nenhum banco ou provedor externo foi acionado.

Após implementar o endpoint de leitura, foi adicionado `apps/web/src/routes/api/launch-preparations/[id]/reading/+server.spec.ts`: **31/31 testes aprovados**. A composição e avaliação são simuladas; `launchPreparation`, `savedLaunchReading`, identidade, origem e isolamento por proprietário são reais. Os testes comprovam rejeição 422 sem persistir quando a avaliação reprova, exigência de fatos previamente salvos, reabertura idempotente, confirmação da edição persistida após corrida, conflitos de produto/entrada/cálculo/leitura/política/avaliação, revogação antes e depois da escrita, falhas de banco e bloqueios de acesso. Não comprovam a qualidade editorial do compositor real.

Execução conjunta final das três APIs: **3 arquivos, 71 testes aprovados**, em 04/11/2026 às 07:44 BRT. Comando: `pnpm --filter @atv/web exec vitest run 'src/routes/api/launch-preparations/+server.spec.ts' 'src/routes/api/launch-preparations/[id]/calculate/+server.spec.ts' 'src/routes/api/launch-preparations/[id]/reading/+server.spec.ts'`.

## Negação de objetivos e integração real da entrega

O arquivo `apps/web/src/lib/trials/launch-reading-context.spec.ts` acrescenta nove verificações independentes para Ex e Recomeço. Objetivos negados, hipóteses incertas e relatos históricos não devem se transformar em recomendações de reconciliação ou busca de novo relacionamento. Desejos afirmados têm prioridade; pressão e falta de respeito relatadas continuam respeitadas. Esses nove testes e os treze testes existentes da composição passaram juntos: **22/22**, às 07:53 BRT. O cálculo, a composição e a avaliação são reais nessa suíte.

O arquivo `apps/web/src/lib/server/launch-delivery.integration.spec.ts` comprova a ligação entre conteúdo e persistência: **2/2 testes**, Ex e Recomeço, às 07:55 BRT. Usa PGlite e as migrations reais de trials, preparações e leituras; executa parser, preparação, cálculo, composição e avaliação reais com entradas sintéticas. Depois de inserir fatos, leitura, revisão e digests, reabre pelo proprietário, desserializa, recalcula a avaliação e confere os mesmos vínculos. Confirma também idempotência, isolamento contra outro proprietário/anônimo, bloqueio de UPDATE inclusive por service/superuser e ausência de leitura/escrita após revogação. Não usa dados pessoais, provedor externo ou aprovação humana.

## Avaliação do proprietário

O endpoint `apps/web/src/routes/api/launch-preparations/[id]/feedback/+server.ts` passou **31/31 testes**, às 08:06 BRT. A suíte mantém reais identidade, origem/JSON, validação e os helpers de preparação/leitura; o SDK de persistência é simulado. Verifica autenticação, grant, proprietário, origem, tamanho, decisão/comentário, revisão vigente e digest, idempotência e conflito nos seis campos persistidos, corrida de inserção, falhas de banco e revogação antes/depois de escrever. A inserção usa a identidade autenticada, com proprietário e digest derivados no servidor; campos forjados do payload são ignorados. Não comprova sozinha as políticas SQL, verificadas em suíte própria.

O componente real `LaunchReadingFeedback.svelte` foi montado isoladamente no browser em **1440 e 390 px**, com histórico sintético e respostas HTTP integralmente interceptadas. A fixture de leitura permaneceu sem formulário de envio. Nenhuma requisição de avaliação chegou ao servidor/banco. O teste confirmou:

- Rejeição exige comentário e bloqueia envio vazio; aprovação aceita comentário opcional.
- Radios acionáveis por Space e envio por Enter, foco de 3 px, opções de 44 px e botão de aproximadamente 54 px.
- Estado de envio desabilita os controles; falha 503 aparece em alerta e preserva conteúdo e chave para repetição.
- Repetição do mesmo envio usa a mesma chave; novo envio após sucesso usa outra.
- Sucesso acessível, histórico legível, fallback de histórico indisponível, nenhum digest técnico visível, erro JavaScript ou overflow horizontal.

Essa avaliação registra a decisão do proprietário sobre uma edição privada. Não aprova automaticamente comércio, publicação ou E5.

Os onze testes gratuitos estão implementados localmente com os controles de acesso existentes. O estado de preparação comercial permanece separado de sua disponibilidade para teste. A aprovação visual não substitui deploy, aceite pessoal E5, avaliação editorial, homologação factual ou gates de uma eventual oferta paga.
