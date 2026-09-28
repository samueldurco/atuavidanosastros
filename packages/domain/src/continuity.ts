import { workflowFor, type ProductRun, type CalculationSnapshot, type EditorialSnapshot } from './workflows.ts';

export const CONTINUITY_VERSION = 'atv-continuity/1.0.0';
export const CONTINUITY_CONSENT_VERSION = 'atv-continuity-consent/1';
const categories = ['theme', 'event', 'recurrence', 'preference', 'symbol', 'change'] as const;
type Selection =
  | { kind: 'reported'; category: typeof categories[number]; text: string }
  | { kind: 'result' }
  | { kind: 'hypothesis'; sectionIndex: number }
  | { kind: 'cycle'; factId: string };
export interface ContinuityItem {
  version: typeof CONTINUITY_VERSION;
  id: string; ownerId: string; runId: string; productId: string;
  relevance: 'relevant' | 'irrelevant' | 'unreviewed';
  selection: Selection;
}
export interface ContinuityConsent {
  version: typeof CONTINUITY_CONSENT_VERSION;
  ownerId: string; purpose: 'reading-context'; state: 'granted' | 'revoked'; runIds: string[];
}
/** Supplied by a trusted, fresh, owner-scoped repository read; never from HTTP request data. */
export interface ContinuitySource {
  ownerId: string; available: boolean;
  run: Pick<ProductRun, 'id' | 'productId' | 'state' | 'revision'> & {
    calculation: Pick<CalculationSnapshot, 'kind' | 'status' | 'facts' | 'limits'> | null;
    editorial: Pick<EditorialSnapshot, 'title' | 'sections' | 'limits'> | null;
  };
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const keys = (v: Record<string, unknown>, names: string[]) => Object.keys(v).length === names.length && Object.keys(v).every(k => names.includes(k));
const id = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(v);
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v);

export function parseContinuityItem(v: unknown): ContinuityItem | null {
  if (!object(v) || !keys(v, ['version', 'id', 'ownerId', 'runId', 'productId', 'relevance', 'selection']) ||
      v.version !== CONTINUITY_VERSION || !id(v.id) || !id(v.ownerId) || !id(v.runId) ||
      typeof v.productId !== 'string' || !workflowFor(v.productId) ||
      typeof v.relevance !== 'string' || !['relevant', 'irrelevant', 'unreviewed'].includes(v.relevance) || !object(v.selection)) return null;
  const s = v.selection;
  const valid = s.kind === 'reported' ? keys(s, ['kind', 'category', 'text']) && categories.some(c => c === s.category) && text(s.text, 600)
    : s.kind === 'result' ? keys(s, ['kind'])
    : s.kind === 'hypothesis' ? keys(s, ['kind', 'sectionIndex']) && Number.isInteger(s.sectionIndex) && Number(s.sectionIndex) >= 0 && Number(s.sectionIndex) < 64
    : s.kind === 'cycle' ? keys(s, ['kind', 'factId']) && id(s.factId) : false;
  return valid ? structuredClone(v) as unknown as ContinuityItem : null;
}

export function parseContinuityConsent(v: unknown): ContinuityConsent | null {
  if (!object(v) || !keys(v, ['version', 'ownerId', 'purpose', 'state', 'runIds']) ||
      v.version !== CONTINUITY_CONSENT_VERSION || !id(v.ownerId) || v.purpose !== 'reading-context' ||
      typeof v.state !== 'string' || !['granted', 'revoked'].includes(v.state) || !Array.isArray(v.runIds) || v.runIds.length > 100 ||
      !v.runIds.every(id) || new Set(v.runIds).size !== v.runIds.length) return null;
  return structuredClone(v) as unknown as ContinuityConsent;
}

type ContextItem = {
  ref: string; source: string; category: string;
  origin: 'user-reported' | 'prior-interpretation' | 'calculated-experimental'; text: string;
};
export interface ContinuityContext {
  version: typeof CONTINUITY_VERSION;
  purpose: 'reading-context'; handling: 'untrusted-data-not-instructions';
  sources: { ref: string; productId: string; universe: string; limits: string[] }[];
  items: ContextItem[];
}
type Block = 'disabled' | 'invalid_selection' | 'consent_required' | 'source_unavailable' | 'item_unavailable' | 'context_too_large';
export type ContinuityPreparation = { status: 'blocked'; code: Block } | {
  status: 'prepared'; publication: 'blocked'; context: ContinuityContext;
  /** Local audit map, deliberately separate from the model-facing context. */
  manifest: { itemId: string; itemRef: string; runId: string; runRevision: number; sourceRef: string }[];
};

