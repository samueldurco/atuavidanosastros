import test from "node:test";
import assert from "node:assert/strict";
import {
  commerceConfigurationChecks,
  configurationChecks,
  preflight as runPreflight,
  preflightReport as reportWithRemote,
  postflight as runPostflight,
  readRemoteProject,
  remoteConfigurationCheck,
  run,
} from "./pages-release-gate.mjs";

const config = {
  name: "atuavidanosastros",
  pages_build_output_dir: ".svelte-kit/cloudflare",
  vars: {
    PUBLIC_SITE_URL: "https://atuavidanosastros.com.br",
    PUBLIC_ENVIRONMENT: "production",
    PUBLIC_SUPABASE_URL: "https://synthetic.supabase.co",
    AUTOMATIC_SPEND_CAP_BRL: "0",
    FEATURE_AI: "false",
    FEATURE_HOTMART_LIVE: "false",
    FEATURE_MAGIC_LINK: "false",
    FEATURE_PHYSICAL_CHECKOUT: "false",
  },
};
const remoteProject = {
  name: "atuavidanosastros",
  production_branch: "main",
  build_config: {
    destination_dir: ".svelte-kit/cloudflare",
    root_dir: "apps/web",
    build_command: "pnpm --filter @atv/web build",
  },
};
const preflightReport = (config, output) =>
  reportWithRemote(config, output, remoteProject);
const preflight = (config, options) =>
  runPreflight(config, {
    readProject: async () => remoteProject,
    ...options,
  });
const postflight = (config, options) =>
  runPostflight(config, {
    readProject: async () => remoteProject,
    ...options,
  });
const secretList = (key = "PUBLIC_SUPABASE_ANON_KEY") =>
  [
    'The "production" environment of your Pages project "atuavidanosastros" has access to the following secrets:',
    "SUPABASE_SERVICE_ROLE_KEY",
    "ATV_TRIAL_RUNTIME_KEY",
    "FREE_TOOL_RECEIPT_KEY",
    key,
  ]
    .map((line, index) => (index ? `  - ${line}: Value Encrypted` : line))
    .join("\n");
const commerceConfig = {
  ...config,
  vars: {
    ...config.vars,
    FEATURE_PHYSICAL_CHECKOUT: "true",
    SHOP_SELLER_DISCLOSURE_APPROVED: "true",
    SHOP_DELIVERY_MAX_BUSINESS_DAYS: "40",
    SHOP_VERIFIED_FLAT_SHIPPING_BRL: "29.90",
    SHOPIFY_STORE_DOMAIN: "bhvc0w-kk.myshopify.com",
    SHOPIFY_STOREFRONT_API_VERSION: "2026-10",
    SHOPIFY_DIAGNOSTIC_ENABLED: "false",
    SHOPIFY_PREVIEW_ENABLED: "false",
  },
};
const commerceSecrets = () =>
  [
    secretList(),
    ...[
      "SHOPIFY_STOREFRONT_PRIVATE_TOKEN",
      "SHOP_SELLER_PUBLIC_NAME",
      "SHOP_SELLER_PUBLIC_ADDRESS",
      "SHOP_SELLER_PUBLIC_EMAIL",
      "SHOP_SELLER_PUBLIC_DOCUMENT",
    ].map((name) => `  - ${name}: Value Encrypted`),
  ].join("\n");
const health = {
  available: true,
  configurationReady: true,
  authUrlValid: true,
  authPublicKeyPresent: true,
  urlValid: true,
  serviceRolePresent: true,
  runtimeKeyPresent: true,
  scope: "private-free-test",
};
const replies = () => [
  Response.json(health),
  Response.json({ code: "auth_required" }, { status: 401 }),
  Response.json(
    { message: "Entre com sua conta Google para testar." },
    { status: 401 },
  ),
];

