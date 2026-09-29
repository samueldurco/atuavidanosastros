import test from "node:test";
import assert from "node:assert/strict";
import { bodies } from "@atv/astrology";
import {
  searchWeekTransits,
  weekTemporalSearchContract,
} from "./src/week-temporal-search.ts";
import { createProductCalculators } from "./src/product-runtime.ts";

const date = "2026-09-29",
  start = Date.parse(`${date}T00:00:00Z`),
  hour = 3600000;
const positions = (longitude = 0) =>
  bodies.map((body) => ({ body, longitude }));
const policy = (kind = "sextile", orbDegrees = 0.25) => ({
  id: "synthetic-temporal-only",
  version: "1",
  aspects: [{ kind, orbDegrees }],
});
const signal = () => new AbortController().signal;
const onlySun = (profile) => async (utc) =>
  positions(200).map((p) => ({
    ...p,
    longitude:
      p.body === "sun"
        ? profile((Date.parse(utc) - start) / hour)
        : p.longitude,
  }));
const target = (items) =>
  items.filter((e) => e.transitBody === "sun" && e.natalBody === "sun");
const run = (evaluate, p = policy(), n = positions(), s = signal(), d = date) =>
  searchWeekTransits(d, n, p, evaluate, s);

test("UTC range, all 169 grid observations, ten canonical bodies and no runtime registration", async () => {
  const calls = [];
  const result = await run(async (utc) => {
    calls.push(utc);
    return positions(30).reverse();
  });
  assert.equal(result.start, "2026-09-29T00:00:00.000Z");
  assert.equal(result.end, "2026-10-06T00:00:00.000Z");
  assert.equal(calls.length, 169);
  assert.equal(result.observations.length, 169);
  for (let i = 0; i < 169; i++) {
    assert.equal(Date.parse(calls[i]), start + i * hour);
    assert.deepEqual(
      result.observations[i].positions.map((p) => p.body),
      bodies,
    );
  }
  assert.deepEqual(result.events, []);
  assert.deepEqual(result.windows, []);
  assert.equal(result.contract, weekTemporalSearchContract);
  assert.equal(Object.keys(createProductCalculators()).length, 13);
  assert.equal(
    Object.hasOwn(createProductCalculators(), "week-reading"),
    false,
  );
  assert.equal(
    result.contract.coverage,
    "sampled-and-bracketed/not-certified-complete",
  );
  assert.equal(result.contract.policyApproval, "not-established");
});

test("two outside endpoints still produce the narrow candidate window and an exact crossing", async () => {
  const result = await run(onlySun((h) => (h <= 1 ? 59.2 + 1.6 * h : 61)));
  const events = target(result.events),
    windows = target(result.windows);
  assert.equal(events.length, 3);
  assert.deepEqual(
    new Set(events.map((e) => e.threshold)),
    new Set(["exact", "lower-orb", "upper-orb"]),
  );
  const oracle = {
    "lower-orb": start + 0.34375 * hour,
    exact: start + 0.5 * hour,
    "upper-orb": start + 0.65625 * hour,
  };
  for (const e of events) {
    assert.equal(e.mode, "bracketed-crossing");
    assert.equal(e.phaseDirection, "increasing");
    assert.ok(Date.parse(e.to) - Date.parse(e.from) <= 60000);
    assert.ok(Date.parse(e.from) <= oracle[e.threshold]);
    assert.ok(Date.parse(e.to) >= oracle[e.threshold]);
  }
  assert.equal(windows.length, 1);
  assert.ok(Date.parse(windows[0].from) <= oracle["lower-orb"]);
  assert.ok(Date.parse(windows[0].to) >= oracle["upper-orb"]);
  assert.ok(Date.parse(windows[0].to) - Date.parse(windows[0].from) < hour);
  assert.equal(windows[0].startClipped, false);
  assert.equal(windows[0].endClipped, false);
  assert.ok(result.observations.length > 169);
  assert.ok(result.observations.length < 200);
});

test("decreasing phase crosses both orb boundaries without an applying/separating claim", async () => {
  const result = await run(onlySun((h) => (h <= 1 ? 61 - 2 * h : 57)));
  const events = target(result.events),
    windows = target(result.windows);
  assert.equal(events.length, 3);
  assert.ok(events.every((e) => e.phaseDirection === "decreasing"));
  assert.equal(windows.length, 1);
  assert.equal(result.contract.motion, "not-evaluated");
  assert.equal(result.contract.precision, "not-certified");
  const exact = events.find((e) => e.threshold === "exact");
  assert.ok(
    Date.parse(exact.from) <= start + 0.5 * hour &&
      Date.parse(exact.to) >= start + 0.5 * hour,
  );
});

