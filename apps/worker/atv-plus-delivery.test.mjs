import { test } from "node:test";
import assert from "node:assert/strict";
import {
  processAtvPlusDelivery,
  selectAtvPlusNextSolarReturn,
  dispatchAtvPlusDue,
} from "./src/atv-plus-delivery.ts";
const delivery = "00000000-0000-4000-8000-000000000010",
  owner = "00000000-0000-4000-8000-000000000011",
  profile = "00000000-0000-4000-8000-000000000012",
  artifact = "00000000-0000-4000-8000-000000000013";
const base = {
  birth: {
    localDateTime: "1990-11-04T12:00:00",
    utcInstant: "1990-11-04T15:00:00Z",
    timezone: "America/Sao_Paulo",
    latitude: -23,
    longitude: -46,
    locationSource: "fixture",
  },
  returnLocation: {
    city: "Cidade sintética",
    timezone: "America/Sao_Paulo",
    latitude: -23,
    longitude: -46,
    locationSource: "fixture",
  },
  consent: {
    storage: true,
    policyVersion: "atv-input-consent/1",
    partner: false,
    continuity: false,
  },
};
test("next solar return compares actual calculated instants on the birthday, preserving experimental status", async () => {
  const years = [];
  const calculate = async (input) => {
    years.push(input.returnYear);
    return {
      status: "experimental",
      data: { returnInstant: `${input.returnYear}-11-04T14:59:00Z` },
    };
  };
  const before = await selectAtvPlusNextSolarReturn(
    base,
    "2026-11-04T14:58:59Z",
    2026,
    { deliveryId: delivery, signal: new AbortController().signal },
    calculate,
  );
  assert.equal(before.input.returnYear, 2026);
  assert.equal(before.calculation.status, "experimental");
  assert.deepEqual(years, [2025, 2026]);
  years.length = 0;
  const after = await selectAtvPlusNextSolarReturn(
    base,
    "2026-11-04T14:59:00Z",
    2026,
    { deliveryId: delivery, signal: new AbortController().signal },
    calculate,
  );
  assert.equal(after.input.returnYear, 2027);
  assert.deepEqual(years, [2025, 2026, 2027]);
});
test("next solar return selection rejects invalid calculator instants and honors cancellation", async () => {
  await assert.rejects(
    () =>
      selectAtvPlusNextSolarReturn(
        base,
        "2026-11-04T00:00:00Z",
        2026,
        { deliveryId: delivery, signal: new AbortController().signal },
        async () => ({ data: { returnInstant: "invalid" } }),
      ),
    /next_solar_return_invalid/,
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() =>
    selectAtvPlusNextSolarReturn(
      base,
      "2026-11-04T00:00:00Z",
      2026,
      { deliveryId: delivery, signal: controller.signal },
      async () => {
        throw Error("must not run");
      },
    ),
  );
});
function fixture(overrides = {}) {
  const actions = [];
  const runtime = {
    rpc: async (name, args) => {
      if (name === "atv_plus_dispatch_due") return { queued: 2 };
      actions.push(args.p_action);
      switch (args.p_action) {
        case "CLAIM":
          return {
            state: "PROCESSING",
            deliveryId: delivery,
            ownerId: owner,
            profileId: profile,
            kind: "solar-return",
            workflowProductId: "solar-return",
            periodStart: "2026-11-04T00:00:00Z",
            periodEnd: "2026-11-04T00:00:00Z",
            idempotencyKey: `atv-plus:${delivery}`,
          };
        case "ATTACH":
          return { state: "READY" };
        case "BEGIN_SEND":
          return {
            state: "SENDING",
            recipient: "+5511999990000",
            bodyBase64: "JVBERi1maXh0dXJl",
            sha256: "a".repeat(64),
            idempotencyKey: `atv-plus:${delivery}`,
          };
        case "ACCEPTED":
          return { state: "SENT" };
        case "FAIL":
          return { state: "RETRY" };
        case "UNCERTAIN":
          return { state: "SENDING" };
      }
    },
    approvedPdf: async () => ({ artifactId: artifact }),
    whatsappDocument: async () => ({ messageId: "fixture-message" }),
    ...overrides,
  };
  return { actions, runtime };
}
test("approved PDF handoff reaches SENT only, and a receipt is required separately", async () => {
  const { actions, runtime } = fixture();
  assert.equal(await processAtvPlusDelivery(delivery, runtime), "sent");
  assert.deepEqual(actions, ["CLAIM", "ATTACH", "BEGIN_SEND", "ACCEPTED"]);
  assert.equal(
    await dispatchAtvPlusDue(runtime.rpc, new AbortController().signal),
    2,
  );
});
test("failure before sending retries; uncertain provider acceptance is never automatically resent", async () => {
  const before = fixture({
    approvedPdf: async () => {
      throw Error("private diagnostic");
    },
  });
  assert.equal(await processAtvPlusDelivery(delivery, before.runtime), "retry");
  assert.deepEqual(before.actions, ["CLAIM", "FAIL"]);
  const during = fixture({
    whatsappDocument: async () => {
      throw Error("lost provider response");
    },
  });
  assert.equal(
    await processAtvPlusDelivery(delivery, during.runtime),
    "reconcile",
  );
  assert.deepEqual(during.actions, [
    "CLAIM",
    "ATTACH",
    "BEGIN_SEND",
    "UNCERTAIN",
  ]);
});
test("bounded job aborts a stalled generation without sending a document", async () => {
  const { runtime, actions } = fixture({
    approvedPdf: async () => new Promise(() => {}),
  });
  assert.equal(
    await processAtvPlusDelivery(delivery, runtime, { timeoutMs: 10 }),
    "retry",
  );
  assert.deepEqual(actions, ["CLAIM", "FAIL"]);
});
test("a replay never regenerates or resends an accepted or delivered document", async () => {
  for (const [state, result] of [
    ["SENDING", "reconcile"],
    ["SENT", "sent"],
    ["DELIVERED", "duplicate"],
  ]) {
    let calls = 0;
    const { runtime } = fixture({
      rpc: async () => ({ state }),
      approvedPdf: async () => {
        calls++;
        throw Error("must not regenerate");
      },
      whatsappDocument: async () => {
        calls++;
        throw Error("must not resend");
      },
    });
    assert.equal(await processAtvPlusDelivery(delivery, runtime), result);
    assert.equal(calls, 0);
  }
});
