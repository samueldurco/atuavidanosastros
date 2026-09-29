import {
  engineContract,
  bodies,
  assessCrossAspectStability,
  type AspectPolicy,
  type AspectPosition,
} from "@atv/astrology";
import { type CalculationSnapshot } from "@atv/domain";
import { synastryProductContract } from "./synastry-calculators.ts";
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
const canonical = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(canonical)
    : record(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((key) => [key, canonical(v[key])]),
        )
      : v;
const same = (a: unknown, b: unknown) =>
  JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const requiredLimits = [
  "Base parcial experimental, sem homologação do motor, interpretação ou liberação do produto.",
  "Política de aspectos explicitamente injetada; sua aprovação editorial não foi estabelecida por este cálculo.",
  "Aspectos e ausências são nominais; a precisão das duas bases não foi certificada e os cem pares têm estabilidade desconhecida.",
  "Casas, ângulos, aplicação/separação e eventos exatos não foram projetados.",
  "Aspectos entre mapas não calculam score de compatibilidade, sentimentos, gênero, comportamento ou destino da relação.",
  "Consentimento registrado para dados do par não autoriza compartilhar a leitura; identidade e autorização bilateral não foram verificadas.",
];

/** Persisted coherence, not source authentication or engine homologation. Inspect original fact keys. */
function inspectSynastryProjection(value: CalculationSnapshot): boolean {
  const data = value.data;
  if (
    !exact(value, ["version", "kind", "status", "facts", "data", "limits"]) ||
    value.version !== synastryProductContract.version ||
    value.kind !== "relationship" ||
    value.status !== "experimental" ||
    !exact(data, [
      "productId",
      "projection",
      "first",
      "second",
      "crossAspectStability",
      "consent",
      "sharing",
      "events",
      "compatibilityScore",
    ]) ||
    data.productId !== "synastry" ||
    !contract(data.projection, synastryProductContract) ||
    !exact(data.consent, ["storage", "partner", "policyVersion"]) ||
    data.consent.storage !== true ||
    data.consent.partner !== true ||
    data.consent.policyVersion !== "atv-input-consent/1" ||
    data.sharing !== "not-authorized" ||
    data.compatibilityScore !== null ||
    !Array.isArray(data.events) ||
    data.events.length ||
    !Array.isArray(value.facts) ||
    !Array.isArray(value.limits)
  )
    return false;
  const expected: CalculationSnapshot["facts"] = [];
  const warnings: string[] = [];
  for (const [side, role, label] of [
    ["first", "person-a", "Pessoa A"],
    ["second", "person-b", "Pessoa B"],
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
      )
    )
      return false;
    warnings.push(...(provenance.warnings as string[]));
    const source = `${provenance.provider}@${provenance.providerVersion};${provenance.algorithmVersion};${synastryProductContract.version}`;
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
  const original = data.crossAspectStability;
  if (!record(original) || !record(original.calculation)) return false;
  const first = (data.first as Record<string, unknown>)
    .positions as AspectPosition[];
  const second = (data.second as Record<string, unknown>)
    .positions as AspectPosition[];
  const calculated = assessCrossAspectStability(
    first,
    second,
    original.calculation.policy as AspectPolicy,
    { first: null, second: null },
  );
  // Recompute the complete geometry and uncertainty object; equality includes original keys and all 100 pairs.
  if (!same(original, calculated)) return false;
  const geometry = calculated.calculation;
  const source = `${geometry.algorithmVersion};${calculated.algorithmVersion};${geometry.policy.id}@${geometry.policy.version};${synastryProductContract.version}`;
  const labels = {
    conjunction: "conjunção",
    sextile: "sextil",
    square: "quadratura",
    trine: "trígono",
    opposition: "oposição",
  };
  for (const pair of calculated.pairs) {
    const a = first.find((p) => p.body === pair.first)!,
      b = second.find((p) => p.body === pair.second)!;
    const difference = Math.abs(a.longitude - b.longitude),
      separation = Math.min(difference, 360 - difference);
    const aspect = geometry.aspects.find(
      (p) => p.first === pair.first && p.second === pair.second,
    );
    expected.push({
      id: `cross-${pair.first}-${pair.second}`,
      kind: "calculated",
      display:
        `Pessoa A · ${bodyLabels[pair.first]} / Pessoa B · ${bodyLabels[pair.second]}: separação nominal ${separation.toFixed(6)}°; ` +
        (aspect
          ? `${labels[aspect.kind]}, desvio nominal ${aspect.orbDegrees.toFixed(6)}°.`
          : "nenhum aspecto da política dentro do orbe nominal.") +
        " Precisão não certificada; estabilidade desconhecida.",
      source,
    });
  }
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

/** Coherence only: no policy authentication, editorial approval or measured accuracy. */
export function validSynastryProjection(value: CalculationSnapshot): boolean {
  try {
    return inspectSynastryProjection(value);
  } catch {
    return false;
  }
}
