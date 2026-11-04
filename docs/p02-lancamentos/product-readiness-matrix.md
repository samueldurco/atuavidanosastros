# P02 — matriz dos onze produtos e evidências de entrega

Data: 04/11/2026. RUN_ID `ATV-20260902-170644Z-01A0630F`. Referência local `1d1d041`, com P01 main `2c4e3c34ae10d1cf314e315cb598cc32b5ba323b` já mesclado. Registro documental, sem publicação ou mudança de catálogo/preço. Os três primeiros são a estreia priorizada; os oito seguintes têm implementação local e amostras próprias, sem serem chamados de publicados.

## Modo de teste gratuito — decisão de 04/11/2026

> nao coloque preço nem gere cobrança por enquanto somente publique e deixe no ar funcionando de modo liberado e gratuito igual os outros, modo de teste

**Aplicável aos onze produtos desta matriz:** publicação, geração e reabertura gratuitas autorizadas com os mesmos grants dos outros testes privados. Preço, custos/margem comerciais, oferta Hotmart, checkout e benefício financeiro de membro ficam postergados e **não bloqueiam a publicação do teste**. Autenticação, grant vigente, isolamento do proprietário, persistência, revisão e gates técnicos permanecem. Não há novo acesso anônimo. E5 segue separado da autorização de publicação. Responsável pela publicação: root; pelo registro da avaliação E5: P02/proprietário. [Escopo completo](free-test-approval-scope.md).

## Identidade e rotas estáveis

As URLs são caminhos da aplicação; **não afirmam que a revisão P02 já esteja publicada em produção**. Descoberta: `/lancamentos` e destaque da home. Índice privado: `/testar-lancamentos`.

| ID estável | Título | URL da ficha | Entrada privada |
| --- | --- | --- | --- |
| `wedding-date-map` | Mapa da Data de Casamento | `/produtos/mapa-da-data-de-casamento` | `/testar-lancamentos/wedding-date-map` |
| `ex-tarot` | Tarot do Ex: Saudade e Arrependimento | `/produtos/tarot-do-ex-saudade-e-arrependimento` | `/testar-lancamentos/ex-tarot` |
| `love-restart-map` | Mapa do Recomeço Amoroso | `/produtos/mapa-do-recomeco-amoroso` | `/testar-lancamentos/love-restart-map` |
| `sexuality-map` | Mapa da Sexualidade | `/produtos/mapa-da-sexualidade` | `/testar-lancamentos/sexuality-map` |
| `intimacy-map` | Mapa da Intimidade a Dois | `/produtos/mapa-da-intimidade-a-dois` | `/testar-lancamentos/intimacy-map` |
| `emotional-reactions-map` | Mapa das Reações Emocionais | `/produtos/mapa-das-reacoes-emocionais` | `/testar-lancamentos/emotional-reactions-map` |
| `financial-blocks-tarot` | Tarot dos Bloqueios Financeiros | `/produtos/tarot-dos-bloqueios-financeiros` | `/testar-lancamentos/financial-blocks-tarot` |
| `hidden-talent-map` | Mapa do Talento Oculto | `/produtos/mapa-do-talento-oculto` | `/testar-lancamentos/hidden-talent-map` |
| `ascendant-style` | Meu Estilo pelo Ascendente | `/produtos/meu-estilo-pelo-ascendente` | `/testar-lancamentos/ascendant-style` |
| `conversation-timing` | A Hora da Conversa — Horóscopo Amoroso | `/produtos/a-hora-da-conversa-horoscopo-amoroso` | `/testar-lancamentos/conversation-timing` |
| `cohabitation-map` | Mapa da Convivência a Dois | `/produtos/mapa-da-convivencia-a-dois` | `/testar-lancamentos/cohabitation-map` |

Para **cada um dos onze**, recibo, cálculo e leitura salva usam `/testar-lancamentos/preparacoes/{id}`, onde `{id}` é o UUID da preparação persistida, não o ID comercial do produto. A mesma rota apresenta as ações permitidas pelo estado; não há segundo endereço fictício de leitura a preencher. Entrada e leitor exigem identidade e acesso privado válido. A rota `/_spec` é de QA, não destino de compra. Fontes: [definições/slugs](../../packages/domain/src/launches.ts), [fichas](../../apps/web/src/lib/data/launch-products.ts), [entrada](../../apps/web/src/routes/testar-lancamentos/[productId]/+page.server.ts), [leitor](../../apps/web/src/routes/testar-lancamentos/preparacoes/[id]/+page.server.ts).

## Versão e estado local/hospedado

**D1**, comum aos onze snapshots: entrega web; cálculo `atv-launch-calculation/1`; leitura `atv-launch-reading/1`; revisão `atv-launch-reading-review/1`; política `atv-launch-private-editorial-policy/1`. Metadados `p02-spec-2026-11-04.1`. E2 atual usa corpus local versionado, `externalModelCalled: false`.

**L1**: definição `PREPARING`; ficha, entrada e leitor implementados localmente; snapshot integral de cálculo/composição/revisão executado sobre entrada fictícia, com `APPROVED_FOR_PRIVATE_TEST`. Não significa avaliação do proprietário ou liberação comercial. O resultado vale para a amostra/política registradas, sem aprovação fictícia de toda entrada possível.

