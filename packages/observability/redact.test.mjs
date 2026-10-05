import assert from "node:assert/strict";
import test from "node:test";
import { redact } from "./src/index.ts";

const synthetic = "SYNTHETIC_VALUE";
const hidden = "[REDACTED]";

test("preserves the existing sensitive-key policy and safe attributes", () => {
  const sensitiveKeys = [
    "email",
    "displayName",
    "birthDate",
    "password",
    "clientSecret",
    "accessToken",
    "hottok",
    "Authorization",
    "Cookie",
  ];
  const input = Object.fromEntries(
    sensitiveKeys.map((key) => [key, synthetic]),
  );
  input.version = 2;
  input.durationMs = 12;
  input.allowed = false;
  input.empty = null;
  const result = redact(input);
  for (const key of sensitiveKeys) assert.equal(result[key], hidden);
  assert.deepEqual(
    [result.version, result.durationMs, result.allowed, result.empty],
    [2, 12, false, null],
  );
  assert.equal(input.email, synthetic);
});

test("removes sensitive fields in nested objects and arrays without mutating input", () => {
  const input = Object.freeze({
    context: Object.freeze({ authorization: synthetic, status: "ready" }),
    items: Object.freeze([
      Object.freeze({ email: synthetic, count: 3 }),
      [null, { token: synthetic }],
    ]),
  });
  assert.deepEqual(redact(input), {
    context: { authorization: hidden, status: "ready" },
    items: [{ email: hidden, count: 3 }, [null, { token: hidden }]],
  });
  assert.equal(input.context.authorization, synthetic);
  assert.equal(input.items[0].email, synthetic);
  assert.equal(JSON.stringify(redact(input)).includes(synthetic), false);
});

test("breaks cycles while retaining repeated acyclic references", () => {
  const shared = { status: "ready", secret: synthetic };
  const input = { first: shared, second: shared, items: [] };
  input.self = input;
  input.items.push(input.items);
  assert.deepEqual(redact(input), {
    first: { status: "ready", secret: hidden },
    second: { status: "ready", secret: hidden },
    items: [hidden],
    self: hidden,
  });
  assert.equal(input.self, input);
  assert.doesNotThrow(() => JSON.stringify(redact(input)));
});

test("bounds excessive nesting without overflowing the stack or retaining deep data", () => {
  let nested = { email: synthetic };
  for (let i = 0; i < 10000; i++) nested = { context: nested };
  const serialized = JSON.stringify(redact(nested));
  assert.equal(serialized.includes(synthetic), false);
  assert.equal(serialized.includes(hidden), true);
  assert.ok(serialized.length < 500);
});

test("does not execute or copy custom serialization hooks", () => {
  let calls = 0;
  const input = {
    context: {
      toJSON() {
        calls++;
        return { email: synthetic };
      },
      status: "ready",
    },
  };
  const result = redact(input);
  assert.equal(result.context.toJSON, hidden);
  assert.equal(JSON.stringify(result).includes(synthetic), false);
  assert.equal(calls, 0);
});

test("retains unusual JSON keys as own data without changing object prototypes", () => {
  const input = JSON.parse(
    '{"context":{"__proto__":{"email":"SYNTHETIC_VALUE","status":"ready"}}}',
  );
  const result = redact(input);
  assert.equal(Object.hasOwn(result.context, "__proto__"), true);
  assert.equal(result.context.__proto__.email, hidden);
  assert.equal(Object.getPrototypeOf(result.context), Object.prototype);
  assert.equal(Object.prototype.status, undefined);
});
