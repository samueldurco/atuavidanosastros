import {
  capabilities,
  SCHEMA_VERSION,
  tierLimits,
  type Reading,
  type Tier,
} from "./contracts.ts";

const text = { type: "string", minLength: 1, maxLength: 1800 };
const refs = {
  type: "array",
  minItems: 1,
  maxItems: 40,
  uniqueItems: true,
  items: { type: "string", pattern: "^[a-z][a-z0-9._-]{0,63}$" },
};
function object(properties: Record<string, unknown>) {
  return {
    type: "object",
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
  };
}
/** Provider schema is a convenience; all responses must also pass parseReading. */
export const readingJsonSchema = object({
  schemaVersion: { type: "string", enum: [SCHEMA_VERSION] },
  capability: { type: "string", enum: capabilities },
  scope: { type: "string", enum: ["partial", "integrated"] },
  title: { type: "string", minLength: 1, maxLength: 120 },
  claims: {
    type: "array",
    minItems: 1,
    maxItems: 24,
    items: object({
      id: { type: "string", pattern: "^[a-z][a-z0-9._-]{0,63}$" },
      kind: { type: "string", enum: ["fact", "interpretation", "hypothesis"] },
      text,
      evidence: refs,
    }),
  },
  relations: {
    type: "array",
    maxItems: 16,
    items: object({
      kind: { type: "string", enum: ["convergence", "tension"] },
      claimIds: { ...refs, minItems: 2 },
      text,
    }),
  },
  synthesis: {
    type: "array",
    minItems: 1,
    maxItems: 6,
    items: object({ claimIds: refs, text }),
  },
  reflections: { type: "array", minItems: 1, maxItems: 6, items: text },
  limits: { type: "array", minItems: 1, maxItems: 6, items: text },
});

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const exact = (v: unknown, keys: string[]): v is Record<string, unknown> =>
  isObject(v) &&
  Object.keys(v).length === keys.length &&
  keys.every((k) => Object.hasOwn(v, k));
const isText = (v: unknown, max = 1800): v is string =>
  typeof v === "string" &&
  v.trim().length > 0 &&
  v.length <= max &&
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
const id = (v: unknown): v is string =>
  typeof v === "string" && /^[a-z][a-z0-9._-]{0,63}$/.test(v);
const array = (v: unknown, min: number, max: number): v is unknown[] =>
  Array.isArray(v) && v.length >= min && v.length <= max;
const references = (v: unknown, min = 1): boolean =>
  array(v, min, 40) && v.every(id) && new Set(v).size === v.length;

export function parseReading(raw: unknown, tier: Tier): Reading | null {
  let value: unknown = raw;
  const limits = tierLimits[tier];
  try {
    const encoded = typeof raw === "string" ? raw : JSON.stringify(raw);
    if (!encoded || encoded.length > limits.maxOutputChars) return null;
    value = JSON.parse(encoded);
  } catch {
    return null;
  }
  if (
    !exact(value, [
      "schemaVersion",
      "capability",
      "scope",
      "title",
      "claims",
      "relations",
      "synthesis",
      "reflections",
      "limits",
    ])
  )
    return null;
  if (
    value.schemaVersion !== SCHEMA_VERSION ||
    !capabilities.includes(value.capability as never) ||
    !["partial", "integrated"].includes(value.scope as string) ||
    !isText(value.title, 120)
  )
    return null;
  if (
    !array(value.claims, 1, limits.maxClaims) ||
    !value.claims.every(
      (c) =>
        exact(c, ["id", "kind", "text", "evidence"]) &&
        id(c.id) &&
        ["fact", "interpretation", "hypothesis"].includes(c.kind as string) &&
        isText(c.text) &&
        references(c.evidence),
    )
  )
    return null;
  if (
    !array(value.relations, 0, limits.maxRelations) ||
    !value.relations.every(
      (r) =>
        exact(r, ["kind", "claimIds", "text"]) &&
        ["convergence", "tension"].includes(r.kind as string) &&
        references(r.claimIds, 2) &&
        isText(r.text),
    )
  )
    return null;
  if (
    !array(value.synthesis, 1, 6) ||
    !value.synthesis.every(
      (s) =>
        exact(s, ["claimIds", "text"]) &&
        references(s.claimIds) &&
        isText(s.text),
    )
  )
    return null;
  if (
    ![value.reflections, value.limits].every(
      (v) => array(v, 1, 6) && v.every((x) => isText(x)),
    )
  )
    return null;
  return value as unknown as Reading;
}
