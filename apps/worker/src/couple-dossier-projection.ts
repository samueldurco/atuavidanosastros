import type { CalculationSnapshot } from "@atv/domain";
import { synastryProductContract } from "./synastry-calculators.ts";
import { validSynastryProjection } from "./synastry-projection.ts";

export const coupleDossierProductContract = Object.freeze({
  version: "atv-couple-dossier-calculation/1.0.0",
  productId: "couple-dossier",
  completeness: "partial",
  status: "experimental",
  baseContract: synastryProductContract.version,
  interpretation: "not-produced",
  continuity: "not-consulted",
});

export const coupleDossierLimit =
  "Dossiê do Casal: composição parcial experimental da base de Sinastria; leitura própria, síntese e continuidade não foram produzidas ou consultadas.";

const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const exact = (v: Record<string, unknown>, keys: string[]) =>
  Object.keys(v).length === keys.length && keys.every((key) => key in v);
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

/** Retains the original base contract and provenance instead of relabelling its facts. */
export function validCoupleDossierProjection(v: CalculationSnapshot): boolean {
  try {
    if (
      !record(v) ||
      !exact(v, ["version", "kind", "status", "facts", "data", "limits"]) ||
      v.version !== coupleDossierProductContract.version ||
      v.kind !== "relationship" ||
      v.status !== "experimental" ||
      !record(v.data) ||
      !exact(v.data, ["productId", "projection", "base"]) ||
      v.data.productId !== "couple-dossier" ||
      !record(v.data.projection) ||
      !exact(v.data.projection, Object.keys(coupleDossierProductContract)) ||
      !Array.isArray(v.facts) ||
      !v.facts.every(
        (fact) =>
          record(fact) && exact(fact, ["id", "kind", "display", "source"]),
      ) ||
      !same(v.data.projection, coupleDossierProductContract)
    )
      return false;
    const base = v.data.base as CalculationSnapshot;
    return (
      validSynastryProjection(base) &&
      same(v.facts, base.facts) &&
      same(v.limits, [...base.limits, coupleDossierLimit])
    );
  } catch {
    return false;
  }
}
