import { productCatalog, type UniverseSlug } from './catalog.ts';

export const WORKFLOW_VERSION = 'atv-workflow/1.0.0';
export type WorkflowKind = 'natal' | 'cycles' | 'relationship' | 'tarot' | 'purpose' | 'dream';
const kinds: Record<UniverseSlug, WorkflowKind> = {
  'meu-ceu': 'natal', 'ciclos-tempo': 'cycles', 'amor-relacoes': 'relationship',
  'tarot-arcanos': 'tarot', 'proposito-prosperidade': 'purpose', 'sonhos-simbolos': 'dream'
};
export const workflows = productCatalog.filter((p) => p.universe !== 'global').map((p) => ({
  ...p, kind: kinds[p.universe as UniverseSlug], version: WORKFLOW_VERSION,
  // All are release-gated; catalog preparation does not authorize processing or sale.
  release: 'blocked' as const
}));
export const workflowFor = (id: string) => workflows.find((p) => p.id === id);

export interface BirthInput {
  localDateTime: string; utcInstant: string; timezone: string;
  latitude: number; longitude: number; locationSource: string;
}
export interface WorkflowInput {
  version: typeof WORKFLOW_VERSION;
  productId: string;
  consent: { storage: true; policyVersion: 'atv-input-consent/1'; partner: boolean; continuity: boolean };
  birth?: BirthInput;
  partner?: BirthInput;
  targetDate?: string;
  returnYear?: number;
  context?: string;
  questions?: string[];
  dream?: { date: string; narrative: string; associations: string[]; emotions: string[] };
}
const object = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const keysOnly = (v: Record<string, unknown>, keys: readonly string[]) => Object.keys(v).every((k) => keys.includes(k));
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
export function validDate(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + 'T00:00:00Z');
  return Number.isFinite(d.valueOf()) && d.toISOString().slice(0, 10) === v && v >= '1900-01-01' && v <= '2099-12-31';
}
function birth(v: unknown): v is BirthInput {
  return object(v) && keysOnly(v, ['localDateTime', 'utcInstant', 'timezone', 'latitude', 'longitude', 'locationSource']) &&
    text(v.localDateTime, 40) && text(v.utcInstant, 40) && text(v.timezone, 80) && text(v.locationSource, 80) &&
    typeof v.latitude === 'number' && Number.isFinite(v.latitude) && Math.abs(v.latitude) <= 90 &&
    typeof v.longitude === 'number' && Number.isFinite(v.longitude) && Math.abs(v.longitude) <= 180;
}
const strings = (v: unknown, maxItems: number, maxChars: number): v is string[] =>
  Array.isArray(v) && v.length <= maxItems && v.every((item) => text(item, maxChars));

/** Structural contract. Engine adapters MUST additionally validate calendar/timezone correspondence. */
export function parseWorkflowInput(v: unknown): WorkflowInput | null {
  if (!object(v) || v.version !== WORKFLOW_VERSION || typeof v.productId !== 'string') return null;
  const product = workflowFor(v.productId);
  if (!product || !object(v.consent) || !keysOnly(v.consent, ['storage', 'policyVersion', 'partner', 'continuity']) ||
      v.consent.storage !== true || v.consent.policyVersion !== 'atv-input-consent/1' ||
      typeof v.consent.partner !== 'boolean' || typeof v.consent.continuity !== 'boolean') return null;
  const fields = ['version', 'productId', 'consent', 'context'];
  if (['natal', 'cycles', 'relationship', 'purpose'].includes(product.kind)) fields.push('birth');
  if (product.kind === 'relationship') fields.push('partner');
  if (product.kind === 'cycles') fields.push('targetDate', ...(product.id === 'solar-return' ? ['returnYear'] : []));
  if (product.kind === 'tarot') fields.push('questions');
  if (product.kind === 'dream') fields.push('dream');
  if (!keysOnly(v, fields) || (v.context !== undefined && !text(v.context, 1200))) return null;
  if (fields.includes('birth') && !birth(v.birth)) return null;
  if (product.kind === 'relationship' && (!birth(v.partner) || !v.consent.partner)) return null;
  if (product.kind !== 'relationship' && v.consent.partner) return null;
  if (product.kind === 'cycles' && (!validDate(v.targetDate) ||
      (product.id === 'solar-return' && (!Number.isInteger(v.returnYear) || Number(v.returnYear) < 1901 || Number(v.returnYear) > 2099)))) return null;
  if (product.kind === 'tarot' && (!strings(v.questions, 3, 400) ||
      v.questions.length !== (product.id === 'three-questions' ? 3 : 1))) return null;
  if (product.kind === 'dream' && (!object(v.dream) || !keysOnly(v.dream, ['date', 'narrative', 'associations', 'emotions']) ||
      !validDate(v.dream.date) || !text(v.dream.narrative, 6000) ||
      !strings(v.dream.associations, 8, 200) || !strings(v.dream.emotions, 8, 80))) return null;
  return structuredClone(v) as unknown as WorkflowInput;
}