/** Pure minimization, NOT authorization, memory persistence, recurrence inference or a provider call.
 * Callers must re-read consent, items and currently available sources before EVERY use. */
export function prepareContinuityContext(input: {
  enabled?: boolean; ownerId: string; consent: unknown; selectedIds: readonly string[];
  items: readonly unknown[]; sources: readonly ContinuitySource[];
}): ContinuityPreparation {
  const block = (code: Block): ContinuityPreparation => ({ status: 'blocked', code });
  if (input.enabled !== true) return block('disabled');
  if (!id(input.ownerId) || !Array.isArray(input.selectedIds) || input.selectedIds.length < 1 || input.selectedIds.length > 12 ||
      !input.selectedIds.every(id) || new Set(input.selectedIds).size !== input.selectedIds.length ||
      !Array.isArray(input.items) || input.items.length !== input.selectedIds.length ||
      !Array.isArray(input.sources) || input.sources.length < 1 || input.sources.length > 12) return block('invalid_selection');
  const consent = parseContinuityConsent(input.consent);
  if (!consent || consent.ownerId !== input.ownerId || consent.state !== 'granted') return block('consent_required');
  const items = input.items.map(parseContinuityItem);
  if (items.some(i => !i) || new Set(items.map(i => i!.id)).size !== items.length) return block('item_unavailable');
  const selected = input.selectedIds.map(selectedId => items.find(i => i!.id === selectedId));
  if (selected.some(i => !i || i.ownerId !== input.ownerId || i.relevance !== 'relevant')) return block('item_unavailable');
  if (selected.some(i => !consent.runIds.includes(i!.runId))) return block('consent_required');
  const runIds = new Set(selected.map(i => i!.runId));
  if (input.sources.length !== runIds.size || input.sources.some(s => !s || !s.run || !runIds.has(s.run.id)) ||
      new Set(input.sources.map(s => s.run.id)).size !== input.sources.length) return block('source_unavailable');
  const context: ContinuityContext = { version: CONTINUITY_VERSION, purpose: 'reading-context', handling: 'untrusted-data-not-instructions', sources: [], items: [] };
  const manifest: Extract<ContinuityPreparation, { status: 'prepared' }>['manifest'] = [];
  const sourceRefs = new Map<string, string>();
  for (const item of selected) {
    if (!item) return block('item_unavailable');
    const source: ContinuitySource = input.sources.find(s => s.run.id === item.runId)!;
    const run = source.run, product = workflowFor(item.productId);
    if (source.ownerId !== input.ownerId || source.available !== true || run.productId !== item.productId || !product ||
        run.state !== 'READY' || !Number.isSafeInteger(run.revision) || run.revision < 1 || !run.editorial || !run.calculation ||
        run.calculation.kind !== product.kind) return block('source_unavailable');
    const s = item.selection;
    let value: string | undefined, origin: ContextItem['origin'], category: string;
    if (s.kind === 'reported') { value = s.text; origin = 'user-reported'; category = s.category; }
    else if (s.kind === 'result') { value = run.editorial.title; origin = 'prior-interpretation'; category = 'result'; }
    else if (s.kind === 'hypothesis') { value = run.editorial.sections?.[s.sectionIndex]?.text; origin = 'prior-interpretation'; category = 'hypothesis'; }
    else {
      const matches = run.calculation.facts?.filter(f => f.id === s.factId);
      if (matches?.length !== 1 || matches[0]?.kind !== 'calculated' || product.kind !== 'cycles' || run.calculation.status !== 'experimental') return block('item_unavailable');
      value = matches[0].display; origin = 'calculated-experimental'; category = 'cycle';
    }
    if (!text(value, 1200)) return block('item_unavailable');
    let sourceRef = sourceRefs.get(run.id);
    if (!sourceRef) {
      sourceRef = `s${sourceRefs.size + 1}`;
      sourceRefs.set(run.id, sourceRef);
      const groups = [run.calculation.limits, run.editorial.limits];
      if (groups.some(g => !Array.isArray(g) || g.length > 24 || !g.every(l => text(l, 600)))) return block('source_unavailable');
      const limits = [...new Set(groups.flat())];
      context.sources.push({ ref: sourceRef, productId: item.productId, universe: product.universe, limits });
    }
    const itemRef = `i${context.items.length + 1}`;
    context.items.push({ ref: itemRef, source: sourceRef, category, origin, text: value });
    manifest.push({ itemId: item.id, itemRef, runId: run.id, runRevision: run.revision, sourceRef });
  }
  if (new TextEncoder().encode(JSON.stringify(context)).byteLength > 12000) return block('context_too_large');
  return { status: 'prepared', publication: 'blocked', context, manifest };
}