test("nonlinear nominal crossing brackets the independent square-root oracle without interpolation", async () => {
  const result = await run(onlySun((h) => (h <= 1 ? 59 + 2 * h * h : 62)));
  const exact = target(result.events).find((e) => e.threshold === "exact");
  const oracle = start + Math.sqrt(0.5) * hour;
  assert.ok(Date.parse(exact.from) <= oracle && Date.parse(exact.to) >= oracle);
  assert.ok(Date.parse(exact.to) - Date.parse(exact.from) <= 60000);
  const times = result.observations.map((o) => Date.parse(o.utcInstant));
  assert.equal(new Set(times).size, times.length);
  assert.deepEqual(
    times,
    [...times].sort((a, b) => a - b),
  );
});

test("closing endpoint contact is observed once and an active candidate is marked clipped", async () => {
  const result = await run(onlySun((h) => (h < 167 ? 59 : 59 + (h - 167))));
  const exact = target(result.events).filter((e) => e.threshold === "exact");
  assert.equal(exact.length, 1);
  assert.equal(exact[0].from, result.end);
  assert.equal(exact[0].to, result.end);
  const windows = target(result.windows);
  assert.equal(windows.length, 1);
  assert.equal(windows[0].endClipped, true);
});

test("conjunction across longitude wrap and opposition across the separation cusp have exact phase roots", async () => {
  for (const [kind, initial] of [
    ["conjunction", 359.2],
    ["opposition", 179.2],
  ]) {
    const result = await run(
      onlySun((h) => ((h <= 1 ? initial + 1.6 * h : initial + 2) + 360) % 360),
      policy(kind, 1),
    );
    const exact = target(result.events).filter((e) => e.threshold === "exact");
    assert.equal(exact.length, 1, kind);
    assert.equal(exact[0].phaseDirection, "increasing");
    assert.ok(
      Date.parse(exact[0].from) <= start + 0.5 * hour &&
        Date.parse(exact[0].to) >= start + 0.5 * hour,
      kind,
    );
    assert.ok(Date.parse(exact[0].to) - Date.parse(exact[0].from) <= 60000);
  }
});

test("grid contacts coalesce and endpoint roots do not duplicate; zero orb has no duration windows", async () => {
  const result = await run(
    onlySun((h) => (h <= 1 ? 59 + h : 61)),
    policy("sextile", 0),
  );
  const events = target(result.events);
  assert.equal(events.length, 1);
  assert.equal(events[0].mode, "grid-contact-run");
  assert.equal(events[0].from, new Date(start + hour).toISOString());
  assert.equal(events[0].to, events[0].from);
  assert.equal(events[0].gridContactCount, 1);
  assert.equal(target(result.windows).length, 0);
  const constant = await run(async () => positions(60), policy("sextile", 0));
  assert.equal(constant.events.length, 100);
  assert.ok(
    constant.events.every(
      (e) => e.gridContactCount === 169 && e.mode === "grid-contact-run",
    ),
  );
  assert.equal(constant.windows.length, 0);
  assert.ok(
    constant.events.every(
      (e) => Date.parse(e.to) - Date.parse(e.from) === 168 * hour,
    ),
  );
});

test("widest explicit orb yields 100 clipped candidates, while remaining unapproved and uncertified", async () => {
  const result = await run(
    async () => positions(20),
    policy("conjunction", 180),
  );
  assert.equal(result.windows.length, 100);
  assert.equal(
    new Set(result.windows.map((e) => `${e.transitBody}/${e.natalBody}`)).size,
    100,
  );
  assert.ok(
    result.windows.every(
      (w) =>
        w.from === result.start &&
        w.to === result.end &&
        w.startClipped &&
        w.endClipped,
    ),
  );
  assert.equal(
    result.contract.windows,
    "grid-connected-candidates/not-certified-continuous-intervals",
  );
});

test("sub-grid tangency and a full intra-hour turn are explicitly missed, never reported complete", async () => {
  const tangent = await run(
    onlySun((h) => (h < 1 ? 8 * (h - 0.5) ** 2 : 2)),
    policy("conjunction", 0.1),
  );
  assert.equal(target(tangent.events).length, 0);
  assert.equal(target(tangent.windows).length, 0);
  assert.equal(8 * (0.5 - 0.5) ** 2, 0);
  const alias = await run(
    onlySun((h) => (2 + h * 360) % 360),
    policy("conjunction", 0.1),
  );
  assert.equal(target(alias.events).length, 0);
  assert.equal(target(alias.windows).length, 0);
  assert.match(tangent.contract.missedEvents, /tangencies/);
  assert.match(alias.contract.missedEvents, /multiple-turns/);
});

