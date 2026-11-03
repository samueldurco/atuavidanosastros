# App de produção da Dimona na Shopify

## Instalação na loja da ATVNA

1. Use uma sessão autorizada da organização proprietária de `bhvc0w-kk.myshopify.com`. Em uma pasta privada vazia, execute `shopify app config link` e escolha criar o app **ATVNA Produção Dimona**, ou selecione esse app se ele já existir. O comando gera a configuração com o identificador público. Confira a organização e o nome antes de prosseguir. [Vincular uma configuração com a CLI](https://shopify.dev/docs/api/shopify-cli/app/app-config-link)
2. Naquela pasta, use o conteúdo do arquivo `shopify.app.toml.example` como `shopify.app.toml`, substituindo o marcador pelo `client_id` que a CLI gerou. Rode `shopify app config validate`. Rode `shopify app deploy` e confira a prévia das permissões antes de publicar a versão. A implantação do site e a deste app são operações separadas. [Validar a configuração](https://shopify.dev/docs/api/shopify-cli/app/app-config-validate) · [Publicar a versão](https://shopify.dev/docs/api/shopify-cli/app/app-deploy)
3. No Dev Dashboard da organização, abra esse app, escolha **Install app**, selecione a loja e conclua a instalação. Confira o acesso ao nome e ao endereço do destinatário. O fluxo usa `read_orders` para validar o pagamento, `read_products` para identificar a variante e `write_merchant_managed_fulfillment_orders` para registrar o rastreio das unidades enviadas. A credencial do checkout de rascunhos permanece separada. [Instalar na própria loja](https://shopify.dev/docs/apps/build/dev-dashboard/create-apps-using-dev-dashboard)
4. Em **Settings**, use o Client ID e o client secret dessa instalação para configurar `SHOPIFY_FULFILLMENT_CLIENT_ID` e `SHOPIFY_FULFILLMENT_CLIENT_SECRET` como segredos do servidor e `SHOPIFY_STORE_DOMAIN=bhvc0w-kk.myshopify.com`. A Pages precisa de nova implantação ao trocar os valores. O servidor renova o token por client credentials. [Autenticação da organização proprietária](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/client-credentials-grant)

## Assinatura e conferência

Injete as duas credenciais em um processo privado, sem registrá-las na saída, e execute a partir da raiz do projeto:

```sh
node scripts/shop/production-webhook.mjs --status
node scripts/shop/production-webhook.mjs --register
node scripts/shop/production-webhook.mjs --status
```

O registro exige que o domínio responda HTTP 401 a um POST sem assinatura. O script verifica o nome do app, a loja e os escopos antes de assinar `ORDERS_PAID`, e em seguida lê a assinatura criada. O corpo assinado leva apenas o identificador do pedido, a situação financeira, a marca de teste e a data de cancelamento. Se a Shopify reenviar o evento, a conciliação da loja verifica a mesma venda. [Assinaturas por loja](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/webhookSubscriptionCreate)

A consulta de inventário em 3/11/2026 encontrou 585 variantes dos 129 produtos em um único local administrado pela própria loja. Para registrar o primeiro rastreio de uma venda, o servidor consulta de novo o pedido pago e as linhas efetivamente disponíveis, confere o rastreio existente e usa a quantidade enviada para criar ou atualizar o fulfillment. [Registrar o envio](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/fulfillmentCreate)
