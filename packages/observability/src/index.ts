const forbiddenKeys =
  /email|name|birth|password|secret|token|hottok|authorization|cookie/i;
const redacted = "[REDACTED]";
const maxDepth = 32;

function redactValue(
  value: unknown,
  ancestors: WeakSet<object>,
  depth: number,
): unknown {
  // Do not retain executable serialization hooks in the sanitized copy.
  if (typeof value === "function") return redacted;
  if (value === null || typeof value !== "object") return value;
  if (depth >= maxDepth || ancestors.has(value)) return redacted;
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item) => redactValue(item, ancestors, depth + 1));
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        forbiddenKeys.test(key)
          ? redacted
          : redactValue(item, ancestors, depth + 1),
      ]),
    );
  } finally {
    ancestors.delete(value);
  }
}

export function redact(
  attributes: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return redactValue(attributes, new WeakSet(), 0) as Record<string, unknown>;
}

export interface TelemetryEvent {
  name: string;
  version: number;
  correlationId: string;
  timestamp: string;
  attributes: Readonly<Record<string, unknown>>;
}