test("production preflight accepts both supported encrypted public key names", () => {
  for (const key of [
    "PUBLIC_SUPABASE_ANON_KEY",
    "PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ])
    assert.equal(preflightReport(config, secretList(key)).pass, true);
  assert.equal(preflightReport(config, secretList()).checks.length, 11);
});

test("missing public binding reproduces the deployment regression and fails closed", () => {
  const result = preflightReport(
    config,
    secretList().replace(/^  - PUBLIC_SUPABASE_ANON_KEY:.*$/m, ""),
  );
  assert.equal(result.pass, false);
  assert.deepEqual(
    result.checks.filter((item) => !item.pass).map((item) => item.id),
    ["auth-public-key-secret_text"],
  );
});

test("preflight rejects a build directory outside the approved Pages output", () => {
  for (const pages_build_output_dir of [undefined, "", "dist", "../cloudflare"])
    assert.equal(
      preflightReport({ ...config, pages_build_output_dir }, secretList()).pass,
      false,
    );
});

test("plaintext, wrong environment/project, and unverified listing cannot pass", () => {
  for (const listing of [
    secretList().replace("production", "preview"),
    secretList().replace("atuavidanosastros", "another-project"),
    secretList().replace(
      "PUBLIC_SUPABASE_ANON_KEY: Value Encrypted",
      "PUBLIC_SUPABASE_ANON_KEY: plain_text",
    ),
    JSON.stringify({ PUBLIC_SUPABASE_ANON_KEY: "credential-do-not-print" }),
  ])
    assert.equal(preflightReport(config, listing).pass, false);
  assert.equal(
    preflightReport(
      {
        ...config,
        vars: {
          ...config.vars,
          PUBLIC_SUPABASE_ANON_KEY: "credential-do-not-print",
        },
      },
      secretList(),
    ).pass,
    false,
  );
});

test("missing runtime bindings, invalid URL, disabled gates and plaintext secrets fail", () => {
  for (const name of [
    "SUPABASE_SERVICE_ROLE_KEY",
    "ATV_TRIAL_RUNTIME_KEY",
    "FREE_TOOL_RECEIPT_KEY",
  ])
    assert.equal(
      preflightReport(
        config,
        secretList().replace(new RegExp(`^  - ${name}:.*$`, "m"), ""),
      ).pass,
      false,
    );
  for (const vars of [
    { PUBLIC_SUPABASE_URL: "" },
    { PUBLIC_SUPABASE_URL: "http://synthetic.supabase.co" },
    {
      PUBLIC_SUPABASE_URL:
        "https://user:credential-do-not-print@synthetic.supabase.co",
    },
    { FEATURE_HOTMART_LIVE: "true" },
    { AUTOMATIC_SPEND_CAP_BRL: "1" },
    { SUPABASE_SERVICE_ROLE_KEY: "" },
  ])
    assert.equal(
      configurationChecks({
        ...config,
        vars: { ...config.vars, ...vars },
      }).every((item) => item.pass),
      false,
    );
});

test("configuration failure prevents provider execution; CLI failures expose no output", async () => {
  let calls = 0;
  const invalid = await preflight(
    {},
    {
      listSecrets: async () => {
        calls++;
      },
    },
  );
  assert.equal(invalid.pass, false);
  assert.equal(calls, 0);
  const failed = await preflight(config, {
    listSecrets: async () => {
      throw new Error("credential-do-not-print");
    },
  });
  assert.equal(failed.pass, false);
  assert.equal(
    JSON.stringify(failed).includes("credential-do-not-print"),
    false,
  );
});

test("postflight checks health flags and uses anonymous POSTs without cookies or retries", async () => {
  const responses = replies(),
    calls = [];
  const result = await postflight(config, {
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return responses.shift();
    },
  });
  assert.equal(result.pass, true);
  assert.equal(calls.length, 3);
  assert.deepEqual(
    calls.map(({ options }) => options.method),
    ["GET", "POST", "POST"],
  );
  assert.deepEqual(
    calls.map(({ url }) => new URL(url).pathname),
    [
      "/api/private-trials/health",
      "/api/free-tools/save",
      "/api/private-dream-atlas/start",
    ],
  );
  for (const { options } of calls) {
    assert.equal(options.credentials, "omit");
    assert.equal(options.redirect, "manual");
    assert.equal(options.headers.cookie, undefined);
    assert.equal(options.headers.authorization, undefined);
  }
  assert.equal(calls[1].options.body, "{}");
  assert.equal(calls[2].options.body, "{}");
});

test("postflight rejects missing/empty auth flags even on HTTP200", async () => {
  for (const value of [false, undefined, "", "true"]) {
    const responses = replies();
    responses[0] = Response.json({ ...health, authPublicKeyPresent: value });
    const result = await postflight(config, {
      fetchImpl: async () => responses.shift(),
    });
    assert.equal(result.pass, false);
    assert.equal(
      result.checks.find((item) => item.id === "private-trials-health").pass,
      false,
    );
  }
});

test("HTML redirects, 503, wrong 401 contract, and transport failures fail without exposing bodies", async () => {
  for (const bad of [
    new Response("credential-do-not-print", {
      status: 302,
      headers: {
        "content-type": "text/html",
        location: "https://example.invalid",
      },
    }),
    Response.json({ message: "credential-do-not-print" }, { status: 503 }),
    Response.json({ code: "credential-do-not-print" }, { status: 401 }),
  ]) {
    const responses = replies();
    responses[1] = bad;
    let calls = 0;
    const result = await postflight(config, {
      fetchImpl: async () => {
        calls++;
        return responses.shift();
      },
    });
    assert.equal(result.pass, false);
    assert.equal(calls, 3);
    assert.equal(
      JSON.stringify(result).includes("credential-do-not-print"),
      false,
    );
  }
  const result = await postflight(config, {
    fetchImpl: async () => {
      throw new Error("credential-do-not-print");
    },
  });
  assert.equal(result.pass, false);
  assert.equal(
    JSON.stringify(result).includes("credential-do-not-print"),
    false,
  );
});

test("versioned repository configuration is covered without any provider access", async () => {
  const result = await run("preflight", {
    listSecrets: async () => commerceSecrets(),
    readProject: async () => remoteProject,
  });
  assert.equal(result.pass, true);
  assert.equal((await run("unknown-mode")).pass, false);
});

test("reviewed physical commerce requires encrypted access and preserves zero-spend feature gates", () => {
  assert.equal(preflightReport(commerceConfig, commerceSecrets()).pass, true);
  assert.equal(preflightReport(commerceConfig, secretList()).pass, false);
  for (const vars of [
    { FEATURE_PHYSICAL_CHECKOUT: "yes" },
    { SHOP_SELLER_DISCLOSURE_APPROVED: "false" },
    { SHOP_DELIVERY_MAX_BUSINESS_DAYS: "" },
    { SHOP_DELIVERY_MAX_BUSINESS_DAYS: "0" },
    { SHOP_VERIFIED_FLAT_SHIPPING_BRL: "" },
    { SHOP_VERIFIED_FLAT_SHIPPING_BRL: "35.00" },
    { SHOP_SELLER_PUBLIC_ADDRESS: "credential-do-not-print" },
    { SHOPIFY_STORE_DOMAIN: "other.myshopify.com" },
    { SHOPIFY_STOREFRONT_API_VERSION: "2025-01" },
    { SHOPIFY_DIAGNOSTIC_ENABLED: "true" },
    { SHOPIFY_PREVIEW_ENABLED: "true" },
    { SHOPIFY_CHECKOUT_HOSTS: "unreviewed.example" },
    { SHOPIFY_STOREFRONT_PRIVATE_TOKEN: "credential-do-not-print" },
    { AUTOMATIC_SPEND_CAP_BRL: "1" },
    { FEATURE_AI: "true" },
    { FEATURE_HOTMART_LIVE: "true" },
    { FEATURE_MAGIC_LINK: "true" },
  ]) {
    const result = preflightReport(
      { ...commerceConfig, vars: { ...commerceConfig.vars, ...vars } },
      commerceSecrets(),
    );
    assert.equal(result.pass, false);
    assert.equal(
      JSON.stringify(result).includes("credential-do-not-print"),
      false,
    );
  }
  for (const slugs of [
    [],
    null,
    ["caneca-aries", "caneca-aries"],
    ["../invalid"],
    [1],
  ])
    assert.equal(
      commerceConfigurationChecks(commerceConfig, slugs).every(
        (item) => item.pass,
      ),
      false,
    );
});

test("physical postflight verifies every eligible product without creating carts or payments", async () => {
  const initial = replies(),
    calls = [];
  const result = await postflight(commerceConfig, {
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (initial.length) return initial.shift();
      if (url.endsWith("/diagnostic"))
        return Response.json({ code: "diagnostic_disabled" }, { status: 404 });
      const slug = new URL(url).pathname.split("/").at(-1);
      return Response.json({
        ok: true,
        product: {
          handle: slug,
          availableForSale: true,
          variants: [
            {
              availableForSale: true,
              price: { amount: "79.90", currencyCode: "BRL" },
            },
          ],
        },
      });
    },
  });
  assert.equal(result.pass, true);
  const products = calls.filter(({ url }) =>
    url.includes("/api/shop/product/"),
  );
  assert.equal(products.length, 24);
  assert.equal(new Set(products.map(({ url }) => url)).size, 24);
  assert.ok(
    products.every(
      ({ options }) =>
        options.method === "GET" && options.credentials === "omit",
    ),
  );
  assert.equal(
    calls.some(({ url }) =>
      /cart|payment|checkout/.test(new URL(url).pathname),
    ),
    false,
  );
});

