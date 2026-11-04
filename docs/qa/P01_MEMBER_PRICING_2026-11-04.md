# P01 — regra única de preço de membro

- Data: 2026-11-04.
- RUN_ID preservado: `ATV-20260902-170644Z-01A0630F`.
- Base: `52a759df453ba21ae40f322484ca332a70907d93` (`origin/main`).
- Worktree: `C:/ATVNA/.worktrees/p01-atv-mais-20261104`.
- Escopo: implementação e provas locais, dados sintéticos, custo de execução R$ 0. Nenhuma compra, cobrança, mensagem a terceiros ou ativação comercial executada.

## Resultado e limites comerciais

A regra determinística está implementada no domínio e disponível para catálogo, ficha, carrinho, checkout e conta por funções de servidor. Uma assinatura comercial vigente pode ser reconhecida, inclusive cancelada dentro do período já pago. O preço de membro permanece bloqueado para todos os itens reais: faltam custos completos, piso de contribuição aprovado e aplicação do preço no checkout do provedor. As respostas públicas não anunciam os percentuais nem apresentam a simulação bloqueada como preço pagável.

O inventário remoto sanitizado em `P01_OFFER_INVENTORY_2026-11-04.json`, consultado por outro agente via SELECT em 2026-11-04 às 09:47:31 UTC, encontrou zero `price_versions` ACTIVE para digitais e físicos. Há seis preços físicos DRAFT. Esses registros DRAFT não foram usados para oferecer descontos. O catálogo Hotmart e seu mapeamento de ofertas digitais seguem sem confirmação remota. Não há prova de compra ou cobrança real nesta entrega.

As fontes de decisão são o README comercial canônico e o PROMPT de P01 em `C:/ATVNA/docs/20-produto/programa-comercial-atvna/`, além dos gates existentes da loja. Os percentuais abaixo são exclusivamente a matriz interna de simulação prevista nesses documentos; não constituem nova tabela de varejo aprovada.

## Regra executável

`packages/domain/src/member-pricing.ts`, exportado por `@atv/domain`, concentra a regra:

1. Para cada item avulso, parte do preço regular autoritativo em centavos BRL.
2. Considera apenas promoção e cupom elegíveis, do mesmo item e vigentes em `[início, fim)`, resolvidos pelo servidor. Cada condição recebe um valor final independente calculado contra o regular.
3. O candidato de membro só participa quando há vínculo comercial vigente, aprovação específica do item, todos os custos e piso conhecidos, contribuição suficiente e suporte do checkout confirmado.
4. Escolhe o menor valor uma vez. Nunca soma percentuais ou aplica um desconto sobre outro. Em empate, preserva regular, promoção, cupom e membro nessa ordem, com desempate estável por ID.
5. Frete e assinatura ficam fora desta regra de avulsos e conservam o preço regular informado por sua própria integração.

O cálculo usa centavos inteiros e arredondamento de meio centavo para cima. A vigência usa `[starts_at, ends_at)`: o início está incluído e o instante de expiração já não concede benefício. Sobreposição usa o maior nível vigente, sem somar vantagens. Duração de 3/6/12 meses é metadado da assinatura; o preço consulta as datas comerciais persistidas e não infere fim por quantidade de dias.

### Vínculo comercial e identidade

`apps/web/src/lib/server/member-pricing.ts` usa `supabase.auth.getClaims()` para verificar a identidade e consulta somente `atv_plus_memberships` do `owner_id` autenticado, com filtro opcional de `profile_id`. Aceita os estados comerciais `ACTIVE` e `CANCELLED` dentro da vigência. Cancelamento impede renovação na regra comercial; não encurta o período pago. `PENDING`, `SUSPENDED`, `EXPIRED` e ciclos gratuitos de avaliação não concedem preço de membro.

O contrato SQL com a frente de assinatura usa `id`, `owner_id`, `profile_id`, `plan_id`, `term_months`, `status`, `starts_at`, `ends_at`, `provider_subscription_id` e `policy_version`. O leitor usa apenas `id`, `plan_id`, `status` e as datas para o resultado, mantendo filtro de proprietário explícito e RLS. Lê no máximo 101 linhas e bloqueia em mais de 100, erro de autenticação/consulta, ausência da tabela ou vínculo malformado. Ausência de sessão é anônima; falha de infraestrutura produz estado `unavailable`, sem benefício presumido.

