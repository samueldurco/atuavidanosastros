import { bodies, engineContract } from "@atv/astrology";
import { validDate, type CalculationSnapshot } from "@atv/domain";
import { contextProductContract } from "./context-calculators.ts";
import { bodyLabels, zodiacPosition } from "./natal-calculators.ts";

const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const exact = (
  v: unknown,
  keys: readonly string[],
): v is Record<string, unknown> =>
  record(v) &&
  Object.keys(v).length === keys.length &&
  keys.every((key) => Object.hasOwn(v, key));
const contract = (v: unknown, expected: Record<string, unknown>) =>
  exact(v, Object.keys(expected)) &&
  Object.entries(expected).every(([key, wanted]) =>
    Array.isArray(wanted)
      ? JSON.stringify(v[key]) === JSON.stringify(wanted)
      : v[key] === wanted,
  );
const canonicalInstant = (v: unknown): v is string =>
  typeof v === "string" &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v).toISOString() === v;
const requiredLimits = [
  "Base parcial experimental, sem homologação do motor, interpretação ou liberação do produto.",
  "Casas, ângulos, aspectos entre mapas, aplicação/separação e eventos exatos não foram projetados.",
  "A data foi amostrada somente às 12:00 UTC. Não é meio-dia local, cobertura do dia, janela favorável, previsão ou busca de trânsito exato.",
  "Fuso/local atuais não foram inferidos do nascimento. Semana, calendário e Revolução Solar não foram calculados.",
];