test("the one-unit release checks the reviewed deadline, exact variant and a closed neighboring mug", async () => {
  const pilot = {
    ...commerceConfig,
    vars: {
      ...commerceConfig.vars,
      SHOP_ARIES_SINGLE_UNIT_ONLY: "true",
      SHOP_DELIVERY_MAX_BUSINESS_DAYS: "8",
    },
  };
  assert.ok(commerceConfigurationChecks(pilot).every((item) => item.pass));
  assert.ok(
    commerceConfigurationChecks(pilot, ["caneca-cancer"]).some(
      (item) => !item.pass,
    ),
  );
  assert.ok(
    commerceConfigurationChecks({
      ...pilot,
      vars: { ...pilot.vars, SHOP_DELIVERY_MAX_BUSINESS_DAYS: "7" },
    }).some((item) => !item.pass),
  );
  for (const [id, amount, neighborClosed, expected] of [
    ["gid://shopify/ProductVariant/68006922223984", "79.90", true, true],
    ["gid://shopify/ProductVariant/68006922223984", "79.91", true, false],
    ["gid://shopify/ProductVariant/other", "79.90", true, false],
    ["gid://shopify/ProductVariant/68006922223984", "79.90", false, false],
  ]) {
    const initial = replies();
    const requests = [];
    const result = await postflight(pilot, {
      fetchImpl: async (url) => {
        if (initial.length) return initial.shift();
        requests.push(new URL(url).pathname);
        if (url.endsWith("/diagnostic"))
          return Response.json(
            { code: "diagnostic_disabled" },
            { status: 404 },
          );
        if (url.endsWith("/caneca-cancer"))
          return Response.json(
            { code: "product_not_found" },
            { status: neighborClosed ? 404 : 200 },
          );
        return Response.json({
          ok: true,
          product: {
            handle: "caneca-aries",
            availableForSale: true,
            variants: [
              {
                id,
                availableForSale: true,
                price: { amount, currencyCode: "BRL" },
              },
            ],
          },
        });
      },
    });
    assert.equal(result.pass, expected);
    assert.deepEqual(requests, [
      "/api/shop/product/caneca-aries",
      "/api/shop/product/caneca-cancer",
      "/api/shop/diagnostic",
    ]);
  }
});

