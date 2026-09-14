import { parseWorkflowInput, workflowFor, type WorkflowInput, type CalculationSnapshot } from '@atv/domain';

type SafeFailure = 'transient_failure' | 'deadline_exceeded' | 'input_invalid' | 'calculation_invalid';
type Outcome = 'idle' | 'calculated' | 'awaiting_editorial' | 'retry' | 'failed' | 'exhausted' | 'lease_lost' | 'unavailable';
type Receipt = { state: 'QUEUED' | 'CALCULATED' | 'AWAITING_EDITORIAL' | 'FAILED'; revision: number };
type Claim = { status: 'claimed'; runId: string; productId: string; token: string; revision: number;
  state: 'QUEUED' | 'CALCULATED'; input: unknown; calculation: unknown; attempt: number; leaseUntil: string };
type ClaimResult = Claim | { status: 'exhausted'; runId: string } | null;
export type WorkflowRpc = (name: 'claim_product_run_work' | 'complete_product_run_work' | 'fail_product_run_work',
  args: Record<string, unknown>, signal: AbortSignal) => Promise<unknown>;
export interface WorkflowRepository {
  claim(products: string[], signal: AbortSignal): Promise<ClaimResult>;
  complete(claim: Claim, calculation: CalculationSnapshot | null, signal: AbortSignal): Promise<Receipt>;
  fail(claim: Claim, code: SafeFailure, signal: AbortSignal): Promise<Receipt>;
}
export type ProductCalculator = (input: WorkflowInput, context: { runId: string; signal: AbortSignal }) => Promise<unknown>;
export type ProcessingEvent = { event: 'product.processing'; outcome: Outcome; durationMs: number; attempt: number };
export class ProcessingError extends Error {
  readonly code: SafeFailure | 'lease_lost' | 'unavailable';
  constructor(code: SafeFailure | 'lease_lost' | 'unavailable') { super(code); this.code = code; }
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const text = (v: unknown, max: number): v is string => typeof v === 'string' && !!v.trim() && v.length <= max;
const strings = (v: unknown, count: number, size: number): v is string[] => Array.isArray(v) && v.length <= count && v.every(x => text(x, size));
const revision = (v: unknown): v is number => Number.isInteger(v) && Number(v) >= 1 && Number(v) <= 8;
function jsonValue(v: unknown, depth = 0): boolean {
  if (depth > 32) return false;
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(x => jsonValue(x, depth + 1));
  return object(v) && Object.getPrototypeOf(v) === Object.prototype &&
    Object.values(v).every(x => jsonValue(x, depth + 1));
}

function parseClaim(v: unknown): ClaimResult {
  if (v === null) return null;
  if (!object(v) || !uuid(v.runId)) throw new ProcessingError('unavailable');
  if (v.status === 'exhausted') return { status: 'exhausted', runId: v.runId };
  if (v.status !== 'claimed' || !text(v.productId, 80) || !workflowFor(v.productId) || !uuid(v.token) ||
      !revision(v.revision) || !['QUEUED', 'CALCULATED'].includes(String(v.state)) ||
      !Number.isInteger(v.attempt) || Number(v.attempt) < 1 || Number(v.attempt) > 5 ||
      !text(v.leaseUntil, 40) || !Number.isFinite(Date.parse(v.leaseUntil))) throw new ProcessingError('unavailable');
  return { status: 'claimed', runId: v.runId, productId: v.productId, token: v.token,
    revision: v.revision, state: v.state as Claim['state'], input: v.input, calculation: v.calculation,
    attempt: Number(v.attempt), leaseUntil: v.leaseUntil };
}
function parseReceipt(v: unknown): Receipt {
  if (!object(v) || !revision(v.revision) || !['QUEUED','CALCULATED','AWAITING_EDITORIAL','FAILED'].includes(String(v.state)))
    throw new ProcessingError('unavailable');
  return { state: v.state as Receipt['state'], revision: v.revision };
}

/** Inject a service-only RPC transport that respects AbortSignal and returns data, never raw errors.
 * No service credentials, network endpoints or Cloudflare bindings are owned by this portable processor. */
export function createWorkflowRepository(rpc: WorkflowRpc): WorkflowRepository {
  return {
    async claim(products, signal) {
      return parseClaim(await rpc('claim_product_run_work', { p_products: products, p_lease_seconds: 60 }, signal));
    },
    async complete(claim, calculation, signal) {
      return parseReceipt(await rpc('complete_product_run_work', { p_id: claim.runId, p_token: claim.token,
        p_revision: claim.revision, p_calculation: calculation }, signal));
    },
    async fail(claim, code, signal) {
      return parseReceipt(await rpc('fail_product_run_work', { p_id: claim.runId, p_token: claim.token, p_error_code: code }, signal));
    }
  };
}

/** Bounded evidence contract, not scientific or editorial approval. */
export function validateCalculation(v: unknown, productId: string): CalculationSnapshot | null {
  try {
    const kind = workflowFor(productId)?.kind;
    if (!object(v) || !text(v.version, 100) || v.kind !== kind || !['experimental', 'recorded'].includes(String(v.status)) ||
        !object(v.data) || !jsonValue(v.data) || !strings(v.limits, 32, 1200) || !Array.isArray(v.facts) || !v.facts.length || v.facts.length > 400 ||
        new TextEncoder().encode(JSON.stringify(v)).length > 200000) return null;
    // Astronomical outputs never become approved merely by setting status to recorded.
    if (!['tarot', 'dream'].includes(kind ?? '') && v.status !== 'experimental') return null;
    const ids = new Set<string>();
    const facts: CalculationSnapshot['facts'] = [];
    for (const f of v.facts) {
      if (!object(f) || !text(f.id, 100) || ids.has(f.id) || !['calculated','reported','drawn'].includes(String(f.kind)) ||
          !text(f.display, 2000) || !text(f.source, 300)) return null;
      ids.add(f.id);
      facts.push({ id: f.id, kind: f.kind as CalculationSnapshot['facts'][number]['kind'], display: f.display, source: f.source });
    }
    return structuredClone({ version: v.version, kind: kind!, status: v.status as CalculationSnapshot['status'],
      facts, data: v.data, limits: v.limits });
  } catch { return null; }
}

/** One bounded step per invocation; no loop, paid call, editorial generation or publication path. */
export async function processNextProductRun(repository: WorkflowRepository, calculators: Readonly<Record<string, ProductCalculator>>,
  options: { timeoutMs?: number; emit?: (event: ProcessingEvent) => void } = {}): Promise<Outcome> {
  const started = performance.now();
  const timeoutMs = options.timeoutMs ?? 20000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 25000) throw new Error('invalid_processing_deadline');
  const controller = new AbortController();
  let claim: Claim | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const products = Object.keys(calculators).filter(id => workflowFor(id));
  let outcome: Outcome = 'unavailable';
  const task = async (): Promise<Outcome> => {
    if (!products.length) return 'idle';
    const result = await repository.claim(products, controller.signal);
    // A late claim response may arrive after timeout. Do not start a calculation; the lease will expire.
    controller.signal.throwIfAborted();
    if (!result) return 'idle';
    if (result.status === 'exhausted') return 'exhausted';
    claim = result;
    if (!products.includes(claim.productId)) throw new ProcessingError('unavailable');
    const input = parseWorkflowInput(claim.input);
    if (!input || input.productId !== claim.productId) throw new ProcessingError('input_invalid');
    let calculation: CalculationSnapshot | null = null;
    if (claim.state === 'QUEUED') {
      const calculator = calculators[claim.productId];
      if (!calculator) throw new ProcessingError('unavailable');
      calculation = validateCalculation(await calculator(input, { runId: claim.runId, signal: controller.signal }), claim.productId);
      controller.signal.throwIfAborted();
      if (!calculation) throw new ProcessingError('calculation_invalid');
    } else if (!validateCalculation(claim.calculation, claim.productId)) throw new ProcessingError('calculation_invalid');
    const resultState = await repository.complete(claim, calculation, controller.signal);
    controller.signal.throwIfAborted();
    return resultState.state === 'CALCULATED' ? 'calculated' : resultState.state === 'AWAITING_EDITORIAL' ? 'awaiting_editorial' : 'unavailable';
  };
  try {
    outcome = await Promise.race([task(), new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new ProcessingError('deadline_exceeded')); }, timeoutMs);
    })]);
  } catch (error) {
    const code = controller.signal.aborted ? 'deadline_exceeded' : error instanceof ProcessingError ? error.code : 'transient_failure';
    if (code === 'lease_lost') outcome = 'lease_lost';
    else if (claim && code !== 'unavailable') {
      // A separate, bounded cleanup attempt. If it fails, durable lease expiry handles recovery.
      const cleanup = new AbortController();
      let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        const receipt = await Promise.race([repository.fail(claim, code, cleanup.signal), new Promise<never>((_, reject) => {
          cleanupTimer = setTimeout(() => { cleanup.abort(); reject(new ProcessingError('unavailable')); }, 3000);
        })]);
        outcome = receipt.state === 'FAILED' ? 'failed' : receipt.state === 'AWAITING_EDITORIAL' ? 'awaiting_editorial' : 'retry';
      } catch { outcome = 'unavailable'; }
      finally { clearTimeout(cleanupTimer); }
    } else outcome = 'unavailable';
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
  // Explicit allowlist: no owner, run ID, input, output, token or provider error in telemetry.
  try { options.emit?.({ event: 'product.processing', outcome, durationMs: Math.max(0, Math.round(performance.now() - started)),
    attempt: claim ? (claim as Claim).attempt : 0 }); } catch { /* Metrics never decide workflow state. */ }
  return outcome;
}
