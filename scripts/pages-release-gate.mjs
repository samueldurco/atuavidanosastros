// Read-only Pages release checks. Never log provider output or binding values.
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const project = "atuavidanosastros";
const account = "7de48803dab244aa9e6d4d2d7df9b8e7";
const origin = "https://atuavidanosastros.com.br";
const wranglerVersion = "4.129.1";
const outputDirectory = ".svelte-kit/cloudflare";
const publicKeys = [
  "PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "PUBLIC_SUPABASE_ANON_KEY",
];
const requiredSecrets = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "ATV_TRIAL_RUNTIME_KEY",
  "FREE_TOOL_RECEIPT_KEY",
];
const disabledFeatures = [
  "FEATURE_AI",
  "FEATURE_HOTMART_LIVE",
  "FEATURE_MAGIC_LINK",
];
const shopSecrets = [
  "SHOPIFY_STOREFRONT_PRIVATE_TOKEN",
  "SHOP_SELLER_PUBLIC_NAME",
  "SHOP_SELLER_PUBLIC_ADDRESS",
  "SHOP_SELLER_PUBLIC_EMAIL",
  "SHOP_SELLER_PUBLIC_DOCUMENT",
  "SHOP_SELLER_PRIVATE_RETURN_LOCATION",
];

const ariesRoute = JSON.parse(
  readFileSync(
    new URL("../apps/web/src/lib/data/shop-aries-route.json", import.meta.url),
    "utf8",
  ),
);

function commerceAllowlist(workspace = root) {
  try {
    return JSON.parse(
      readFileSync(
        resolve(workspace, "apps/web/src/lib/data/shop-commerce-slugs.json"),
        "utf8",
      ),
    );
  } catch {
    return [];
  }
}

export function commerceConfigurationChecks(
  config,
  slugs = commerceAllowlist(),
) {
  const vars = config?.vars ?? {};
  if (vars.FEATURE_PHYSICAL_CHECKOUT === "false") return [];
  return [
    check(
      "shopify-flat-shipping-verified-at-brl-29-90",
      vars.SHOP_VERIFIED_FLAT_SHIPPING_BRL === "29.90",
    ),
    check(
      "physical-commerce-reviewed-configuration",
      vars.FEATURE_PHYSICAL_CHECKOUT === "true" &&
        vars.SHOP_SELLER_DISCLOSURE_APPROVED === "true" &&
        ["true", "false"].includes(vars.SHOP_ARIES_SINGLE_UNIT_ONLY) &&
        /^[1-9][0-9]?$/.test(vars.SHOP_DELIVERY_MAX_BUSINESS_DAYS ?? "") &&
        vars.SHOPIFY_STORE_DOMAIN === "bhvc0w-kk.myshopify.com" &&
        vars.SHOPIFY_STOREFRONT_API_VERSION === "2026-10" &&
        vars.SHOPIFY_DIAGNOSTIC_ENABLED === "false" &&
        vars.SHOPIFY_PREVIEW_ENABLED === "false" &&
        (!vars.SHOPIFY_CHECKOUT_HOSTS ||
          vars.SHOPIFY_CHECKOUT_HOSTS ===
            "bhvc0w-kk.myshopify.com,checkout.shopify.com") &&
        Array.isArray(slugs) &&
        (vars.SHOP_ARIES_SINGLE_UNIT_ONLY !== "true" ||
          (Number(vars.SHOP_DELIVERY_MAX_BUSINESS_DAYS) ===
            ariesRoute.deliveryBusinessDays &&
            slugs.includes(ariesRoute.slug))) &&
        slugs.length > 0 &&
        slugs.every(
          (slug) =>
            typeof slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug),
        ) &&
        new Set(slugs).size === slugs.length,
    ),
  ];
}
const healthFlags = [
  "available",
  "configurationReady",
  "authUrlValid",
  "authPublicKeyPresent",
  "urlValid",
  "serviceRolePresent",
  "runtimeKeyPresent",
];
const check = (id, pass) => ({ id, pass: Boolean(pass) });
const report = (gate, checks) => ({
  gate,
  environment: "production",
  pass: checks.every((item) => item.pass),
  checks,
});

