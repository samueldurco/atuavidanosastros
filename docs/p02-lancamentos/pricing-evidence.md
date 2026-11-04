# P02 — evidências locais de preço, custo e integração financeira

Data da análise: 04/11/2026. RUN_ID: `ATV-20260902-170644Z-01A0630F`. Escopo: os onze digitais avulsos P02. Esta análise documental não consultou provedores, não leu valores de secrets, não alterou preços e não criou autorização comercial. As consultas hospedadas citadas são evidências registradas pela frente P01, com o horário original; não foram repetidas nesta análise.

## Resultado que os documentos sustentam

Não foi localizado preço comercial aprovado nem composição completa de custo para qualquer um dos onze lançamentos. A especificação P02 conserva `regularMinor`, geração, entrega, tarifa do provedor, reserva de suporte/reembolso e piso de contribuição como `null`; `budgetAuthorizedMinor: 0` é limite de autorização, não custo unitário observado ([launch-metadata.json, linhas 10–28](launch-metadata.json)).

A geração factual já tem caminhos locais verificáveis: cálculo com Caelus e efemérides incorporadas ou sorteio de Tarot determinístico. A edição E2 atual também compõe texto por corpus editorial local versionado, com `externalModelCalled: false` ([contrato de proveniência, linha 35; composição, linha 299](../../apps/web/src/lib/trials/launch-reading.ts:35)). Não há exigência de tokens, recibo de IA ou modelo externo para esta edição. Isso permite identificar trabalho computacional e ausência de chamada de IA paga nesses caminhos. Não permite atribuir custo marginal completo de R$0 à leitura hospedada, porque ainda faltam medição por execução, consumo de infraestrutura, entrega, operação, tributos e condições do PSP.

P01 não resolveu o preço nem liberou a janela compartilhada. O checkpoint canônico de **04/11/2026 10:36:36Z** mantém nove ofertas ATV+ sem preços definidos, custos/pisos pendentes, integração Hotmart por homologar e reserva exclusiva de publicação ainda aberta. O candidato local/CI não é publicação concluída ([checkpoint P01, linhas 3, 12–16, 22–29](C:/ATVNA/docs/20-produto/programa-comercial-atvna/P01-atv-mais/EXECUCAO_CHECKPOINT.json)). Os nove preços ATV+ são da assinatura; mesmo que venham a ser aprovados, não fixam automaticamente os onze preços P02.

## Fontes e o alcance de cada evidência

| Fonte local | Evidência utilizável | Limite da evidência |
| --- | --- | --- |
| [Programa comercial, linha 17](C:/ATVNA/docs/20-produto/programa-comercial-atvna/README.md:17) | Orçamento inicial zero; simular custos e margem; piso, tabela e estreia ainda não fixados; usar preço comercial vigente quando existir. | Não contém uma tabela aprovada dos novos digitais. |
| [Programa comercial, linhas 19 e 30–32](C:/ATVNA/docs/20-produto/programa-comercial-atvna/README.md:19) | Simulação digital 10%/20%/30%; melhor condição única; P01 determina preço final; servidor confirma checkout. | Percentuais não são uma condição comercial ativa por item. |
| [ADR 0002, linhas 8–12](../adr/0002-environments-and-cost.md:8) | Arquitetura Free/local/previews e diretriz de custo fixo/gasto automático R$0; nenhum upgrade automático. | Diretriz de gasto não equivale a fatura, franquia restante ou custo por venda. |
| [ADR 0003, linhas 10–16](../adr/0003-auth-commerce-and-ai.md:10) | Hotmart é autoridade financeira; concessão após reconciliação; IA não define preço nem calcula fatos. | Não fornece tarifa Hotmart vigente, preço de oferta ou prova de cobrança. |
| [Contrato de benchmark, linhas 17 e 23](../contracts/product-benchmark.md:17) | Latência, tokens e custo têm evidência própria; desconhecido é `null`; custo zero exige evidência explícita. | Um ensaio local ou aprovação de schema não prova gratuidade operacional. |
| [Auditoria P01, linha 31](C:/ATVNA/.worktrees/p01-atv-mais-20261104/docs/qa/P01_COMMERCIAL_READINESS_2026-11-04.md:31) | Snapshot registra limite automático zero e flags de IA/Hotmart desativadas. | Configuração não é medição financeira. Não contém autorização de uso pago. |
| [Auditoria P01, linha 58](C:/ATVNA/.worktrees/p01-atv-mais-20261104/docs/qa/P01_COMMERCIAL_READINESS_2026-11-04.md:58) | Consulta registrada às **09:47:31Z de 04/11**: zero `price_versions ACTIVE`; somente seis preços físicos `DRAFT`. | Snapshot temporal, não consulta atual. Não prova ausência de ofertas no catálogo Hotmart não autenticado; rascunhos físicos não são preços P02. |
| [QA de preço P01, linhas 91–95](C:/ATVNA/.worktrees/p01-atv-mais-20261104/docs/qa/P01_MEMBER_PRICING_2026-11-04.md:91) | Exemplos financeiros exercitam a fórmula e os bloqueios. | Os valores são explicitamente sintéticos: não reutilizar como preço, tarifa, custo ou piso aprovado. |

