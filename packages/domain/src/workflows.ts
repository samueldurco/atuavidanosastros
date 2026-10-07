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
export interface ReturnLocationInput {
  city: string; timezone: string; latitude: number; longitude: number; locationSource: string;
}
export interface ImportantDatesInput {
  authorization: 'atv-solar-important-dates/1';
  entries: { date: string; label: string }[];
}
export interface CalendarMarksInput {
  authorization: 'atv-personal-calendar-marks/1';
  entries: { date: string; label: string }[];
}
export interface WorkflowInput {
  version: typeof WORKFLOW_VERSION;
  productId: string;
  presentation?: { version: 'atv-reading-identity/1'; name?: string; city?: string; partnerName?: string; partnerCity?: string };
  consent: { storage: true; policyVersion: 'atv-input-consent/1'; partner: boolean; continuity: boolean };
  birth?: BirthInput;
  partner?: BirthInput;
  targetDate?: string;
  returnYear?: number;
  returnLocation?: ReturnLocationInput;
  importantDates?: ImportantDatesInput;
  calendarMarks?: CalendarMarksInput;
  journey?: { goal: string; startDate: string };
  tarotJourney?: { goal: string };
  atlas?: { priorities: [string, string, string, string] };
  dreamAtlas?: { startDate: string };
  context?: string;
  questions?: string[];
  dream?: { date: string; narrative: string; associations: string[]; emotions: string[] };
}
const object = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const keysOnly = (v: Record<string, unknown>, keys: readonly string[]) => Object.keys(v).every((k) => keys.includes(k));
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
export function validAtlasPriorities(v: unknown): v is [string, string, string, string] {
  if (!Array.isArray(v) || v.length !== 4 ||
      !v.every((item) => text(item, 120) && !/[\u0000-\u001f\u007f-\u009f]/.test(item))) return false;
  return new Set(v.map((item: string) => item.trim().normalize('NFKC').toLocaleLowerCase('pt-BR'))).size === 4;
}
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
function returnLocation(v: unknown): v is ReturnLocationInput {
  return object(v) && keysOnly(v, ['city', 'timezone', 'latitude', 'longitude', 'locationSource']) &&
    text(v.city, 120) && text(v.timezone, 80) && text(v.locationSource, 80) &&
    typeof v.latitude === 'number' && Number.isFinite(v.latitude) && Math.abs(v.latitude) <= 90 &&
    typeof v.longitude === 'number' && Number.isFinite(v.longitude) && Math.abs(v.longitude) <= 180;
}
const strings = (v: unknown, maxItems: number, maxChars: number): v is string[] =>
  Array.isArray(v) && v.length <= maxItems && v.every((item) => text(item, maxChars));
function importantDates(v: unknown, targetDate: unknown): v is ImportantDatesInput {
  if (!object(v) || !keysOnly(v, ['authorization', 'entries']) || Object.keys(v).length !== 2 ||
      v.authorization !== 'atv-solar-important-dates/1' || !Array.isArray(v.entries) ||
      v.entries.length < 1 || v.entries.length > 3 || !validDate(targetDate)) return false;
  const end = `${Number(targetDate.slice(0, 4)) + 1}-${targetDate.slice(5)}`;
  const seen = new Set<string>();
  return v.entries.every((entry) => {
    if (!object(entry) || !keysOnly(entry, ['date', 'label']) || Object.keys(entry).length !== 2 ||
        !validDate(entry.date) || entry.date < targetDate || entry.date > end ||
        !text(entry.label, 80) || /[\u007f-\u009f]/.test(entry.label) || seen.has(entry.date)) return false;
    seen.add(entry.date);
    return true;
  });
}
function calendarMarks(v: unknown, targetDate: unknown): v is CalendarMarksInput {
  if (!object(v) || !keysOnly(v, ['authorization', 'entries']) || Object.keys(v).length !== 2 ||
      v.authorization !== 'atv-personal-calendar-marks/1' || !Array.isArray(v.entries) ||
      v.entries.length < 1 || v.entries.length > 5 || !validDate(targetDate) || targetDate.slice(8) !== '01') return false;
  const nextMonth = new Date(Date.UTC(Number(targetDate.slice(0, 4)), Number(targetDate.slice(5, 7)), 1))
    .toISOString().slice(0, 10);
  const seen = new Set<string>();
  return v.entries.every((entry) => {
    if (!object(entry) || !keysOnly(entry, ['date', 'label']) || Object.keys(entry).length !== 2 ||
        !validDate(entry.date) || entry.date < targetDate || entry.date >= nextMonth ||
        !text(entry.label, 80) || /[\u007f-\u009f]/.test(entry.label) || seen.has(entry.date)) return false;
    seen.add(entry.date);
    return true;
  });
}

