// Run with --register only after deploying the receiver and its app secret.
// Inject the app credentials via the environment. Never print the grant or the upstream body.
import {
  domain,
  managePaidWebhook,
  probePaidReceiver,
} from "../../apps/web/src/lib/server/shop/shopify-webhook-contract.mjs";
const request = async (target, init) =>
  fetch(target, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
const abort = (message) => {
  throw new Error(message);
};
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
  const state = await managePaidWebhook(args[0] === "--register", graphql, () =>
    probePaidReceiver(fetch, secret),
  );
  if (state === "registered")
    console.log("Webhook de pedidos pagos conferido.");
  else if (state === "absent")
    console.log("Aplicativo e permissões conferidos. Webhook ainda ausente.");
  else abort("A verificação do webhook retornou " + state);
}
run().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Falha ao verificar o webhook.",
  );
  process.exitCode = 1;
});