## Trabalho local identificável nos onze produtos

O adaptador importa `caelus/data-embedded` e instancia o motor com esses dados; a dependência é fixada em `0.24.1` ([adaptador, linhas 1–2 e 61–77](../../packages/astrology/src/index.ts:61); [package.json, linha 19](../../packages/astrology/package.json:19)). O cálculo P02 usa cache por requisição e não chama gateway de modelo no caminho revisto ([launch-calculation.ts, linhas 169–200](../../apps/web/src/lib/server/launch-calculation.ts:169)). O código registra proveniência/licença `caelus@0.24.1/MIT`; isso identifica a dependência, não mede hospedagem.

| Produto estável | Trabalho factual que pode ser contado no código | Custo em BRL apurado/aprovado |
| --- | --- | --- |
| `wedding-date-map` | Um mapa de evento por candidata informada; entrada de 2 ou 3 candidatas; geometria de aspectos por mapa. | Desconhecido; seleção eletiva e entrega ainda têm gates próprios. |
| `ex-tarot` | Sorteio sem reposição pelo método versionado, vinculado ao UUID reservado; não exige API de Tarot. | Desconhecido. |
| `love-restart-map` | Um natal e amostras de 30 dias UTC a cada seis horas; contatos geométricos com o natal. | Desconhecido. |
| `sexuality-map` | Um natal e extração dos fatores definidos no escopo versionado do produto. | Desconhecido. |
| `intimacy-map` | Um natal e extração dos fatores definidos no escopo versionado do produto. | Desconhecido. |
| `emotional-reactions-map` | Um natal e extração dos fatores definidos no escopo versionado do produto. | Desconhecido. |
| `financial-blocks-tarot` | Sorteio sem reposição pelo método versionado; não exige API de Tarot. | Desconhecido. |
| `hidden-talent-map` | Um natal e extração dos fatores definidos no escopo versionado do produto. | Desconhecido. |
| `ascendant-style` | Um natal e extração dos fatores definidos no escopo versionado do produto. | Desconhecido. |
| `conversation-timing` | Um natal e 28 mapas amostrados em sete dias UTC, com contatos geométricos com o natal. | Desconhecido; amostragem não constitui indicação horária aprovada. |
| `cohabitation-map` | Um natal e extração dos fatores definidos no escopo versionado do produto. | Desconhecido. |

Fontes dos ramos: [Tarot, linhas 179–198](../../apps/web/src/lib/server/launch-calculation.ts:179); [casamento, linhas 202–228](../../apps/web/src/lib/server/launch-calculation.ts:202); [recomeço/conversa, linhas 230–265](../../apps/web/src/lib/server/launch-calculation.ts:230); [natal, linhas 266–294](../../apps/web/src/lib/server/launch-calculation.ts:266); [sete dias/28 amostras, linhas 142–162](../../apps/web/src/lib/server/launch-calculation.ts:142); [amostrador de calendário, linhas 61–83](../../apps/worker/src/personal-calendar-samples.ts:61).