test("physical postflight rejects unavailable, free, or non-BRL offers", async () => {
  for (const variant of [
    {
      availableForSale: false,
      price: { amount: "79.90", currencyCode: "BRL" },
    },
    { availableForSale: true, price: { amount: "0", currencyCode: "BRL" } },
    { availableForSale: true, price: { amount: "79.90", currencyCode: "USD" } },
  ]) {
    const initial = replies();
    const result = await postflight(commerceConfig, {
      fetchImpl: async (url) => {
        if (initial.length) return initial.shift();
        if (url.endsWith("/diagnostic"))
          return Response.json(
            { code: "diagnostic_disabled" },
            { status: 404 },
          );
        return Response.json({
          ok: true,
          product: {
            handle: new URL(url).pathname.split("/").at(-1),
            availableForSale: true,
            variants: [variant],
          },
        });
      },
    });
    assert.equal(result.pass, false);
    assert.ok(
      result.checks
        .filter(({ id }) => id.startsWith("physical-product-"))
        .every(({ pass }) => !pass),
    );
  }
});

test("remote Pages build configuration rejects malformed metadata, Windows paths, and monorepo root regressions", () => {
  const invalid = [
    undefined,
    null,
    [],
    {},
    { ...remoteProject, name: "another-project" },
    { ...remoteProject, production_branch: "preview" },
    { ...remoteProject, build_config: null },
    ...[
      { destination_dir: ".svelte-kit\\cloudflare" },
      { destination_dir: "dist" },
      { destination_dir: "./.svelte-kit/cloudflare" },
      { destination_dir: undefined },
      { root_dir: "" },
      { root_dir: "apps\\web" },
      { root_dir: "./apps/web" },
      { root_dir: "apps/web/" },
      { root_dir: "/apps/web" },
      { root_dir: undefined },
      { build_command: "pnpm build" },
      { build_command: undefined },
    ].map((fields) => ({
      ...remoteProject,
      build_config: { ...remoteProject.build_config, ...fields },
    })),
  ];
  assert.equal(remoteConfigurationCheck(remoteProject).pass, true);
  assert.equal(reportWithRemote(config, secretList()).pass, false);
  for (const remote of invalid)
    assert.deepEqual(remoteConfigurationCheck(remote), {
      id: "remote-pages-build-configuration",
      pass: false,
    });
});