/** Persisted coherence, not source authentication or engine homologation. Inspect original fact keys. */
export function validDateReadingProjection(
  value: CalculationSnapshot,
): boolean {
  const data = value.data;
  if (
    !exact(value, ["version", "kind", "status", "facts", "data", "limits"]) ||
    value.version !== contextProductContract.version ||
    value.kind !== "cycles" ||
    value.status !== "experimental" ||
    !exact(data, [
      "productId",
      "projection",
      "first",
      "second",
      "sampleInstant",
      "targetDate",
      "sharing",
      "aspects",
      "events",
      "compatibilityScore",
    ]) ||
    data.productId !== "date-reading" ||
    !contract(data.projection, contextProductContract) ||
    !validDate(data.targetDate) ||
    data.sampleInstant !== `${data.targetDate}T12:00:00.000Z` ||
    data.sharing !== "not-authorized" ||
    data.compatibilityScore !== null ||
    !Array.isArray(data.aspects) ||
    data.aspects.length ||
    !Array.isArray(data.events) ||
    data.events.length ||
    !Array.isArray(value.facts) ||
    !Array.isArray(value.limits)
  )
    return false;
  const expected: CalculationSnapshot["facts"] = [];
  const warnings: string[] = [];
  let engineIdentity: string | undefined;
  for (const [side, role, label] of [
    ["first", "natal", "Base natal"],
    ["second", "sample", "Amostra da data (12:00 UTC)"],
  ] as const) {
    const projection = data[side];
    if (
      !exact(projection, ["role", "positions", "provenance"]) ||
      projection.role !== role ||
      !Array.isArray(projection.positions) ||
      projection.positions.length !== bodies.length
    )
      return false;
    const provenance = projection.provenance;
    if (
      !exact(provenance, [
        "provider",
        "providerVersion",
        "algorithmVersion",
        "zodiac",
        "houseSystem",
        "calculatedAt",
        "referenceFrame",
        "dataManifest",
        "contract",
        "temporal",
        "accuracyStatus",
        "warnings",
      ]) ||
      !contract(provenance.contract, engineContract) ||
      provenance.accuracyStatus !== "experimental" ||
      provenance.zodiac !== "tropical" ||
      provenance.houseSystem !== "placidus" ||
      provenance.referenceFrame !== "geocentric-apparent-ecliptic-of-date" ||
      [
        provenance.provider,
        provenance.providerVersion,
        provenance.algorithmVersion,
      ].some((part) => typeof part !== "string" || !part.trim()) ||
      !canonicalInstant(provenance.calculatedAt) ||
      !record(provenance.dataManifest) ||
      !Object.keys(provenance.dataManifest).length ||
      !Array.isArray(provenance.warnings) ||
      !provenance.warnings.length ||
      provenance.warnings.some((w) => typeof w !== "string" || !w.trim())
    )
      return false;
    const identity = JSON.stringify([
      provenance.provider,
      provenance.providerVersion,
      provenance.algorithmVersion,
      provenance.dataManifest,
    ]);
    if (engineIdentity !== undefined && engineIdentity !== identity)
      return false;
    engineIdentity = identity;
    const temporal = provenance.temporal;
    if (
      !exact(temporal, [
        "utcInstant",
        "julianDayUt1Approx",
        "dut1Seconds",
        "timezoneMode",
        "timezoneRules",
        "offsetSeconds",
        "inputScale",
        "engineScale",
        "deltaTSeconds",
      ]) ||
      !canonicalInstant(temporal.utcInstant) ||
      temporal.utcInstant < engineContract.minUtcInstant ||
      temporal.utcInstant > engineContract.maxUtcInstant ||
      temporal.julianDayUt1Approx !==
        Date.parse(temporal.utcInstant) / 86400000 + 2440587.5 ||
      temporal.dut1Seconds !== null ||
      temporal.inputScale !== "UTC" ||
      temporal.engineScale !== "UT1-approximated-by-UTC" ||
      typeof temporal.deltaTSeconds !== "number" ||
      !Number.isFinite(temporal.deltaTSeconds) ||
      typeof temporal.offsetSeconds !== "number" ||
      !Number.isInteger(temporal.offsetSeconds) ||
      Math.abs(temporal.offsetSeconds) > 86400 ||
      !(
        (temporal.timezoneMode === "fixed-offset" &&
          temporal.timezoneRules === "explicit-offset/v1") ||
        (temporal.timezoneMode === "iana" &&
          temporal.timezoneRules === "runtime-intl/unpinned")
      ) ||
      (side === "second" &&
        (temporal.utcInstant !== data.sampleInstant ||
          temporal.offsetSeconds !== 0 ||
          temporal.timezoneMode !== "fixed-offset"))
    )
      return false;
    warnings.push(...(provenance.warnings as string[]));
    const source = `${provenance.provider}@${provenance.providerVersion};${provenance.algorithmVersion};${contextProductContract.version}`;
    for (const [index, body] of bodies.entries()) {
      const p = projection.positions[index];
      if (
        !exact(p, [
          "body",
          "longitude",
          "latitude",
          "distanceAu",
          "retrograde",
        ]) ||
        p.body !== body ||
        typeof p.longitude !== "number" ||
        !Number.isFinite(p.longitude) ||
        p.longitude < 0 ||
        p.longitude >= 360 ||
        typeof p.latitude !== "number" ||
        !Number.isFinite(p.latitude) ||
        Math.abs(p.latitude) > 90 ||
        typeof p.distanceAu !== "number" ||
        !Number.isFinite(p.distanceAu) ||
        p.distanceAu <= 0 ||
        typeof p.retrograde !== "boolean"
      )
        return false;
      expected.push({
        id: `${role}-${body}`,
        kind: "calculated",
        display: `${label} · ${bodyLabels[body]}: ${zodiacPosition(p.longitude).display}`,
        source,
      });
    }
  }
  expected.push({
    id: "sample-instant",
    kind: "calculated",
    display: `Amostra única em ${data.sampleInstant}; não representa o dia local inteiro.`,
    source: contextProductContract.version,
  });
  if (value.facts.length === expected.length + 1) {
    const context = value.facts.at(-1);
    if (
      !context ||
      context.id !== "personal-context" ||
      context.kind !== "reported" ||
      context.source !== "input.context" ||
      typeof context.display !== "string" ||
      !context.display.trim() ||
      context.display.length > 1200 ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\uD800-\uDFFF]/u.test(
        context.display,
      )
    )
      return false;
    expected.push({
      id: context.id,
      kind: context.kind,
      display: context.display,
      source: context.source,
    });
  }
  return (
    value.facts.length === expected.length &&
    expected.every((wanted, index) => contract(value.facts[index], wanted)) &&
    JSON.stringify(value.limits) ===
      JSON.stringify([...new Set(warnings), ...requiredLimits])
  );
}
