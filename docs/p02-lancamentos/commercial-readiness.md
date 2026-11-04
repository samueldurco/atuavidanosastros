# P02 — teste gratuito autorizado e comércio postergado

Data: 04/11/2026. RUN_ID `ATV-20260902-170644Z-01A0630F`. Referência integrada examinada: `1d1d041`, com main P01 `2c4e3c34ae10d1cf314e315cb598cc32b5ba323b`. Escopo atual: publicar os onze produtos com geração e reabertura **gratuitas, em modo de teste**, usando o acesso privado existente. A classificação futura continua digital avulso com entrega web. Comércio foi postergado por instrução do proprietário; não se exige preço, margem, oferta Hotmart ou checkout para publicar esse teste. Esta revisão documental não executou publicação ou alteração de provedor.

## Decisão do proprietário — 04/11/2026

> nao coloque preço nem gere cobrança por enquanto somente publique e deixe no ar funcionando de modo liberado e gratuito igual os outros, modo de teste

A autorização cobre publicação, geração e reabertura gratuitas, pelos mesmos grants dos outros testes privados. Preserva autenticação, RLS, vínculo de proprietário, fatos persistidos, revisão editorial e demais gates técnicos. Não cria acesso anônimo, assinatura obrigatória, preço zero cadastrado ou oferta financeira. O [escopo da aprovação](free-test-approval-scope.md) separa publicação de teste, E5 e comércio futuro.

A [matriz dos onze produtos](product-readiness-matrix.md) reúne títulos, URLs, entrada/leitor, versões, medições, amostras e responsáveis. O [schema hospedado](hosted-schema.md) foi aplicado individualmente pelo root na janela `P02.03.01`, com versões remotas `20261104112718`, `20261104112739` e `20261104112801`. O postflight de catálogo confirmou três tabelas com RLS/políticas/grants e zero preparações, leituras e feedbacks. **Front P02 ainda não publicado; E5 real pendente.** Aplicação de schema não equivale a teste autenticado de entrega ou liberação comercial. O [preflight anterior](hosted-preflight.md) conserva o estado histórico e a divergência de versões, sem contradizer a aplicação posterior.

## Evidência existente e alcance