Essas quantidades são observações estáticas do algoritmo, não benchmarks de CPU, memória, latência, energia ou custo. O timeout de uma função é limite, não duração medida. Cache por requisição não prova economia financeira quantificada. Os custos de composição/revisão, banco e leitor não podem ser omitidos por o fato inicial ser determinístico. Não foi localizado recibo ou medição de custo por produto P02 nas fontes delimitadas desta análise.

## Custos que ainda precisam de evidência

| Componente | O que já se sabe | Lacuna finita para preencher o custo |
| --- | --- | --- |
| Geração factual | Motor incorporado/determinístico, sem chamada paga de IA no caminho revisto. | Medir latência/CPU e tamanho de saída de execuções reais por produto; registrar versão, lote, volume e ambiente. Não converter tempo em BRL sem base tarifária/contábil. |
| Composição e revisão | E2 usa corpus editorial local versionado e declara `externalModelCalled: false`; não exige serviço externo. | Aferir CPU/tempo e consumo de infraestrutura do fluxo efetivo. Tokens e tarifa de IA são inaplicáveis à edição atual; só medir se uma edição futura realmente chamar modelo, sem introduzir esse requisito agora. |
| Hospedagem | Diretriz Free/R$0, Cloudflare/Supabase com gates. | Consumo incremental e franquia restante, limites de CPU/requisição, banco, armazenamento e egress; fonte datada para alocação se necessária. Franquia não garante operação ilimitada. |
| Persistência/acesso | Preparações, fatos e leituras podem exigir várias operações e armazenamento. | Quantificar operações/tamanho/retenção por pedido e validar que a opção de entrega cabe na infraestrutura autorizada. |
| Entrega | P02 especifica entrega web; não assumir PDF/WhatsApp por serem previstos para ATV+. | Verificar jornada hospedada, custos efetivos de entrega e suporte; não adicionar canal pago implicitamente. |
| Suporte, reembolso e chargeback | A especificação reserva campo próprio, ainda `null`. | Definir política e evidência de alocação por venda; custo desconhecido não vira reserva zero. |
| Hotmart/PSP | Autoridade financeira definida; live fechado na documentação atual. | Contrato/tabela vigente aplicável à conta, moeda, meio, produto, parcelamento e eventual serviço adicional; tarifa fixa e variável reais, incidência em reembolso/chargeback e prazo de recebimento. Nenhuma taxa foi pesquisada ou presumida aqui. |
| Tributos | Campo explícito na regra compartilhada. | Regime e incidência aprovados pela operação; não assumir isenção/zero. |
| Piso de contribuição | Proprietário ainda não fixou. | Aprovação específica por item; é decisão de negócio, não um custo medido. |

## Fórmula reaproveitável, sem preço inventado

A regra P01 já tem os seis campos necessários: `productionCents`, `operationsCents`, `paymentFixedCents`, `paymentRateBps`, `taxRateBps` e `minimumContributionCents` ([tipo e validação, linhas 27–40 e 62–70](C:/ATVNA/.worktrees/p01-atv-mais-20261104/packages/domain/src/member-pricing.ts:27)). Dinheiro usa centavos inteiros não negativos; taxas usam pontos-base. A função arredonda meio centavo para cima com inteiros ([linhas 87–90](C:/ATVNA/.worktrees/p01-atv-mais-20261104/packages/domain/src/member-pricing.ts:87)).

Defina `R(x,b) = floor((x*b + 5000)/10000)`, para centavos `x` e pontos-base `b`. Para preço regular `P` e desconto interno `d` em pontos-base:

```text
Q = R(P, 10000 - d)
Custo(Q) = produção + operação + PSP_fixo + R(Q, PSP_bps) + R(Q, tributos_bps)
Contribuição(Q) = Q - Custo(Q)
Margem atende quando Contribuição(Q) >= piso_aprovado
```

Essa é a fórmula implementada, não um orçamento novo ([simulação, linhas 117–162](C:/ATVNA/.worktrees/p01-atv-mais-20261104/packages/domain/src/member-pricing.ts:117)). Um campo ausente, inválido ou taxa acima de 10.000 bps mantém contribuição `null` e `marginApproved: false`. Geração pode integrar produção, e hospedagem/entrega/suporte a operação, conforme política explícita de alocação; não contabilizar o mesmo gasto duas vezes. Os seis campos atuais não representam sozinhos estruturas mais complexas de PSP: só mapear após confirmar a tarifa real aplicável.