## Contrato de integração

### Domínio

- `memberPriceMembershipActive(membership, now)` confere estado, nível e vigência.
- `activeMemberPriceMembership(memberships, now)` escolhe o vínculo de maior nível vigente.
- `simulateMemberPrice(item, planId, costs)` calcula candidato, contribuição e campos de custo ausentes; não ativa nada.
- `resolveMemberPrice({ item, membership, conditions, release, now })` devolve `itemId`, `kind`, `regularPriceCents`, `priceCents`, `source`, `sourceId`, `discountCents`, `memberGate`, `membershipId`, `planId` e `membershipEndsAt`.

Itens usam ID estável e `kind` igual a `digital-single`, `physical-single`, `subscription` ou `shipping`. Condições comerciais e `MemberPriceRelease` são objetos de servidor; a API não aceita preço, percentual, custo ou aprovação vindos do navegador. Não existe registro de liberações reais nesta entrega. `release` exige `itemId`, `approvalId` não vazio, custos completos e `checkoutSupportsMemberPrice: true`; um booleano informado pelo cliente nunca atende o contrato.

Gates verificáveis: `no-active-membership`, `excluded-kind`, `cost-review-required`, `below-approved-margin`, `checkout-integration-required` e `eligible`. O benefício fica fechado até todas as condições necessárias passarem. Uma promoção ou cupom independente já autorizado pode vencer o regular, mesmo quando o preço de membro estiver bloqueado; seus provedores devem garantir autorização e preço final próprios.

### Servidor e superfícies

| Export/superfície | Entrada confiável e resultado |
| --- | --- |
| `memberPricingSnapshot(locals, profileId?, now?)` | Identidade autenticada, leitura comercial nova; retorna `{ status, membership, checkedAt }`, status `anonymous/inactive/active/unavailable`. |
| `memberPriceForSnapshot(snapshot, item, conditions?, release?)` | Reutiliza a mesma regra com o horário da consulta. Conta/serviços devem usar snapshot novo, nunca estado reenviado pelo navegador. |
| `reviewedShopMemberPrice(snapshot, variantId, currentPriceCents?)` | Só IDs presentes no catálogo físico revisado. Adiciona URL canônica, moeda, origem do preço, `requiresCheckoutRevalidation: true` e `memberCheckoutSupported: false`. |
| `withShopMemberPricing(response, locals)` | Enriquece apenas resposta bem-sucedida de catálogo/ficha após gates existentes. Usa o preço BRL vivo já validado pelo servidor da loja. |
| `shopMemberPriceFor(locals, variantId, profileId?, now?)` | Carrega snapshot e metadados de um item revisado; usado no load do checkout. |
| `GET /api/member-price` | Apenas `variantId` e `profileId` opcionais, únicos; rejeita chaves extras. Sem variante consulta somente vínculo. Variante depende dos gates de venda existentes. Indisponibilidade comercial retorna 503. |
| `GET /api/shop/catalog` e `GET /api/shop/product/[slug]` | Preservam produto/preço/erro/gates existentes e adicionam `memberPricing: { snapshot, items, memberCheckoutSupported: false }`. |
| `POST /api/shop/cart` | Preserva itens, totais e checkout URL do provedor. Adiciona contexto de vigência e informa suporte de membro fechado. Não altera valor da compra. |
| `/loja/checkout/[slug]/[[quoteId]]` load | Adiciona `memberPricing` somente ao haver cotação existente. Assinatura, validade, preço e frete da cotação continuam verificados pela integração existente. |

As APIs usam `private, no-store` e `noindex, nofollow`. O snapshot não contém perfil natal, e-mail ou token. Vínculo pago da conta pode ser consumido pela UI da frente principal usando as mesmas funções. A API isolada usa o preço do catálogo revisado e identifica essa origem; catálogo/ficha usam o preço atual retornado pelo provedor. Toda compra precisa consultar novamente preço e vigência imediatamente antes de criar a ordem.

Os wrappers enriquecidos impõem `private, no-store` independentemente do header da resposta comercial original e removem `ETag`/`Last-Modified` anteriores, pois o snapshot varia por identidade e vigência. A regressão usa respostas de origem explicitamente públicas com `s-maxage`/`max-age` e confirma que catálogo, ficha e carrinho terminam privados e sem validadores herdados.

