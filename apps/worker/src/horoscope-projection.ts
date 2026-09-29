import {
  assessCrossAspectStability,
  type AspectPolicy,
  type AspectPosition,
  type MajorAspect,
} from "@atv/astrology";
import type { CalculationSnapshot } from "@atv/domain";
import { contextProductContract } from "./context-calculators.ts";
import { validDateReadingProjection } from "./date-reading-projection.ts";
import { bodyLabels } from "./natal-calculators.ts";

export const horoscopeProductContract = Object.freeze({
  version: "atv-horoscope-calculation/1.0.0",
  productId: "horoscope",
  completeness: "partial",
  status: "experimental",
  baseContract: contextProductContract.version,
  sampling: "one-instant-at-12:00:00Z/not-local-day/not-event-search",
  geometry: "nominal-tropical-longitude-difference/no-common-epoch-transform",
  policyApproval: "not-established",
  inputPrecision: "not-certified",
  interpretation: "not-produced",
  generalSignContent: "not-produced",
  recurrence: "not-produced",
});

export const horoscopeRoleMapping = Object.freeze({
  first: "transit-sample",
  second: "natal",
  genericFirst: "person-a",
  genericSecond: "person-b",
});

export const horoscopeLimits = Object.freeze([
  "Horóscopo: base personalizada parcial de uma única amostra; conteúdo geral dos doze signos, recorrência diária/semanal/mensal e alertas não foram produzidos.",
  "A base interna preserva o contrato da Leitura da Data, sem aspectos. A composição externa acrescenta somente diferenças nominais de longitude entre amostra e mapa natal; não representa duas pessoas.",
  "As coordenadas tropicais são de datas distintas, sem transformação para época comum. A diferença nominal não certifica separação angular física, precisão de trânsito ou homologação do motor.",
  "Política de aspectos explicitamente injetada, sem aprovação editorial estabelecida. Todos os cem pares, incluindo ausências nominais, conservam precisão não certificada e estabilidade desconhecida.",
]);

const aspectLabels: Record<MajorAspect, string> = {
  conjunction: "conjunção",
  sextile: "sextil",
  square: "quadratura",
  trine: "trígono",
  opposition: "oposição",
};

/** Pure composition of an already checked date sample; never calls an ephemeris. */
export function projectHoroscope(
  base: CalculationSnapshot,
  policy: AspectPolicy,
): CalculationSnapshot {
  if (!validDateReadingProjection(base)) throw new Error("invalid_date_basis");
  const natal = base.data.first as { positions: AspectPosition[] };
  const sample = base.data.second as { positions: AspectPosition[] };
  const stability = assessCrossAspectStability(
    sample.positions,
    natal.positions,
    policy,
    { first: null, second: null },
  );
  const geometry = stability.calculation;
  const source = `${geometry.algorithmVersion};${stability.algorithmVersion};${geometry.policy.id}@${geometry.policy.version};${horoscopeProductContract.version}`;
  const facts = structuredClone(
    base.facts.filter((fact) => fact.id !== "personal-context"),
  );
  for (const pair of stability.pairs) {
    const a = sample.positions.find((p) => p.body === pair.first)!;
    const b = natal.positions.find((p) => p.body === pair.second)!;
    const difference = Math.abs(a.longitude - b.longitude);
    const separation = Math.min(difference, 360 - difference);
    const aspect = geometry.aspects.find(
      (p) => p.first === pair.first && p.second === pair.second,
    );
    facts.push({
      id: `transit-${pair.first}-natal-${pair.second}`,
      kind: "calculated",
      display:
        `Amostra · ${bodyLabels[pair.first]} / Natal · ${bodyLabels[pair.second]}: diferença nominal de longitude ${separation.toFixed(6)}°; ` +
        (aspect
          ? `${aspectLabels[aspect.kind]}, desvio nominal ${aspect.orbDegrees.toFixed(6)}°.`
          : "nenhum aspecto da política dentro do orbe nominal.") +
        " Precisão não certificada; estabilidade desconhecida.",
      source,
    });
  }
  const context = base.facts.find((fact) => fact.id === "personal-context");
  if (context) facts.push(structuredClone(context));
  return {
    version: horoscopeProductContract.version,
    kind: "cycles",
    status: "experimental",
    facts,
    data: {
      productId: "horoscope",
      projection: horoscopeProductContract,
      base: structuredClone(base),
      roleMapping: horoscopeRoleMapping,
      crossAspectStability: stability,
    },
    limits: [...base.limits, ...horoscopeLimits],
  };
}

const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const exact = (v: Record<string, unknown>, keys: string[]) =>
  Object.keys(v).length === keys.length &&
  keys.every((key) => Object.hasOwn(v, key));
function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (record(v))
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((key) => [key, canonical(v[key])]),
    );
  return v;
}
const same = (a: unknown, b: unknown) =>
  JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

/** Original persisted keys, roles and full geometry; coherence is not source authentication. */
export function validHoroscopeProjection(value: CalculationSnapshot): boolean {
  try {
    if (
      !record(value) ||
      !exact(value, ["version", "kind", "status", "facts", "data", "limits"]) ||
      !record(value.data) ||
      !exact(value.data, [
        "productId",
        "projection",
        "base",
        "roleMapping",
        "crossAspectStability",
      ]) ||
      !record(value.data.crossAspectStability) ||
      !record(value.data.crossAspectStability.calculation)
    )
      return false;
    const expected = projectHoroscope(
      value.data.base as CalculationSnapshot,
      value.data.crossAspectStability.calculation.policy as AspectPolicy,
    );
    return same(value, expected);
  } catch {
    return false;
  }
}
