import test from "node:test";
import assert from "node:assert/strict";
import { workflows } from "@atv/domain";
import {
  createProductCalculators,
  createProductProcessor,
  productCalculationCoverage,
} from "./src/product-runtime.ts";

test("coverage distinguishes thirteen partial calculation bases across six universes from releases", () => {
  const calculators = createProductCalculators(),
    coverage = productCalculationCoverage();
  assert.ok(Object.isFrozen(calculators));
  assert.equal(Object.keys(calculators).length, 13);
  assert.equal(coverage.length, 25);
  assert.deepEqual(
    coverage.map((p) => p.productId),
    workflows.map((p) => p.id),
  );
  const implemented = coverage.filter((p) => p.calculation === "partial-base");
  assert.equal(implemented.length, 13);
  assert.equal(new Set(implemented.map((p) => p.universe)).size, 6);
  assert.ok(coverage.every((p) => p.publication === "blocked"));
  assert.ok(coverage.every(Object.isFrozen));
});

test("default runtime never contacts RPC, emits only aggregate idle metrics and invokes no provider", async () => {
  const events = [];
  const runtime = createProductProcessor(
    async () => {
      assert.fail("must remain offline");
    },
    { emit: (e) => events.push(e) },
  );
  assert.deepEqual(runtime.products, []);
  assert.equal(await runtime.step(), "idle");
  assert.deepEqual(Object.keys(events[0]).sort(), [
    "attempt",
    "durationMs",
    "event",
    "outcome",
  ]);
  assert.equal(events[0].outcome, "idle");
  assert.ok(Object.isFrozen(runtime));
});

const synastryPolicy = () => ({
  id: "synthetic-runtime-not-approved",
  version: "qa-fixture-1",
  aspects: [{ kind: "conjunction", orbDegrees: 5 }],
});
test("synastry requires explicit experimental server policy and a separate allowlist", async () => {
  const rpc = async () =>
    assert.fail("unselected experimental calculator contacted transport");
  assert.throws(
    () => createProductProcessor(rpc, { enabledProducts: ["synastry"] }),
    /invalid_product_configuration/,
  );
  const policy = synastryPolicy();
  const calculators = createProductCalculators({
    experimentalSynastryPolicy: policy,
  });
  assert.equal(Object.keys(calculators).length, 14);
  assert.equal(typeof calculators.synastry, "function");
  assert.equal(createProductCalculators().synastry, undefined);
  assert.equal(
    productCalculationCoverage().find((p) => p.productId === "synastry")
      .calculation,
    "unavailable",
  );
  const unselected = createProductProcessor(rpc, {
    experimentalSynastryPolicy: policy,
  });
  assert.deepEqual(unselected.products, []);
  assert.equal(await unselected.step(), "idle");
});
test("experimental synastry captures allowlist and rejects malformed policy before RPC", async () => {
  const calls = [];
  const rpc = async (name, args) => {
    calls.push({ name, args });
    return null;
  };
  for (const policy of [null, {}, { ...synastryPolicy(), aspects: [] }]) {
    assert.throws(() =>
      createProductProcessor(rpc, {
        enabledProducts: ["synastry"],
        experimentalSynastryPolicy: policy,
      }),
    );
  }
  assert.deepEqual(calls, []);
  const options = {
    enabledProducts: ["synastry"],
    experimentalSynastryPolicy: synastryPolicy(),
  };
  const selected = createProductProcessor(rpc, options);
  options.enabledProducts.push("daily-card");
  options.experimentalSynastryPolicy = null;
  assert.equal(await selected.step(), "idle");
  assert.deepEqual(selected.products, ["synastry"]);
  assert.deepEqual(calls, [
    {
      name: "claim_product_run_work",
      args: { p_products: ["synastry"], p_lease_seconds: 60 },
    },
  ]);
});