### Checkout e avulsos digitais

O checkout físico existente valida cotação assinada e igualdade com o preço revisado e, antes do draft, confere novamente a oferta no Shopify. Ele não aplica um preço de membro a uma ordem real. Foi mantida essa proteção: o preço real continua regular e `memberCheckoutSupported` continua falso. Carrinho não inventa totais descontados nem altera uma URL do provedor. Na ativação futura, a mesma decisão precisa ser revalidada e aplicada no servidor no instante da criação da ordem, incluindo expiração durante a navegação, e o total confirmado pelo provedor precisa coincidir com o resultado.

Para digitais, a função do domínio está pronta, mas não há preço ACTIVE nem mapeamento Hotmart ativo confirmado para conectar com segurança uma oferta pagável. Nenhum preço digital foi inventado. Também não foi criado um registro paralelo de promoções/cupons: o contrato aceita condições já resolvidas e autorizadas pela API comercial. Integração com esses provedores e prova de confirmação da compra são gates restantes.

## Custos e simulações internas

A liberação exige os seis campos por item: produção, operação, tarifa fixa de pagamento, percentual de pagamento em basis points, tributos em basis points e contribuição mínima aprovada em centavos. Campos ausentes, inválidos ou percentuais maiores que 100% bloqueiam. Contribuição calculada: `preço final − produção − operação − tarifa fixa − tarifa percentual − tributos`. Frete é cotado à parte e não compõe a base elegível. Nenhum piso real foi escolhido nesta implementação.

### Base física conhecida e lacunas

O catálogo físico revisado local contém 597 variantes de caneca, ecobag, camiseta, regata, boné e cropped. Os preços regulares encontrados são R$ 49,90, R$ 59,90, R$ 79,90 e R$ 89,90. Esse catálogo revisado alimenta a integração física já existente; não são os seis preços DRAFT do Supabase. Nenhuma dessas variantes tem, nesta entrega, o conjunto completo de custo + piso + checkout aprovado para membro.

`national-skus.json` mapeia SKU Dimona, sem custo unitário. `national-gubo-skus.json` está vazio. Prazos de produção de caneca não informam custo. Há custos em fontes de outros modelos Digipix e de caderno Graphimax, mas não foi confirmado mapeamento para essas 597 variantes; não foram atribuídos a elas. Tarifas reais de pagamento, operação, tributos, eventual subsídio de frete e piso aprovado por item seguem pendentes. Se frete for subsidiado, o subsídio deve ser coberto na revisão de custos, sem descontar o frete cobrado do cliente.

| Preço regular físico revisado | Essencial (10% simulado) | Ampliado (15% simulado) | Premium (20% simulado) | Liberação |
| --- | --- | --- | --- | --- |
| R$ 49,90 | R$ 44,91 | R$ 42,42 | R$ 39,92 | Bloqueada; custos e piso ausentes |
| R$ 59,90 | R$ 53,91 | R$ 50,92 | R$ 47,92 | Bloqueada; custos e piso ausentes |
| R$ 79,90 | R$ 71,91 | R$ 67,92 | R$ 63,92 | Bloqueada; custos e piso ausentes |
| R$ 89,90 | R$ 80,91 | R$ 76,42 | R$ 71,92 | Bloqueada; custos e piso ausentes |

### Casos sintéticos, sem oferta comercial

Para digital com regular sintético de R$ 100,00, a matriz interna produz R$ 90,00 / R$ 80,00 / R$ 70,00 para Essencial/Ampliado/Premium (10/20/30%). Esse valor regular é exclusivamente de teste. Um cenário inteiramente sintético de custo de produção R$ 10,00, operação R$ 5,00, tarifa fixa R$ 1,00, pagamento 5%, tributos 10% e piso R$ 30,00 produz contribuição R$ 60,50 / R$ 52,00 / R$ 43,50. Passa a simulação de margem; ainda exige aprovação comercial específica e checkout integrado para virar condição real.

Um físico sintético de R$ 49,90 com candidato Premium R$ 39,92, produção R$ 45,00, operação R$ 3,00, tarifa fixa R$ 1,00, pagamento 10%, tributos 5% e piso R$ 0,00 resulta em contribuição negativa de R$ 15,07. O candidato é bloqueado por `below-approved-margin`. Piso zero é só um limite de teste e não foi aprovado para item real.