Para os digitais, `d = 1000/2000/3000` é somente a matriz interna Essencial/Ampliado/Premium. Promoção, cupom e membro concorrem como condições independentes; a melhor condição elegível é aplicada uma vez, sem empilhar percentuais. O preço regular positivo, o custo completo, o piso aprovado por item e a confirmação de suporte no checkout continuam necessários ([contrato P01, linhas 10–13](C:/ATVNA/.worktrees/p01-atv-mais-20261104/docs/contracts/atv-plus-commercial.md:10); [gates do algoritmo, linhas 209–222](C:/ATVNA/.worktrees/p01-atv-mais-20261104/packages/domain/src/member-pricing.ts:209)).

Uma proposta de preço só se torna revisável depois de preencher os componentes reais e avaliar a contribuição no regular, promoções/cupons permitidos e todos os níveis que se pretende cobrir. Com custos/tarifas/piso desconhecidos, a fórmula não permite deduzir um mínimo numérico aprovado.

## Hotmart: contrato aproveitável e o que falta para P02

P01 estabelece o checkout autenticado com intenção aleatória, snapshot de preço/moeda/produto/oferta/termos e confirmação por evento verificado. A página de retorno não prova compra. Uma intenção não concede duas transações; divergências de produto, oferta, valor ou moeda vão para quarentena. O limite local de 24 horas de reuse da intenção **não** comprova expiração remota da oferta e não autoriza rejeitar pagamento cobrado tardiamente ([contrato P01, linhas 23–25 e 45](C:/ATVNA/.worktrees/p01-atv-mais-20261104/docs/contracts/atv-plus-commercial.md:23)).

Esse desenho é referência de integração; os nove SKUs de assinatura P01 não são um mapeamento dos onze avulsos. Antes de compra P02, é necessário reconciliar cada ID estável/URL com produto e oferta reais, moeda, preço aprovado, termos e entrega; aplicar a decisão de preço do servidor ao valor efetivamente cobrado e conceder o direito de acesso correto somente após evento financeiro reconciliado. Não criar oferta duplicada para contornar ausência de inventário autenticado.

A auditoria P01 mantém bloqueios de acesso/catalogação Hotmart e homologação financeira e não informa tarifa vigente ([readiness, linhas 62–63](C:/ATVNA/.worktrees/p01-atv-mais-20261104/docs/qa/P01_COMMERCIAL_READINESS_2026-11-04.md:62)). A prova local da regra de membro não comprova cobrança ou desconto real no provedor ([QA, linhas 107 e 115–118](C:/ATVNA/.worktrees/p01-atv-mais-20261104/docs/qa/P01_MEMBER_PRICING_2026-11-04.md:107)). Manter compra e desconto bloqueados nos onze até cumprir esses critérios por item.

## Encaminhamento limitado e verificável

1. Conservar os onze preços/custos desconhecidos em `null`, com produto e URL estáveis; manter a interface em preparação onde faltar gate.
2. Anexar medição local por produto e evidência de infraestrutura/entrega, sem gasto novo. Uma medição sem base financeira continua útil como consumo, sem virar BRL fictício.
3. Reconciliar, quando houver acesso autorizado, ofertas/tarifas Hotmart existentes; preservar IDs e eventos. Não abrir cadastro duplicado nem teste pago nesta execução.
4. Submeter uma composição completa e piso por item; somente então propor preços numéricos e cobertura de membro para decisão concreta do proprietário.
5. Homologar preço final e direito de acesso com/sem membro, promoção/cupom, expiração, replay, reembolso e divergência financeira usando o fluxo compartilhado; testes sintéticos continuam identificados como locais.
6. Revalidar o checkpoint P01 e o lock antes de publicação. A reserva aberta às 10:36:36Z não é permissão para P02 publicar por conta própria.

Nenhum preço, custo unitário, margem, tarifa de PSP ou condição de membro foi aprovado por este levantamento.
