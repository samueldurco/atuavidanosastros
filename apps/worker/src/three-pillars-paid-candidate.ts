import type { CalculationSnapshot, EditorialSnapshot } from '@atv/domain';
import { validateCalculation } from './product-processing.ts';
import { inspectThreePillarsFullProjection } from './natal-calculators.ts';

/** Transport only. This version grants no editorial approval, promotion or release authority. */
export const threePillarsPaidCandidateContract = Object.freeze({
  version: 'atv-three-pillars-paid-candidate/1.0.0',
  calculationVersion: 'atv-three-pillars-product-calculation/2.0.0',
  projectionVersion: 'atv-private-three-pillars/5.0.0',
  readingVersion: 'atv-three-pillars-editorial/5.1.0',
  chapterCount: 11,
  publication: 'blocked'
});

type Section = EditorialSnapshot['sections'][number];
type Content = Omit<EditorialSnapshot, 'promotionId' | 'reviewDigest'>;
export type ThreePillarsPaidCandidate = {
  status: 'unverified_candidate';
  publication: 'blocked';
  reason: 'paid_origin_editorial_delivery_review_and_promotion_required';
  content: Content;
};
type Reading = {
  version: string;
  productId: string;
  title: string;
  opening: string;
  source: string;
  sections: { title: string; text: string; factIds: string[] }[];
  questions: string[];
  practice: string;
  limits: string[];
  editorial: { version: string };
};

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const strings = (value: unknown, count: number, max: number): value is string[] =>
  Array.isArray(value) && value.length <= count && value.every(item => text(item, max));
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

function parseReading(value: unknown, facts: Set<string>): Reading | null {
  if (!record(value) || value.version !== threePillarsPaidCandidateContract.readingVersion ||
      value.productId !== 'three-pillars' || !text(value.title, 240) ||
      !text(value.opening, 20000) || !text(value.source, 20000) ||
      !text(value.practice, 20000) || !strings(value.questions, 8, 2000) ||
      !strings(value.limits, 32, 1200) || !record(value.editorial) ||
      value.editorial.version !== value.version || !Array.isArray(value.sections) ||
      value.sections.length !== threePillarsPaidCandidateContract.chapterCount) return null;
  for (const section of value.sections) {
    if (!record(section) || !text(section.title, 240) || !text(section.text, 20000) ||
        !strings(section.factIds, 100, 160) || !section.factIds.length ||
        new Set(section.factIds).size !== section.factIds.length ||
        section.factIds.some(id => !facts.has(id))) return null;
  }
  return value as Reading;
}

/**
 * Preserve the v5.1 reading as a bounded, evidence-linked paid draft. A separate adapter must
 * authenticate the provider replay and v5.1 composition before calling this projector; this
 * function deliberately cannot approve, promote, persist or publish its output.
 */
export function stageThreePillarsPaidCandidate(
  full: CalculationSnapshot,
  projected: CalculationSnapshot,
  reading: unknown
): ThreePillarsPaidCandidate | null {
  if (inspectThreePillarsFullProjection(full) !== 'available' ||
      !validateCalculation(projected, 'three-pillars') ||
      projected.version !== threePillarsPaidCandidateContract.projectionVersion ||
      projected.status !== 'experimental' || projected.kind !== 'natal' ||
      !record(projected.data) || projected.data.productId !== 'three-pillars' ||
      !same(projected.data.natal, full.data.natal) ||
      projected.facts.length < full.facts.length ||
      !full.facts.every((fact, index) => same(fact, projected.facts[index]))) return null;
  const ids = new Set(projected.facts.map(fact => fact.id));
  const parsed = parseReading(reading, ids);
  if (!parsed || !same(parsed.limits, projected.limits)) return null;
  const chapters: Section[] = parsed.sections.map(section => ({
    title: section.title, text: section.text, evidence: [...section.factIds]
  }));
  const core = [...new Set(chapters.slice(0, 3).flatMap(section => section.evidence))];
  const experiment = chapters[8]?.evidence;
  const sections: Section[] = [
    { title: 'Abertura', text: parsed.opening, evidence: core },
    ...chapters,
    { title: 'Perguntas para observar', text: parsed.questions.join('\n\n'), evidence: core },
    { title: 'Prática de observação', text: parsed.practice, evidence: experiment ?? core },
    { title: 'Método e fonte', text: parsed.source, evidence: core }
  ];
  if (sections.some(section => !text(section.text, 20000) || !section.evidence.length ||
      section.evidence.length > 100) || sections.length > 40) return null;
  const content: Content = {
    version: threePillarsPaidCandidateContract.version,
    title: parsed.title,
    sections,
    limits: [...parsed.limits]
  };
  if (new TextEncoder().encode(JSON.stringify(content)).length > 90000) return null;
  return {
    status: 'unverified_candidate',
    publication: 'blocked',
    reason: 'paid_origin_editorial_delivery_review_and_promotion_required',
    content
  };
}
