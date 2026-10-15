import {
  CAREER_COMPASS_FULL_EDITORIAL_VERSION,
  hasInterpretiveBasis,
  validateFacts,
  type FactsEnvelope,
  type Finding,
  type Reading,
} from "@atv/ai";
import type { AspectCalculation } from "@atv/astrology";
import { parseWorkflowInput, type CalculationSnapshot } from "@atv/domain";
import { validCareerCompassFullBasis } from "./career-compass-full-basis.ts";

/** Private preparation only. Public prepareProductFacts still selects the historical MC profile. */
export function prepareCareerCompassFullFacts(input: unknown, value: unknown):
  | { status: "blocked"; publication: "blocked"; reason: string }
  | { status: "prepared_for_review"; publication: "blocked";
      calculation: CalculationSnapshot; facts: FactsEnvelope } {
  const parsed = parseWorkflowInput(input);
  if (!parsed || !value || typeof value !== "object")
    return { status: "blocked", publication: "blocked", reason: "invalid_input" };
  let coherent = false;
  try { coherent = validCareerCompassFullBasis(parsed, value as CalculationSnapshot); }
  catch { /* Untrusted or malformed capture fails closed. */ }
  if (!coherent)
    return { status: "blocked", publication: "blocked", reason: "calculation_invalid" };
  const calculation = structuredClone(value as CalculationSnapshot);
  const facts: FactsEnvelope = {
    version: "atv-facts/1.0.0",
    capability: "purpose-direction",
    completeness: "complete",
    editorialProfile: CAREER_COMPASS_FULL_EDITORIAL_VERSION,
    facts: structuredClone(calculation.facts),
  };
  if (!validateFacts(facts))
    return { status: "blocked", publication: "blocked", reason: "facts_not_representable" };
  if (!hasInterpretiveBasis(facts))
    return { status: "blocked", publication: "blocked", reason: "insufficient_facts" };
  return { status: "prepared_for_review", publication: "blocked", calculation, facts };
}

/** Checks that an aspect cited by a selected comparison really joins its two
 * positions in the trusted chart. The generic FactsEnvelope contains displays,
 * not structured aspect endpoints, so this check belongs at the worker boundary. */
export function inspectCareerCompassFullGeometry(
  reading: Reading,
  calculation: CalculationSnapshot,
): Finding[] {
  const aspects = (calculation.data.aspects as AspectCalculation).aspects;
  const claims = new Map(reading.claims.map((claim) => [claim.id, claim]));
  const findings: Finding[] = [];
  const pairs = new Set<string>();
  for (const role of ["selected-relation-1", "selected-relation-2", "selected-relation-3"]) {
    const evidence = claims.get(role)?.evidence ?? [];
    const positions = evidence.filter((id) => id.startsWith("position-"));
    if (positions.length !== 2) {
      findings.push({ code: "career_full_selected_pair_invalid", location: `claims.${role}` });
      continue;
    }
    const pair = [...positions].sort().join("|");
    if (pairs.has(pair))
      findings.push({ code: "career_full_selected_pair_duplicate", location: `claims.${role}` });
    pairs.add(pair);
    for (const id of evidence.filter((part) => part.startsWith("career-aspect-"))) {
      const index = /^career-aspect-(0|[1-9]\d*)$/.exec(id)?.[1];
      const aspect = index === undefined ? undefined : aspects[Number(index)];
      if (!aspect || !positions.includes(`position-${aspect.first}`) ||
          !positions.includes(`position-${aspect.second}`))
        findings.push({ code: "career_full_aspect_pair_mismatch", location: `claims.${role}` });
    }
  }
  return findings;
}