**H1**: schema aplicado individualmente pelo root em **04/11/2026**, na janela `P02.03.01`, Supabase `irgnhvouvzyoqfmltrna`; versões remotas `20261104112718` (preparações), `20261104112739` (leituras), `20261104112801` (feedback). Postflight de catálogo: três tabelas com RLS/políticas/grants esperados; zero preparações, leituras e feedbacks. **Front P02 ainda não publicado; E5 real pendente.** Não houve percurso autenticado real comprovado por esse postflight. [Aplicação e limites](hosted-schema.md). O [preflight anterior às 11:13:49 UTC](hosted-preflight.md) é histórico; não repetir as migrations para igualar timestamps locais/remotos.

| Produto | Versão | Local | Hospedado confirmado | E5 por produto e responsável |
| --- | --- | --- | --- | --- |
| `wedding-date-map` | D1 | L1 | H1 | Pendente — proprietário avalia; P02 registra |
| `ex-tarot` | D1 | L1 | H1 | Pendente — proprietário avalia; P02 registra |
| `love-restart-map` | D1 | L1 | H1 | Pendente — proprietário avalia; P02 registra |
| `sexuality-map` | D1 | L1 | H1 | Pendente — proprietário avalia; P02 registra |
| `intimacy-map` | D1 | L1 | H1 | Pendente — proprietário avalia; P02 registra |
| `emotional-reactions-map` | D1 | L1 | H1 | Pendente — proprietário avalia; P02 registra |
| `financial-blocks-tarot` | D1 | L1 | H1 | Pendente — proprietário avalia; P02 registra |
| `hidden-talent-map` | D1 | L1 | H1 | Pendente — proprietário avalia; P02 registra |
| `ascendant-style` | D1 | L1 | H1 | Pendente — proprietário avalia; P02 registra |
| `conversation-timing` | D1 | L1 | H1 | Pendente — proprietário avalia; P02 registra |
| `cohabitation-map` | D1 | L1 | H1 | Pendente — proprietário avalia; P02 registra |

E5 exige percurso privado real autorizado com fatos/leitura revisada persistidos, reabertura e avaliação vinculada ao produto/versão/digest. `APPROVED_FOR_PRIVATE_TEST` é revisão automática de consistência privada; os snapshots não contêm aprovação do proprietário, compra ou precisão comercial comprovada. Publicação e ativação financeira são estados separados.

## Amostras integrais e medição local

Lote [benchmark.json](samples/benchmark.json): `p02-local-2026-11-04T11:10:40.212Z`, Node `v24.20.0`, Windows x64, Vitest. Uma passagem sequencial sem aquecimento nem distribuição de repetições. Tempo de parede inclui carga concorrente da estação; não mede CPU faturável, SLA hospedado ou custo monetário. Tamanhos são JSON compacto UTF-8, soma entrada+cálculo+leitura+revisão; não equivalem a linhas/índices/banco, tráfego ou retenção. Arredondamento abaixo é apresentação; JSON guarda os originais. `paidCalls: 0`, `productionPrediction: false`.

| Produto / snapshot integral | Cálculo ms | Composição ms | Revisão ms | Total ms | JSON total bytes | Seções |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| [wedding-date-map](samples/wedding-date-map.json) | 1475,15 | 28,66 | 267,66 | 1771,47 | 40046 | 3 |
| [ex-tarot](samples/ex-tarot.json) | 5,13 | 10,95 | 30,44 | 46,51 | 15041 | 4 |
| [love-restart-map](samples/love-restart-map.json) | 1671,52 | 123,69 | 227,99 | 2023,20 | 290623 | 8 |
| [sexuality-map](samples/sexuality-map.json) | 22,52 | 13,90 | 20,26 | 56,68 | 25489 | 6 |
| [intimacy-map](samples/intimacy-map.json) | 24,66 | 11,54 | 15,19 | 51,39 | 24440 | 5 |
| [emotional-reactions-map](samples/emotional-reactions-map.json) | 17,67 | 11,17 | 13,86 | 42,70 | 21062 | 4 |
| [financial-blocks-tarot](samples/financial-blocks-tarot.json) | 2,41 | 5,38 | 10,64 | 18,44 | 15581 | 4 |
| [hidden-talent-map](samples/hidden-talent-map.json) | 15,08 | 9,81 | 16,29 | 41,19 | 39110 | 10 |
| [ascendant-style](samples/ascendant-style.json) | 20,65 | 9,71 | 12,03 | 42,39 | 21344 | 5 |
| [conversation-timing](samples/conversation-timing.json) | 197,87 | 18,43 | 56,12 | 272,42 | 106227 | 8 |
| [cohabitation-map](samples/cohabitation-map.json) | 19,06 | 9,26 | 16,19 | 44,51 | 33602 | 9 |

Cada arquivo é `EXAMPLE_PRIVATE_REVIEW`, contendo `input`, `calculation`, `calculationDigest`, `reading`, `readingDigest`, `review`, ambiente e medição. Onze revisões `APPROVED_FOR_PRIVATE_TEST`, sem razão de rejeição nesse lote. São **entradas sintéticas com cálculo, composição e revisão locais reais**, exportadas como arquivos; não persistidas como entrega de pessoa real por essa coleta.