test("captures natal/policy before asynchronous evaluation, and provider arrays before reuse", async () => {
  const natal = positions(),
    p = policy(),
    returned = positions(30);
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  let calls = 0;
  const pending = run(
    async () => {
      if (calls++ === 0) await gate;
      return returned;
    },
    p,
    natal,
  );
  natal[0].longitude = 90;
  p.aspects[0].orbDegrees = 10;
  p.id = "changed";
  release();
  const result = await pending;
  assert.equal(result.natalPositions[0].longitude, 0);
  assert.equal(result.policy.id, "synthetic-temporal-only");
  assert.equal(result.policy.aspects[0].orbDegrees, 0.25);
  returned[0].longitude = 80;
  assert.equal(result.observations[0].positions[0].longitude, 30);
  result.observations[0].positions[0].longitude = 90;
  result.policy.id = "mutated-output";
  const next = await run(async () => positions(30));
  assert.equal(next.policy.id, "synthetic-temporal-only");
  assert.equal(next.observations[0].positions[0].longitude, 30);
});

test("invalid ranges, policies and original descriptors fail before evaluation without invoking getters", async () => {
  let calls = 0,
    getters = 0;
  const evaluate = async () => {
    calls++;
    return positions();
  };
  for (const d of [
    "2026-02-30",
    "1899-12-31",
    "2099-12-25",
    "2026-09-29T00:00:00Z",
  ]) {
    await assert.rejects(run(evaluate, policy(), positions(), signal(), d));
  }
  for (const mutate of [
    (n) => n.pop(),
    (n) => (n[0].longitude = NaN),
    (n) => (n[0].longitude = 360),
    (n) => (n[1].body = "sun"),
    (n) => delete n[0],
    (n) => (n.extra = true),
    (n) => Object.setPrototypeOf(n, {}),
    (n) => Object.defineProperty(n[0], "hidden", { value: true }),
    (n) => (n[0][Symbol("hidden")] = 1),
    (n) =>
      Object.defineProperty(n[0], "longitude", {
        get() {
          getters++;
          return 0;
        },
        enumerable: true,
      }),
    (n) => Object.setPrototypeOf(n[0], { inherited: true }),
  ]) {
    const natal = positions();
    mutate(natal);
    await assert.rejects(run(evaluate, policy(), natal));
  }
  for (const mutate of [
    (p) => (p.extra = true),
    (p) => (p.aspects[0].extra = true),
    (p) => (p.aspects[0].orbDegrees = Infinity),
    (p) => p.aspects.push({ kind: "square", orbDegrees: 100 }),
    (p) =>
      Object.defineProperty(p, "id", {
        get() {
          getters++;
          return "x";
        },
        enumerable: true,
      }),
  ]) {
    const p = policy();
    mutate(p);
    await assert.rejects(run(evaluate, p));
  }
  assert.equal(calls, 0);
  assert.equal(getters, 0);
});

test("invalid evaluator output, pre-abort and abort during evaluation return no partial result", async () => {
  let calls = 0;
  const pre = new AbortController();
  pre.abort();
  await assert.rejects(
    run(
      async () => {
        calls++;
        return positions();
      },
      policy(),
      positions(),
      pre.signal,
    ),
  );
  assert.equal(calls, 0);
  const after = new AbortController();
  await assert.rejects(
    run(
      async () => {
        calls++;
        after.abort();
        return positions();
      },
      policy(),
      positions(),
      after.signal,
    ),
  );
  assert.equal(calls, 1);
  await assert.rejects(
    run(async () => positions().slice(1)),
    /invalid_week_temporal_positions/,
  );
  await assert.rejects(
    run(async () => {
      throw Error("synthetic-provider-failure");
    }),
    /synthetic-provider-failure/,
  );
});

test("engine-range end boundary and leap UTC period are checked before/through the grid", async () => {
  const leap = await run(
    async () => positions(30),
    policy(),
    positions(),
    signal(),
    "2000-02-27",
  );
  assert.equal(leap.end, "2000-03-05T00:00:00.000Z");
  const latest = await run(
    async () => positions(30),
    policy(),
    positions(),
    signal(),
    "2099-12-24",
  );
  assert.equal(latest.end, "2099-12-31T00:00:00.000Z");
});

test("evaluation budget fails closed at 2048 unique instants", async () => {
  let calls = 0;
  const natal = positions().map((p, i) => ({ ...p, longitude: i * 5 }));
  await assert.rejects(
    run(
      async (utc) => {
        calls++;
        const h = (Date.parse(utc) - start) / hour;
        const cell = Math.floor(h),
          fraction = h - cell;
        const lon = cell % 2 === 0 ? 30 + 120 * fraction : 150 - 120 * fraction;
        return positions().map((p, i) => ({ ...p, longitude: lon + i * 0.25 }));
      },
      policy(),
      natal,
    ),
    /week_temporal_evaluation_limit/,
  );
  assert.equal(calls, 2048);
});

test("dense isolated contacts fail at the event budget rather than truncating", async () => {
  let calls = 0;
  await assert.rejects(
    run(
      async (utc) => {
        calls++;
        const h = Math.round((Date.parse(utc) - start) / hour);
        return positions(h % 2 === 0 ? 60 : 30);
      },
      policy("sextile", 0),
    ),
    /week_temporal_event_limit/,
  );
  assert.equal(calls, 169);
});
