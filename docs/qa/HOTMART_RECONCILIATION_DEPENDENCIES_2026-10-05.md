# Hotmart — dependências para processar o inbox

RUN_ID `ATV-20260902-170644Z-01A0630F`. WU226, 05/10/2026. Inspeção focal do plano mestre §§13–14, do esquema inicial e do receptor de eventos.

O próximo passo do plano é transformar eventos financeiros em compras e entitlements reconciliados, nunca diretamente no request do webhook. A base atual oferece `offers`, `price_versions`, `purchases`, `webhook_inbox`, `outbox_events` e `entitlements`; o receptor apenas grava no inbox. Não há oferta ativa/mapeamento Hotmart em seed ou código, consumidor do inbox, execução de reconciliação por API, vínculo de `buyer.ucode`/e-mail verificado, convite pendente, nem ciclo de assinatura. `external_buyer_ref` existe, mas seu preenchimento e a prova de posse ainda não têm fluxo. O Supabase hospedado está pausado; a integração live segue desativada.

| Fronteira necessária | Responsável e aceite verificável |
| --- | --- |
| Produto/oferta externa e estados financeiros suportados | Produto/comercial aprova IDs de produto e oferta, política de preço e eventos; engenharia registra mapeamento versionado e fixture sanitizada de cada evento, inclusive atraso, expiração, cancelamento, reembolso e chargeback. Nenhum ID/preço inventado. |
| Identidade e atribuição | Produto/privacidade confirmam o padrão do §14; engenharia liga compra a conta autenticada por prova de posse, trata comprador sem conta como convite pendente e quarentena para conflito. Não inferir titular pela carga do webhook isoladamente. |
| Consumidor e reconciliação | Engenharia processa inbox por `event.id` e transação, conserva ordem/estado e retentativas, compara o estado com a autoridade Hotmart e só então atualiza compra e entitlement em transação. Testes locais cobrem repetição, fora de ordem, erro e estorno; prova hospedada após retomada. |
| Assinatura ATV+ | Produto aprova período, renovação, benefício e cancelamento; engenharia vincula cada ciclo pago ao período de acesso e trata falha/grace period. O entitlement pontual atual não modela isso. |

Sem as duas primeiras definições e exemplos sanitizados aprovados, qualquer consumidor que conceda acesso teria de adivinhar oferta, titular ou estado financeiro. A WU fica **BLOQUEADA para mutação de compra/acesso**; o inbox e a checagem de replay permanecem locais e desligados em produção. Próximo requisito independente do programa: Loja dos Signos, onda 7, catálogo/template sem SKUs fictícios nem checkout físico.