Os textos curtos `sampleDelivery` de [launch-metadata.json](launch-metadata.json) explicam a ficha e continuam ilustrativos. Não provam cálculo ou entrega completa; os snapshots acima são a evidência local integral. O [contrato editorial](editorial-delivery-contract.md) detalha a separação. Limites de método continuam nas leituras; a comparação de casamento usa perfil geométrico original delimitado, sem score de sucesso ou precisão científica/comercial aprovada ([proposta](wedding-method-proposal.md)).

## Comércio postergado: oferta, preço, custos e responsáveis

Toda esta tabela é de trabalho futuro para cobrança. Não é uma lista de pré-requisitos para o modo de teste gratuito autorizado. A gratuidade do teste não altera os campos financeiros `null` para zero nem cria oferta ativa.

**FIN** = operação financeira/comercial P01; **P02** = runtime/entrega/integração dos avulsos; **PROP** = proprietário para preço/piso e avaliação. Atribuição identifica quem fecha pendência, sem autorizar gasto/cobrança/publicação/criação de oferta. Root centraliza aplicação hospedada e liberação.

| Produto | Oferta comercial / responsável | Preço regular e versão / responsável | Custos monetários e piso / responsável | Membro e compra / responsável |
| --- | --- | --- | --- | --- |
| `wedding-date-map` | Sem vínculo comprovado — FIN+P02 | `null`, sem aprovação — FIN+PROP | `null`; wall medido — P02+FIN; piso PROP | Pendente — FIN+P02 |
| `ex-tarot` | Sem vínculo comprovado — FIN+P02 | `null`, sem aprovação — FIN+PROP | `null`; wall medido — P02+FIN; piso PROP | Pendente — FIN+P02 |
| `love-restart-map` | Sem vínculo comprovado — FIN+P02 | `null`, sem aprovação — FIN+PROP | `null`; wall medido — P02+FIN; piso PROP | Pendente — FIN+P02 |
| `sexuality-map` | Sem vínculo comprovado — FIN+P02 | `null`, sem aprovação — FIN+PROP | `null`; wall medido — P02+FIN; piso PROP | Pendente — FIN+P02 |
| `intimacy-map` | Sem vínculo comprovado — FIN+P02 | `null`, sem aprovação — FIN+PROP | `null`; wall medido — P02+FIN; piso PROP | Pendente — FIN+P02 |
| `emotional-reactions-map` | Sem vínculo comprovado — FIN+P02 | `null`, sem aprovação — FIN+PROP | `null`; wall medido — P02+FIN; piso PROP | Pendente — FIN+P02 |
| `financial-blocks-tarot` | Sem vínculo comprovado — FIN+P02 | `null`, sem aprovação — FIN+PROP | `null`; wall medido — P02+FIN; piso PROP | Pendente — FIN+P02 |
| `hidden-talent-map` | Sem vínculo comprovado — FIN+P02 | `null`, sem aprovação — FIN+PROP | `null`; wall medido — P02+FIN; piso PROP | Pendente — FIN+P02 |
| `ascendant-style` | Sem vínculo comprovado — FIN+P02 | `null`, sem aprovação — FIN+PROP | `null`; wall medido — P02+FIN; piso PROP | Pendente — FIN+P02 |
| `conversation-timing` | Sem vínculo comprovado — FIN+P02 | `null`, sem aprovação — FIN+PROP | `null`; wall medido — P02+FIN; piso PROP | Pendente — FIN+P02 |
| `cohabitation-map` | Sem vínculo comprovado — FIN+P02 | `null`, sem aprovação — FIN+PROP | `null`; wall medido — P02+FIN; piso PROP | Pendente — FIN+P02 |

Não há ID de oferta/preço a preencher honestamente com ID de produto, exemplo ou oferta ATV+. `PriceVersion` é contrato de dados, não registro financeiro ativo. Inventário remoto Hotmart não consultado: registra-se ausência de mapeamento comprovado neste pacote, sem afirmar inexistência no provedor.

Para fechar a última coluna **em uma futura venda**, P01 exige assinatura elegível, release do item com `approvalId`, seis custos válidos, contribuição suficiente e checkout capaz de aplicar/revalidar a decisão. Regular/promoção/cupom/membro concorrem pelo melhor valor único sem acúmulo. `/api/member-price` atualmente consulta variantes da loja física; não substitui adaptador dos onze avulsos. Essa integração financeira não é necessária ao acesso privado gratuito. Lacuna, fórmula e aceites futuros: [commercial-readiness.md](commercial-readiness.md#comércio-futuro-preço-de-membro-e-lacuna-p02). Fontes de custos: [pricing-evidence.md](pricing-evidence.md).

A decisão do proprietário autoriza a publicação gratuita; esta matriz não declara o deploy já concluído, produto vendido, E5 aprovado ou elegibilidade financeira. Medições/snapshots foram documentados sem nova chamada paga, teste de compra ou alteração de código.