Um cenário com apenas produção R$ 29,95 e demais custos ausentes mantém contribuição desconhecida e `cost-review-required`. Esse custo parcial é sintético e não foi associado a um item revisado. Assim, custo desconhecido nunca é tratado como zero.

## Verificação local

- `node --test packages/domain/member-pricing.test.mjs`: 8/8 aprovados.
- `pnpm --filter @atv/domain check`: aprovado.
- `pnpm --filter @atv/web exec vitest run src/lib/server/member-pricing.spec.ts src/lib/server/shop/shop-http.spec.ts --project server`: 23/23 aprovados, exit 0. O runner avisou no encerramento que algo mantinha o processo aberto e encerrou após timeout de 10 segundos; não houve teste falho. Avisos preexistentes do SvelteKit sobre alias/paths também apareceram.
- ESLint dos novos arquivos de servidor, APIs alteradas e load de checkout: aprovado.
- Prettier aplicado aos arquivos desta frente.
- Revisão financeira adicional: `node --test scripts/atv-plus-financial-db.test.mjs`, 5/5 aprovados em PostgreSQL local PGlite, sem rede, cobrança ou contatos reais.
- Após a correção de recompra de presentes, `node --test --test-name-pattern="a later paid purchase" scripts/atv-plus-financial-db.test.mjs`: caso novo 1/1 aprovado. As duas execuções são independentes, somando seis cenários financeiros verificados.

Os testes provam vigência e expiração exatas, cancelamento preservando fim pago, sobreposição sem acúmulo, escolha da melhor condição, rejeição de cupom vencido/futuro/de outro item, frete/assinatura excluídos, cesta mista, revalidação temporal no checkout, arredondamento, custo desconhecido, margem negativa, suporte de checkout fechado, autenticação/proprietário, falhas de consulta e uso do preço atual BRL na ficha/catálogo. As provas são unitárias e não demonstram uma cobrança ou desconto real no provedor.

A revisão financeira executa as RPCs comerciais reais da migração contra dados sintéticos: pagamento após 24 horas com oferta alterada/desativada conserva o snapshot aprovado; replay da mesma transação não duplica vínculo; valor, moeda, produto, código da oferta, identificador do checkout e segunda transação divergentes não concedem direito. Cancelamento e reembolso usam o produto vinculado ao pagamento original. Upgrade substitui previsões inferiores ainda não enviadas e seu reembolso restaura as futuras cobertas pelo vínculo inferior pago. Renovação do mesmo nível e downgrade respeitam o fim dos períodos superiores; cancelamento conserva o fim pago, expiração encerra o direito e chargeback anterior impede aprovação tardia. Recompra após reembolso recupera os presentes cancelados antes de qualquer envio, reutilizando suas identidades; presentes já enviados continuam vinculados à entrega anterior, sem duplicação. Esses testes locais não comprovam processamento hospedado, geração ou envio de PDF.

## Condições restantes para ativação real

Em 04/11/2026, o proprietário confirmou expressamente que ainda não definiu os nove preços ATV+ (três níveis × três vigências). Nenhum valor de assinatura foi preenchido, oferta ativada ou desconto comercial liberado com base nesta implementação.

1. Cadastrar e verificar preços/ofertas comerciais correntes e o mapeamento dos avulsos digitais; reconciliar valores com o provedor.
2. Aprovar custo completo, contribuição mínima e cobertura por item elegível, preservando a origem de cada dado e a aprovação específica. Nenhum percentual passa ao público antes dessa aprovação.
3. Aplicar no provedor a decisão servidor da regra única e verificar o total efetivamente cobrado, inclusive promoções/cupons elegíveis, expiração durante checkout e carrinho misto. Só então marcar `checkoutSupportsMemberPrice` por item aprovado.
4. Homologar a integração hospedada e a confirmação idempotente de compra/direito sem usar ciclos gratuitos como assinatura paga. Fazer prova autorizada sem criar custo nesta execução.

Esta entrega conclui a regra local e os contratos seguros de integração. O benefício financeiro hospedado segue bloqueado pelos gates acima.