test("couple dossier and synastry require independent experimental policies and allowlists", async () => {
  const rpc = async () =>
    assert.fail("unselected calculator contacted transport");
  const policy = {
    ...synastryPolicy(),
    id: "synthetic-dossier-runtime-not-approved",
  };
  const dossier = createProductCalculators({
    experimentalCoupleDossierPolicy: policy,
  });
  const synastry = createProductCalculators({
    experimentalSynastryPolicy: synastryPolicy(),
  });
  assert.equal(Object.keys(dossier).length, 14);
  assert.equal(typeof dossier["couple-dossier"], "function");
  assert.equal(dossier.synastry, undefined);
  assert.equal(synastry["couple-dossier"], undefined);
  assert.equal(createProductCalculators()["couple-dossier"], undefined);
  assert.equal(
    productCalculationCoverage().find((p) => p.productId === "couple-dossier")
      .calculation,
    "unavailable",
  );
  assert.equal(
    Object.keys(
      createProductCalculators({
        experimentalSynastryPolicy: synastryPolicy(),
        experimentalCoupleDossierPolicy: policy,
      }),
    ).length,
    15,
  );
  for (const options of [
    { enabledProducts: ["couple-dossier"] },
    {
      enabledProducts: ["couple-dossier"],
      experimentalSynastryPolicy: synastryPolicy(),
    },
    { enabledProducts: ["synastry"], experimentalCoupleDossierPolicy: policy },
  ])
    assert.throws(
      () => createProductProcessor(rpc, options),
      /invalid_product_configuration/,
    );
  const unselected = createProductProcessor(rpc, {
    experimentalCoupleDossierPolicy: policy,
  });
  assert.deepEqual(unselected.products, []);
  assert.equal(await unselected.step(), "idle");
});
test("experimental dossier captures configuration and rejects malformed policy before RPC", async () => {
  const calls = [];
  const rpc = async (name, args) => {
    calls.push({ name, args });
    return null;
  };
  for (const policy of [null, {}, { ...synastryPolicy(), aspects: [] }]) {
    assert.throws(() =>
      createProductProcessor(rpc, {
        enabledProducts: ["couple-dossier"],
        experimentalCoupleDossierPolicy: policy,
      }),
    );
  }
  assert.deepEqual(calls, []);
  const options = {
    enabledProducts: ["couple-dossier"],
    experimentalCoupleDossierPolicy: synastryPolicy(),
  };
  const selected = createProductProcessor(rpc, options);
  options.enabledProducts.push("synastry", "daily-card");
  options.experimentalCoupleDossierPolicy = null;
  assert.equal(await selected.step(), "idle");
  assert.deepEqual(selected.products, ["couple-dossier"]);
  assert.deepEqual(calls, [
    {
      name: "claim_product_run_work",
      args: { p_products: ["couple-dossier"], p_lease_seconds: 60 },
    },
  ]);
});

test("invalid server configuration fails before any RPC call", () => {
  const rpc = async () => assert.fail("invalid configuration called transport");
  for (const enabledProducts of [
    ["solar-return"],
    ["daily-card", "daily-card"],
    ["__proto__"],
    [null],
    "daily-card",
  ])
    assert.throws(
      () => createProductProcessor(rpc, { enabledProducts }),
      /invalid_product_configuration/,
    );
  for (const timeoutMs of [0, -1, 25001, NaN, 1.5])
    assert.throws(
      () => createProductProcessor(rpc, { timeoutMs }),
      /invalid_processing_deadline/,
    );
});

test("runtime captures allowlist and telemetry; one invocation claims at most once", async () => {
  const calls = [],
    events = [],
    options = { enabledProducts: ["daily-card"], emit: (e) => events.push(e) };
  const runtime = createProductProcessor(async (name, args, signal) => {
    calls.push({ name, args, signal });
    return null;
  }, options);
  options.enabledProducts.push("birth-chart");
  options.emit = () => assert.fail("mutable callback");
  assert.equal(await runtime.step(), "idle");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "claim_product_run_work");
  assert.deepEqual(calls[0].args, {
    p_products: ["daily-card"],
    p_lease_seconds: 60,
  });
  assert.ok(calls[0].signal instanceof AbortSignal);
  assert.equal(events.length, 1);
  assert.deepEqual(runtime.products, ["daily-card"]);
  assert.ok(Object.isFrozen(runtime.products));
});

test("transport secrets and unexpected claims cannot enter telemetry or computation", async () => {
  const events = [];
  const runtime = createProductProcessor(
    async () => {
      throw Error("secret-token personal birth payload");
    },
    { enabledProducts: ["daily-card"], emit: (e) => events.push(e) },
  );
  assert.equal(await runtime.step(), "unavailable");
  assert.ok(!JSON.stringify(events).includes("secret"));
  const bad = createProductProcessor(
    async () => ({
      status: "claimed",
      runId: "00000000-0000-4000-8000-000000000001",
      token: "00000000-0000-4000-8000-000000000002",
      productId: "birth-chart",
      revision: 1,
      state: "QUEUED",
      attempt: 1,
      leaseUntil: "2099-01-01T00:00:00Z",
      input: { private: "must not compute" },
    }),
    { enabledProducts: ["daily-card"] },
  );
  assert.equal(await bad.step(), "unavailable");
});

test("telemetry sink failure never changes processing outcome", async () => {
  const runtime = createProductProcessor(async () => null, {
    enabledProducts: ["daily-card"],
    emit: () => {
      throw Error("sink unavailable");
    },
  });
  assert.equal(await runtime.step(), "idle");
});