export const runStates = ['QUEUED', 'CALCULATED', 'AWAITING_EDITORIAL', 'READY', 'FAILED', 'CANCELLED'] as const;
export type RunState = typeof runStates[number];
export interface ProductRun {
  id: string; productId: string; state: RunState; revision: number;
  parentId: string | null; createdAt: string; updatedAt: string;
  input: WorkflowInput; calculation: CalculationSnapshot | null;
  editorial: EditorialSnapshot | null; errorCode: string | null;
}
export interface CalculationSnapshot {
  version: string; kind: WorkflowKind; status: 'experimental' | 'recorded';
  facts: { id: string; kind: 'calculated' | 'reported' | 'drawn'; display: string; source: string }[];
  data: Record<string, unknown>; limits: string[];
}
export interface EditorialSnapshot {
  version: string; promotionId: string; reviewDigest: string;
  title: string; sections: { title: string; text: string; evidence: string[] }[]; limits: string[];
}
export type RunTransition = { to: RunState; calculation?: CalculationSnapshot; editorial?: EditorialSnapshot; errorCode?: string };
const transitions: Record<RunState, readonly RunState[]> = {
  QUEUED: ['CALCULATED', 'FAILED', 'CANCELLED'], CALCULATED: ['AWAITING_EDITORIAL', 'FAILED', 'CANCELLED'],
  AWAITING_EDITORIAL: ['READY', 'FAILED', 'CANCELLED'], READY: [], FAILED: [], CANCELLED: []
};
/** Pure compare-and-swap guard; repository also enforces authorization and revision atomically. */
export function transitionRun(run: ProductRun, expectedRevision: number, change: RunTransition,
  approvals: { enabled: boolean; engine: boolean; promotionIds: readonly string[] }, at: string): ProductRun {
  if (run.revision !== expectedRevision) throw new Error('stale_revision');
  if (!transitions[run.state].includes(change.to)) throw new Error('invalid_transition');
  if (!Number.isFinite(Date.parse(at)) || at < run.updatedAt) throw new Error('invalid_transition_time');
  const calculation = change.calculation ?? run.calculation;
  const editorial = change.editorial ?? run.editorial;
  const kind = workflowFor(run.productId)?.kind;
  if (run.calculation && change.calculation && JSON.stringify(run.calculation) !== JSON.stringify(change.calculation))
    throw new Error('calculation_immutable');
  if (['CALCULATED', 'AWAITING_EDITORIAL', 'READY'].includes(change.to) && (!calculation ||
      calculation.kind !== kind || !['experimental', 'recorded'].includes(calculation.status) || !calculation.facts.length))
    throw new Error('calculation_required');
  if (change.to === 'READY' && (!approvals.enabled || !calculation || !editorial || !approvals.promotionIds.includes(editorial.promotionId) ||
      ((calculation.status === 'experimental' || !['tarot', 'dream'].includes(kind ?? '')) && !approvals.engine) ||
      !editorial.sections.length || !/^[a-f0-9]{64}$/.test(editorial.reviewDigest)))
    throw new Error('release_evidence_required');
  if (change.to === 'FAILED' && (!change.errorCode || !/^[a-z0-9_]{1,80}$/.test(change.errorCode))) throw new Error('safe_error_required');
  return { ...structuredClone(run), state: change.to, revision: run.revision + 1, updatedAt: at,
    calculation: structuredClone(calculation), editorial: structuredClone(editorial), errorCode: change.errorCode ?? null };
}