export function configurationChecks(config) {
  const vars = config?.vars ?? {};
  let validSupabaseUrl = false;
  try {
    const url = new URL(vars.PUBLIC_SUPABASE_URL);
    validSupabaseUrl =
      url.protocol === "https:" &&
      /^[a-z0-9]+\.supabase\.co$/.test(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.port &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash;
  } catch {
    /* Report only a boolean; URL/parser errors may contain values. */
  }
  return [
    check(
      "pages-project",
      config?.name === project &&
        config?.pages_build_output_dir === outputDirectory,
    ),
    check(
      "production-site",
      vars.PUBLIC_SITE_URL === origin &&
        vars.PUBLIC_ENVIRONMENT === "production",
    ),
    check("auth-url-in-wrangler-vars", validSupabaseUrl),
    check(
      "credentials-not-in-plaintext-vars",
      [
        ...publicKeys,
        ...requiredSecrets,
        ...shopSecrets,
        "SHOP_SELLER_PUBLIC_POSTCODE",
        "SHOPIFY_DIAGNOSTIC_TOKEN",
      ].every((name) => !Object.hasOwn(vars, name)),
    ),
    check(
      "spend-and-feature-gates",
      vars.AUTOMATIC_SPEND_CAP_BRL === "0" &&
        disabledFeatures.every((name) => vars[name] === "false"),
    ),
    ...commerceConfigurationChecks(config),
  ];
}

// Wrangler 4.129.1 Pages lists only bindings of type secret_text. Its Pages
// command has no JSON flag; verify its exact project/environment header first.
export function secretNames(output) {
  const lines = output.replace(/\x1b\[[0-9;]*m/g, "").split(/\r?\n/);
  const headers = lines.filter((line) =>
    /^The ".*" environment of your Pages project /.test(line),
  );
  const expected = `The "production" environment of your Pages project "${project}" has access to the following secrets:`;
  if (headers.length !== 1 || headers[0] !== expected) return null;
  return new Set(
    lines.flatMap((line) => {
      const match = /^  - ([A-Z][A-Z0-9_]*): Value Encrypted$/.exec(line);
      return match ? [match[1]] : [];
    }),
  );
}

export function remoteConfigurationCheck(remoteProject) {
  return check(
    "remote-pages-build-configuration",
    remoteProject?.name === project &&
      remoteProject?.production_branch === "main" &&
      remoteProject?.build_config?.destination_dir === outputDirectory &&
      remoteProject?.build_config?.root_dir === "apps/web" &&
      remoteProject?.build_config?.build_command ===
        "pnpm --filter @atv/web build",
  );
}

async function readConfigurationCheck(readProject) {
  try {
    return remoteConfigurationCheck(await readProject());
  } catch {
    return remoteConfigurationCheck(null);
  }
}

// Authentication and the provider response stay in memory. Neither raw output
// nor API errors are included in release reports, including failed requests.
export async function readRemoteProject({ getAuth, fetchImpl = fetch } = {}) {
  try {
    const auth = JSON.parse(await getAuth());
    const safeCredential = (value) =>
      typeof value === "string" &&
      value.length > 0 &&
      !/[\x00-\x20\x7f]/.test(value);
    let headers;
    if (
      ["api_token", "oauth"].includes(auth?.type) &&
      safeCredential(auth.token)
    ) {
      headers = { authorization: `Bearer ${auth.token}` };
    } else if (
      auth?.type === "api_key" &&
      safeCredential(auth.key) &&
      safeCredential(auth.email)
    ) {
      headers = { "x-auth-key": auth.key, "x-auth-email": auth.email };
    } else {
      throw new Error("invalid-authentication-metadata");
    }
    const response = await fetchImpl(
      `https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/${project}`,
      {
        method: "GET",
        headers: { ...headers, accept: "application/json" },
        redirect: "manual",
        credentials: "omit",
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      },
    );
    if (
      !response.ok ||
      !/^application\/json(?:;|$)/i.test(
        response.headers.get("content-type") ?? "",
      )
    )
      throw new Error("invalid-project-response");
    const body = await response.json();
    if (body?.success !== true || !body.result)
      throw new Error("invalid-project-metadata");
    const remote = body.result;
    return {
      name: remote.name,
      production_branch: remote.production_branch,
      build_config: {
        destination_dir: remote.build_config?.destination_dir,
        root_dir: remote.build_config?.root_dir,
        build_command: remote.build_config?.build_command,
      },
    };
  } catch {
    throw new Error("read-pages-project-configuration-failed");
  }
}

function secretChecks(output, config) {
  const names = secretNames(output);
  return [
    check("production-secret-metadata", names !== null),
    check(
      "auth-public-key-secret_text",
      publicKeys.some((name) => names?.has(name)),
    ),
    ...requiredSecrets.map((name) =>
      check(`${name}-secret_text`, names?.has(name)),
    ),
    ...(config?.vars?.FEATURE_PHYSICAL_CHECKOUT === "true"
      ? shopSecrets.map((name) =>
          check(`${name}-secret_text`, names?.has(name)),
        )
      : []),
  ];
}

export function preflightReport(config, output, remoteProject) {
  return report("pages-preflight", [
    ...configurationChecks(config),
    remoteConfigurationCheck(remoteProject),
    ...secretChecks(output, config),
  ]);
}

export async function preflight(config, { listSecrets, readProject } = {}) {
  const checks = configurationChecks(config);
  if (checks.some((item) => !item.pass))
    return report("pages-preflight", checks);
  checks.push(await readConfigurationCheck(readProject));
  if (checks.some((item) => !item.pass))
    return report("pages-preflight", checks);
  try {
    const output = await listSecrets();
    return report("pages-preflight", [
      ...checks,
      ...secretChecks(output, config),
    ]);
  } catch {
    return report("pages-preflight", [
      ...checks,
      check("production-secret-metadata", false),
    ]);
  }
}

const probes = [
  {
    id: "private-trials-health",
    path: "/api/private-trials/health",
    method: "GET",
    status: 200,
    valid: (body) =>
      body?.scope === "private-free-test" &&
      healthFlags.every((flag) => body[flag] === true),
  },
  {
    id: "anonymous-free-tool-save",
    path: "/api/free-tools/save",
    method: "POST",
    status: 401,
    valid: (body) => body?.code === "auth_required",
  },
  {
    id: "anonymous-dream-start",
    path: "/api/private-dream-atlas/start",
    method: "POST",
    status: 401,
    valid: (body) =>
      body?.message === "Entre com sua conta Google para testar.",
  },
];

export async function postflight(
  config,
  { fetchImpl = fetch, readProject } = {},
) {
  const checks = configurationChecks(config);
  if (checks.some((item) => !item.pass))
    return report("pages-postflight", checks);
  checks.push(await readConfigurationCheck(readProject));
  if (checks.some((item) => !item.pass))
    return report("pages-postflight", checks);
  const commerceProbes =
    config.vars.FEATURE_PHYSICAL_CHECKOUT === "true"
      ? [
          ...commerceAllowlist()
            .filter(
              (slug) =>
                config.vars.SHOP_ARIES_SINGLE_UNIT_ONLY !== "true" ||
                slug === ariesRoute.slug,
            )
            .map((slug) => ({
              id: `physical-commerce-${slug}`,
              path: `/api/shop/product/${slug}`,
              method: "GET",
              status: 200,
              valid: (body) =>
                body?.ok === true &&
                body.product?.handle === slug &&
                body.product?.availableForSale === true &&
                Array.isArray(body.product.variants) &&
                body.product.variants.some(
                  (variant) =>
                    variant.availableForSale === true &&
                    (config.vars.SHOP_ARIES_SINGLE_UNIT_ONLY !== "true" ||
                      (variant.id === ariesRoute.variantId &&
                        Number(variant.price?.amount) ===
                          ariesRoute.itemPriceBrl)) &&
                    variant.price?.currencyCode === "BRL" &&
                    Number(variant.price?.amount) > 0,
                ),
            })),
          ...(config.vars.SHOP_ARIES_SINGLE_UNIT_ONLY === "true"
            ? [
                {
                  id: "physical-commerce-scope-excludes-caneca-cancer",
                  path: "/api/shop/product/caneca-cancer",
                  method: "GET",
                  status: 404,
                  valid: (body) => body?.code === "product_not_found",
                },
              ]
            : []),
          {
            id: "physical-diagnostic-disabled",
            path: "/api/shop/diagnostic",
            method: "POST",
            status: 404,
            valid: (body) => body?.code === "diagnostic_disabled",
          },
        ]
      : [];
  for (const probe of [...probes, ...commerceProbes]) {
    try {
      const response = await fetchImpl(`${origin}${probe.path}`, {
        method: probe.method,
        headers: {
          accept: "application/json",
          ...(probe.method === "POST"
            ? { "content-type": "application/json", origin }
            : {}),
        },
        ...(probe.method === "POST" ? { body: "{}" } : {}),
        redirect: "manual",
        credentials: "omit",
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      const isJson = /^application\/json(?:;|$)/i.test(
        response.headers.get("content-type") ?? "",
      );
      const body = isJson ? await response.json() : null;
      checks.push({
        ...check(
          probe.id,
          response.status === probe.status && isJson && probe.valid(body),
        ),
        status: response.status,
      });
    } catch {
      checks.push(check(probe.id, false));
    }
  }
  return report("pages-postflight", checks);
}

export async function run(
  mode,
  { workspace = root, listSecrets, fetchImpl, readProject } = {},
) {
  try {
    if (!["preflight", "postflight"].includes(mode))
      return report("pages-release", [check("valid-command", false)]);
    const filename = resolve(workspace, "apps/web/wrangler.jsonc");
    const parsed = ts.parseConfigFileTextToJson(
      filename,
      await readFile(filename, "utf8"),
    );
    if (parsed.error)
      return report(`pages-${mode}`, [
        check("read-wrangler-configuration", false),
      ]);
    const pkg = JSON.parse(
      await readFile(resolve(workspace, "apps/web/package.json"), "utf8"),
    );
    if (pkg.devDependencies?.wrangler !== wranglerVersion)
      return report(`pages-${mode}`, [
        check("reviewed-wrangler-version", false),
      ]);
    const runWrangler = async (args) => {
      const result = await promisify(execFile)(
        process.execPath,
        [
          resolve(workspace, "apps/web/node_modules/wrangler/bin/wrangler.js"),
          ...args,
        ],
        {
          cwd: resolve(workspace, "apps/web"),
          encoding: "utf8",
          timeout: 30000,
          maxBuffer: 256 * 1024,
          windowsHide: true,
          env: {
            ...process.env,
            CI: "true",
            FORCE_COLOR: "0",
            WRANGLER_SEND_METRICS: "false",
            WRANGLER_LOG: "log",
            WRANGLER_WRITE_LOGS: "false",
          },
        },
      );
      return result.stdout;
    };
    const getProject =
      readProject ??
      (() =>
        readRemoteProject({
          getAuth: () => runWrangler(["auth", "token", "--json"]),
          fetchImpl,
        }));
    if (mode === "postflight")
      return postflight(parsed.config, { fetchImpl, readProject: getProject });
    return preflight(parsed.config, {
      readProject: getProject,
      listSecrets:
        listSecrets ??
        (() =>
          runWrangler([
            "pages",
            "secret",
            "list",
            "--project-name",
            project,
            "--env",
            "production",
          ])),
    });
  } catch {
    return report(
      `pages-${["preflight", "postflight"].includes(mode) ? mode : "release"}`,
      [check("read-release-configuration", false)],
    );
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const result = await run(process.argv[2]);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.pass ? 0 : 1;
}