/** Structural contract. Engine adapters MUST additionally validate calendar/timezone correspondence. */
export function parseWorkflowInput(v: unknown): WorkflowInput | null {
  if (!object(v) || v.version !== WORKFLOW_VERSION || typeof v.productId !== 'string') return null;
  const product = workflowFor(v.productId);
  if (!product || !object(v.consent) || !keysOnly(v.consent, ['storage', 'policyVersion', 'partner', 'continuity']) ||
      v.consent.storage !== true || v.consent.policyVersion !== 'atv-input-consent/1' ||
      typeof v.consent.partner !== 'boolean' || typeof v.consent.continuity !== 'boolean') return null;
  const fields = ['version', 'productId', 'consent', 'context', 'presentation'];
  if (v.presentation !== undefined && (!object(v.presentation) ||
      !keysOnly(v.presentation, ['version', 'name', 'city', 'partnerName', 'partnerCity']) ||
      v.presentation.version !== 'atv-reading-identity/1' ||
      !['name', 'city', 'partnerName', 'partnerCity'].every((key) => v.presentation &&
        ((v.presentation as Record<string, unknown>)[key] === undefined ||
          (text((v.presentation as Record<string, unknown>)[key], key.endsWith('ity') ? 160 : 80) &&
           !/[\u007f-\u009f]/.test(String((v.presentation as Record<string, unknown>)[key]))))) ||
      (product.kind !== 'relationship' && ('partnerName' in v.presentation || 'partnerCity' in v.presentation)))) return null;
  if (['natal', 'cycles', 'relationship', 'purpose'].includes(product.kind) && product.id !== 'direction-journey') fields.push('birth');
  if (product.id === 'direction-journey') fields.push('journey');
  if (product.id === 'tarot-journey') fields.push('tarotJourney');
  if (product.id === 'life-atlas') fields.push('atlas');
  if (product.id === 'dream-atlas') fields.push('dreamAtlas');
  if (product.kind === 'relationship') fields.push('partner');
  if (product.kind === 'cycles') fields.push('targetDate', ...(product.id === 'solar-return' ? ['returnYear', 'returnLocation', 'importantDates'] : []), ...(product.id === 'personal-calendar' ? ['calendarMarks'] : []));
  if (product.kind === 'tarot') fields.push('questions');
  if (product.kind === 'dream' && product.id !== 'dream-atlas') fields.push('dream');
  if (!keysOnly(v, fields) || (v.context !== undefined && !text(v.context, 1200))) return null;
  if (fields.includes('birth') && !birth(v.birth)) return null;
  if (product.id === 'direction-journey' && (!object(v.journey) ||
      !keysOnly(v.journey, ['goal', 'startDate']) || Object.keys(v.journey).length !== 2 ||
      !text(v.journey.goal, 400) || !validDate(v.journey.startDate) ||
      v.journey.startDate > '2099-12-02')) return null;
  if (product.id === 'tarot-journey' && (!object(v.tarotJourney) ||
      !keysOnly(v.tarotJourney, ['goal']) || Object.keys(v.tarotJourney).length !== 1 ||
      !text(v.tarotJourney.goal, 400) || /[\u007f-\u009f]/.test(v.tarotJourney.goal))) return null;
  if (product.id === 'life-atlas' &&
      (!object(v.atlas) || !keysOnly(v.atlas, ['priorities']) ||
       !validAtlasPriorities(v.atlas.priorities))) return null;
  if (product.id === 'dream-atlas' &&
      (!object(v.dreamAtlas) || !keysOnly(v.dreamAtlas, ['startDate']) ||
       Object.keys(v.dreamAtlas).length !== 1 || !validDate(v.dreamAtlas.startDate) ||
       v.dreamAtlas.startDate > '2099-12-02' || v.consent.continuity)) return null;
  if (product.kind === 'relationship' && (!birth(v.partner) || !v.consent.partner)) return null;
  if (product.kind !== 'relationship' && v.consent.partner) return null;
  if (product.kind === 'cycles' && (!validDate(v.targetDate) ||
      (product.id === 'solar-return' && (!Number.isInteger(v.returnYear) || Number(v.returnYear) < 1901 || Number(v.returnYear) > 2099 ||
        !returnLocation(v.returnLocation) || String(v.targetDate).slice(0, 4) !== String(v.returnYear))))) return null;
  // A calendar request names one complete civil month, never an implicit rolling interval.
  if (product.id === 'personal-calendar' && String(v.targetDate).slice(8) !== '01') return null;
  if (product.id === 'solar-return' && v.importantDates !== undefined && !importantDates(v.importantDates, v.targetDate)) return null;
  if (product.id === 'personal-calendar' && v.calendarMarks !== undefined && !calendarMarks(v.calendarMarks, v.targetDate)) return null;
  if (product.kind === 'tarot' && (!strings(v.questions, 3, 400) ||
      v.questions.length !== (product.id === 'three-questions' ? 3 : 1))) return null;
  if (product.kind === 'dream' && product.id !== 'dream-atlas' &&
      (!object(v.dream) || !keysOnly(v.dream, ['date', 'narrative', 'associations', 'emotions']) ||
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
