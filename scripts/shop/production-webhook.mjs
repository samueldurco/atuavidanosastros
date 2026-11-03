// Run with --register only after deploying the receiver and its app secret.
// Inject the app credentials via the environment. Never print the grant or the upstream body.
const domain = "bhvc0w-kk.myshopify.com";
const url = "https://atuavidanosastros.com.br/api/shop/production/paid";
const fields = [
  "admin_graphql_api_id",
  "cancelled_at",
  "financial_status",
  "test",
];
const required = [
  "read_orders",
  "read_products",
  "write_merchant_managed_fulfillment_orders",
];
const appName = "ATVNA Produção Dimona";
const statusQuery = `query ProductionWebhookStatus {
  shop {myshopifyDomain}
  currentAppInstallation {app {title} accessScopes {handle}}
  webhookSubscriptions(first:10,topics:[ORDERS_PAID]) {
    nodes {id uri topic includeFields}
    pageInfo {hasNextPage endCursor}
  }
}`;
const createQuery = `mutation RegisterProductionWebhook($subscription:WebhookSubscriptionInput!) {
  webhookSubscriptionCreate(topic:ORDERS_PAID,webhookSubscription:$subscription) {
    webhookSubscription {id uri topic includeFields}
    userErrors {field}
  }
}`;
const request = async (target, init) =>
  fetch(target, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
const abort = (message) => {
  throw new Error(message);
};
function matches(webhook) {
  return (
    webhook?.uri === url &&
    webhook.topic === "ORDERS_PAID" &&
    Array.isArray(webhook.includeFields) &&
    webhook.includeFields.length === fields.length &&
    fields.every((f) => webhook.includeFields.includes(f))
  );
}
async function run() {
  const args = process.argv.slice(2);
  if (
    args.length > 1 ||
    (args.length && !["--status", "--register"].includes(args[0]))
  )
    abort(
      "Uso: node scripts/shop/production-webhook.mjs [--status|--register]",
    );
  const client = process.env.SHOPIFY_FULFILLMENT_CLIENT_ID;
  const secret = process.env.SHOPIFY_FULFILLMENT_CLIENT_SECRET;
  if (!client || !secret)
    abort("Configure o client ID e o secret do aplicativo de produção.");
  const response = await request(
    "https://" + domain + "/admin/oauth/access_token",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: client,
        client_secret: secret,
      }),
    },
  );
  if (!response.ok)
    abort("A Shopify recusou a credencial do aplicativo de produção.");
  const token = (await response.json()).access_token;
  if (typeof token !== "string" || !token)
    abort("A Shopify não devolveu o token.");
  async function graphql(query, variables = {}) {
    const r = await request(
      "https://" + domain + "/admin/api/2026-10/graphql.json",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-Shopify-Access-Token": token,
        },
        body: JSON.stringify({ query, variables }),
      },
    );
    if (!r.ok) abort("Falha HTTP na Shopify.");
    const result = await r.json();
    if (!result.data || result.errors)
      abort(
        "A Shopify recusou a consulta. Confira a instalação e as permissões.",
      );
    return result.data;
  }
  async function status() {
    const data = await graphql(statusQuery);
    const app = data.currentAppInstallation;
    if (data.shop?.myshopifyDomain !== domain || app?.app?.title !== appName)
      abort(
        "O aplicativo ou a loja não correspondem à integração de produção.",
      );
    if (!required.every((s) => app.accessScopes.some((a) => a.handle === s)))
      abort("Faltam permissões no aplicativo de produção.");
    const existing = data.webhookSubscriptions;
    if (
      !Array.isArray(existing?.nodes) ||
      existing.pageInfo?.hasNextPage !== false
    )
      abort("Listagem de webhooks incompleta.");
    if (!existing.nodes.length) return false;
    if (existing.nodes.length !== 1 || !matches(existing.nodes[0]))
      abort(
        "Já existe uma assinatura divergente. Revise antes de configurar outra.",
      );
    return true;
  }
  if (await status()) {
    console.log("Webhook de pedidos pagos conferido.");
    return;
  }
  if (args[0] !== "--register") {
    console.log("Aplicativo e permissões conferidos. Webhook ainda ausente.");
    return;
  }
  const probe = await request(url, {
    method: "POST",
    body: "{}",
    headers: { "content-type": "application/json" },
  });
  if (probe.status !== 401)
    abort(
      "O domínio oficial ainda não recusou a sonda sem assinatura com HTTP 401.",
    );
  const created = (
    await graphql(createQuery, {
      subscription: { uri: url, format: "JSON", includeFields: fields },
    })
  ).webhookSubscriptionCreate;
  if (
    !Array.isArray(created?.userErrors) ||
    created.userErrors.length ||
    !matches(created.webhookSubscription) ||
    !(await status())
  )
    abort(
      "Não foi possível confirmar a assinatura. Consulte --status antes de tentar novamente.",
    );
  console.log("Webhook de pedidos pagos registrado e conferido.");
}
run().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Falha ao verificar o webhook.",
  );
  process.exitCode = 1;
});