test("both release gates fail closed before probes when remote configuration regresses or cannot be read", async () => {
  for (const readProject of [
    undefined,
    async () => ({
      ...remoteProject,
      build_config: {
        ...remoteProject.build_config,
        destination_dir: ".svelte-kit\\cloudflare",
      },
    }),
    async () => ({
      ...remoteProject,
      build_config: { ...remoteProject.build_config, root_dir: "" },
    }),
    async () => {
      throw new Error("credential-do-not-print");
    },
  ]) {
    let calls = 0;
    for (const gate of [runPreflight, runPostflight]) {
      const result = await gate(config, {
        readProject,
        listSecrets: async () => {
          calls++;
          return secretList();
        },
        fetchImpl: async () => {
          calls++;
          return Response.json(health);
        },
      });
      assert.equal(result.pass, false);
      assert.equal(calls, 0);
      assert.deepEqual(result.checks.at(-1), {
        id: "remote-pages-build-configuration",
        pass: false,
      });
      assert.equal(
        JSON.stringify(result).includes("credential-do-not-print"),
        false,
      );
    }
  }
});

test("remote GET supports reviewed Wrangler authentication types in memory and returns only safe build metadata", async () => {
  for (const auth of [
    { type: "api_token", token: "credential-do-not-print" },
    { type: "oauth", token: "credential-do-not-print" },
    {
      type: "api_key",
      key: "credential-do-not-print",
      email: "synthetic@example.invalid",
    },
  ]) {
    const calls = [];
    const result = await readRemoteProject({
      getAuth: async () => JSON.stringify(auth),
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return Response.json({
          success: true,
          result: {
            ...remoteProject,
            deployment_configs: {
              production: { token: auth.token ?? auth.key },
            },
          },
        });
      },
    });
    assert.deepEqual(result, remoteProject);
    assert.equal(
      JSON.stringify(result).includes("credential-do-not-print"),
      false,
    );
    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].url,
      "https://api.cloudflare.com/client/v4/accounts/7de48803dab244aa9e6d4d2d7df9b8e7/pages/projects/atuavidanosastros",
    );
    assert.equal(calls[0].options.method, "GET");
    assert.equal(calls[0].options.redirect, "manual");
    assert.equal(calls[0].options.credentials, "omit");
    assert.equal(calls[0].options.cache, "no-store");
    assert.equal(calls[0].options.headers.cookie, undefined);
    if (auth.type === "api_key") {
      assert.equal(calls[0].options.headers.authorization, undefined);
      assert.equal(calls[0].options.headers["x-auth-key"], auth.key);
      assert.equal(calls[0].options.headers["x-auth-email"], auth.email);
    } else {
      assert.equal(
        calls[0].options.headers.authorization,
        `Bearer ${auth.token}`,
      );
      assert.equal(calls[0].options.headers["x-auth-key"], undefined);
    }
  }
});

test("invalid auth output and provider failures expose only a fixed failure code", async () => {
  const fail = { message: "read-pages-project-configuration-failed" };
  for (const output of [
    "credential-do-not-print",
    "null",
    JSON.stringify({ type: "unsupported", token: "credential-do-not-print" }),
    JSON.stringify({ type: "oauth", token: "" }),
    JSON.stringify({ type: "api_token", token: "credential-do-not-print\n" }),
    JSON.stringify({ type: "api_key", key: "credential-do-not-print" }),
  ]) {
    let calls = 0;
    await assert.rejects(
      readRemoteProject({
        getAuth: async () => output,
        fetchImpl: async () => {
          calls++;
        },
      }),
      fail,
    );
    assert.equal(calls, 0);
  }
  for (const fetchImpl of [
    async () =>
      Response.json({ errors: ["credential-do-not-print"] }, { status: 403 }),
    async () => Response.json({ success: false, result: remoteProject }),
    async () => new Response("credential-do-not-print", { status: 302 }),
    async () =>
      new Response("credential-do-not-print", {
        headers: { "content-type": "application/json" },
      }),
    async () => {
      throw new Error("credential-do-not-print");
    },
  ])
    await assert.rejects(
      readRemoteProject({
        getAuth: async () =>
          JSON.stringify({ type: "oauth", token: "credential-do-not-print" }),
        fetchImpl,
      }),
      fail,
    );
});