| Evidência | O que comprova | Limite |
| --- | --- | --- |
| [Definições do domínio](../../packages/domain/src/launches.ts) e [dados das fichas](../../apps/web/src/lib/data/launch-products.ts) | Onze IDs/títulos/slugs estáveis; definições `PREPARING`, digitais avulsos, entrega web; fichas `/produtos/{slug}`. | Definição de produto não registra oferta, preço ACTIVE ou disponibilidade de compra. |
| [benchmark.json](samples/benchmark.json), lote `p02-local-2026-11-04T11:10:40.212Z` | Uma execução sequencial local por produto, cálculo/composição/revisão reais sobre entradas sintéticas; tempo de parede e tamanho dos JSONs; onze revisões `APPROVED_FOR_PRIVATE_TEST`. | Não mede distribuição estatística, latência hospedada, concorrência, CPU faturável ou custo em BRL. |
| [Onze snapshots integrais](product-readiness-matrix.md#amostras-integrais-e-medição-local) | Entrada fictícia, cálculo/digest, leitura integral/digest, revisão integral, proveniência e versões; resultados efetivos do pipeline local. | Arquivos de exemplo não são entrega persistida de proprietário, aceite E5 ou compra real. |
| [launch-metadata.json](launch-metadata.json), `sampleDelivery` | Exemplo curto para explicar a proposta na ficha. | Não substitui snapshot integral nem interpretação calculada. |
| [Contrato P01 mesclado](../contracts/atv-plus-commercial.md) | Regra compartilhada de direito financeiro, melhor condição única, custos/margem e checkout; P01 tem publicação própria registrada em `P01.04.05`. | Publicação P01 não libera preço, oferta, cobrança ou desconto dos onze avulsos P02. |

A edição medida calcula fatos localmente e compõe a entrega com corpus editorial local versionado: `externalModelCalled: false`; lote `paidCalls: 0`. **Nenhuma chamada paga realizada** não significa custo marginal de infraestrutura/operação igual a zero. Tokens, tarifa de modelo e recibo de IA não se aplicam a essa edição; só seriam componentes de outra edição que realmente chamasse modelo.

## Comércio futuro: preço de membro e lacuna P02

Esta seção documenta trabalho **postergado**. Seus requisitos se aplicam à futura cobrança; não bloqueiam publicação, geração ou reabertura gratuitas autorizadas acima. A ausência de assinatura ATV+ não substitui nem invalida o grant privado de teste existente.

A política é `atv-plus-commercial/1`. O direito financeiro está em `atv_plus_memberships`, separado do acesso gratuito de teste e da avaliação do proprietário. Assinaturas `ACTIVE` ou `CANCELLED` só conferem benefício no período pago `[starts_at, ends_at)`. O servidor resolve direito e valor com `memberPricingSnapshot` e `memberPriceForSnapshot`; nível ou preço enviados pelo cliente não têm autoridade ([contrato, linhas 9–13](../contracts/atv-plus-commercial.md); [serviço](../../apps/web/src/lib/server/member-pricing.ts)).

Para um item `digital-single`, assinatura válida é uma das condições. A liberação exige, para **o mesmo item**, `MemberPriceRelease` com `itemId`, `approvalId` não vazio, seis custos válidos, contribuição suficiente e `checkoutSupportsMemberPrice: true`. Campos: `productionCents`, `operationsCents`, `paymentFixedCents`, `paymentRateBps`, `taxRateBps`, `minimumContributionCents` ([tipos, validação e gates](../../packages/domain/src/member-pricing.ts)).

| Situação | Resultado da regra compartilhada |
| --- | --- |
| Item excluído, como assinatura ATV+ ou frete | `excluded-kind` |
| Sem assinatura elegível no período pago | `no-active-membership` |
| Sem release específico aprovado ou com custo ausente/inválido | `cost-review-required` |
| Custos completos, contribuição inferior ao piso aprovado | `below-approved-margin` |
| Margem suficiente, checkout sem suporte comprovado ao preço de membro | `checkout-integration-required` |
| Direito, release, custos, margem e checkout válidos | `eligible`; somente então o preço de membro entra como candidato |

O servidor escolhe o menor valor elegível entre regular, promoção, cupom e membro, **uma única vez, sem acumular descontos**. Em empate, a prioridade é regular, promoção, cupom, membro. Simulações digitais de 10%/20%/30% não autorizam anunciar benefício ativo. Direito e preço são revalidados ao iniciar checkout e confirmar pedido; snapshot antigo não estende assinatura expirada.

**Lacuna concreta P02:** `launch-metadata.json` mantém `regularMinor`, custos e piso em `null`; não há neste pacote oferta/preço/release comercial aprovado por lançamento. ID de produto não é ID de oferta Hotmart. O endpoint atual `/api/member-price` aceita `variantId` e `profileId`; sem variante retorna snapshot de assinatura, com variante usa `reviewedShopMemberPrice` da loja física. Ele não é adaptador de checkout dos avulsos P02 ([handler](../../apps/web/src/routes/api/member-price/+server.ts)). Enviar um ID P02 à API não habilita compra ou desconto.

Faltam por item referência de oferta real, preço regular aprovado/versionado, custos e piso com fonte/vigência, release específico e integração do valor decidido pelo servidor ao checkout/entitlement digital real. Os nove IDs de assinatura P01 pertencem ao ATV+ e não preenchem esses campos. Inventário remoto Hotmart não foi consultado nesta revisão: ausência de vínculo comprovado no pacote não prova inexistência de produto no provedor.

## Custos e fórmula implementada

O [levantamento de fontes](pricing-evidence.md) diferencia geração local, hospedagem, persistência, entrega, suporte/reembolso, PSP e tributos. O benchmark acrescenta tempo de parede e tamanho de payload observáveis; não fornece tarifa ou alocação monetária. Não transformar milissegundos em BRL sem base financeira correspondente.

A regra compartilhada usa centavos inteiros e pontos-base, arredondando meio centavo para cima uma vez por taxa. Para preço regular aprovado `P`, desconto `d` e `R(x,b) = floor((x*b + 5000)/10000)`:

```text
Q = R(P, 10000 - d)
Custo(Q) = produção + operação + PSP_fixo + R(Q, PSP_bps) + R(Q, tributos_bps)
Contribuição(Q) = Q - Custo(Q)
Aceite: Contribuição(Q) >= piso_aprovado
```

`d = 1000/2000/3000` representa as simulações digitais Essencial/Ampliado/Premium. Campo ausente/inválido conserva contribuição `null` e margem não aprovada; `null` nunca significa gratuito ou custo zero. Geração pode integrar produção; infraestrutura, entrega e suporte podem integrar operação conforme alocação documentada, sem dupla contagem. PSP exige contrato/tabela aplicável à conta/oferta; não foi presumida tarifa genérica, tributo zero ou reserva zero. Os seis campos não dispensam revisar a correspondência com eventual tarifa mais complexa.

O valor histórico de R$ 7,90 em `docs/contracts/architecture-offers-20261015.md:57–66` é proposta de outra leitura e não constitui preço dos onze. O programa conserva orçamento autorizado de novas despesas R$ 0; `docs/adr/0002-environments-and-cost.md` impede custos fixos/upgrades automáticos. Isso não prova capacidade infinita ou custo unitário conhecido.

## Comércio postergado: pendências e responsáveis

As quatro primeiras linhas são de preparação financeira futura, sem requisito de fechamento antes do teste gratuito. E5 e publicação têm seus próprios escopos nas linhas seguintes.

| Pendência | Responsável | Aceite verificável |
| --- | --- | --- |
| Consumo e custo unitário da edição efetiva | P02 runtime/operação + finanças P01 | Base de infraestrutura/consumo/alocação datada e custos de produção/operação por produto/versão. Aproveitar benchmark sem tratá-lo como cobrança de CPU. |
| PSP, tributos, suporte/reembolso | Operação financeira P01; validação do proprietário | Fonte aplicável/vigência e mapeamento sem dupla contagem aos campos compartilhados. |
| Preço regular, piso e cobertura de membro | Proprietário, sobre proposta P01/P02 | Composição completa; cenários regular/membro/promoção/cupom; decisão registrada por item/versão. Nenhum valor novo é aprovado aqui. |
| Oferta e checkout avulso | Integração comercial P01 + P02 runtime | IDs reais reconciliados; preço/moeda/termos corretos; melhor condição única aplicada/revalidada no servidor; direito individual entregue após evento financeiro verificado. |
| E5 privado e limites da entrega | Proprietário avalia; P02 registra | Percurso real autorizado por produto: entrada, fatos, leitura revisada persistida, reabertura e avaliação vinculada à versão/digest. Snapshot sintético e aprovação automática privada não são aceite do proprietário. |
| Publicação gratuita P02 e percurso hospedado | Root da integração/liberação | Autorizada em 04/11; schema já aplicado e catálogo conferido. Publicar a revisão correta, registrar gates/postflight e funcionamento autenticado sem preço ou cobrança. DDL aplicado não publica páginas nem fecha E5. |

Para uma futura venda, P01 exige oferta real, preço positivo revisado e flags explícitas; página de retorno não prova compra. Seu contrato de snapshot/conciliação é referência financeira postergada. Testes de checkout com visitante/membro, promoção concorrente, expiração, replay, reembolso e divergência financeira ficam para essa etapa futura. Não criar oferta, preço ou teste pago nesta liberação gratuita.

Nenhum preço, custo em BRL, margem, tarifa de PSP, E5 ou condição financeira dos onze produtos foi aprovado por esta revisão.
