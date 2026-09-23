import { workflows } from '@atv/domain';

export type PublicationRpc = (
  name: 'claim_product_editorial' | 'complete_product_editorial',
  args: Record<string, unknown>,
  signal: AbortSignal,
) => Promise<unknown>;
export type PublicationOutcome = 'idle' | 'published' | 'unavailable' | 'cancelled'
  | 'deadline_exceeded' | 'publication_uncertain' | 'busy';
export type PublicationEvent = Readonly<{
  event: 'product.publication'; outcome: PublicationOutcome; durationMs: number;
}>;
type Claim = { runId: string; receiptId: string; token: string; revision: number; leaseUntil: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function exact(value: unknown, keys: string[]): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));
}
function parseClaim(value: unknown): Claim {
  if (!exact(value, ['runId', 'receiptId', 'token', 'revision', 'leaseUntil'])
    || !['runId', 'receiptId', 'token'].every(k => typeof value[k] === 'string' && uuid.test(value[k] as string))
    || !Number.isInteger(value.revision) || (value.revision as number) < 1 || (value.revision as number) > 7
    || typeof value.leaseUntil !== 'string' || value.leaseUntil.length > 64
    || !(Date.parse(value.leaseUntil) > Date.now())) throw new Error('invalid_claim');
  // Capture only validated scalars; never retain a mutable transport response.
  return { runId: value.runId as string, receiptId: value.receiptId as string, token: value.token as string,
    revision: value.revision as number, leaseUntil: value.leaseUntil };
}

/** Portable, server-only orchestration. No transport, issuer, provider or scheduler is installed here. */
export function createProductPublisher(rpc: PublicationRpc, options: {
  enabledProducts?: readonly string[]; timeoutMs?: number; emit?: (event: PublicationEvent) => void;
} = {}) {
  const selected = options.enabledProducts ?? [];
  const known = new Set(workflows.map(w => w.id));
  if (!Array.isArray(selected) || selected.length > 25 || new Set(selected).size !== selected.length
    || selected.some(p => !known.has(p))) throw new Error('invalid_product_configuration');
  const products = Object.freeze([...selected]);
  const timeoutMs = options.timeoutMs ?? 20_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 25_000) throw new Error('invalid_publication_deadline');
  const emit = options.emit;
  if (typeof rpc !== 'function' || (emit !== undefined && typeof emit !== 'function')) throw new Error('invalid_publication_configuration');
  let running = false;
  return Object.freeze({ products, async step(signal?: AbortSignal): Promise<PublicationOutcome> {
    const start = performance.now();
    const report = (outcome: PublicationOutcome) => {
      try { emit?.(Object.freeze({ event: 'product.publication', outcome, durationMs: Math.max(0, Math.round(performance.now() - start)) })); }
      catch { /* Observability must not alter publication or leak transport failures. */ }
      return outcome;
    };
    if (running) return report('busy');
    if (signal?.aborted) return report('cancelled');
    if (!products.length) return report('idle');
    running = true;
    const controller = new AbortController();
    let writing = false, cancelled = false;
    let stop!: (value: PublicationOutcome) => void;
    const stopped = new Promise<PublicationOutcome>(resolve => { stop = resolve; });
    const halt = (reason: 'cancelled' | 'deadline_exceeded') => {
      cancelled = true;
      // Once complete has been dispatched, abort cannot prove that SQL rolled back.
      stop(writing ? 'publication_uncertain' : reason);
      controller.abort();
    };
    const onAbort = () => halt('cancelled');
    const timer = setTimeout(() => halt('deadline_exceeded'), timeoutMs);
    signal?.addEventListener('abort', onAbort, { once: true });
    const check = () => {
      if (performance.now() - start >= timeoutMs) halt('deadline_exceeded');
      if (signal?.aborted) halt('cancelled');
      controller.signal.throwIfAborted();
    };
    const task = (async (): Promise<PublicationOutcome> => {
      try {
        check();
        const value = await rpc('claim_product_editorial', { p_products: [...products] }, controller.signal);
        check();
        if (value === null) return 'idle';
        const claim = parseClaim(value);
        check();
        writing = true;
        const result = await rpc('complete_product_editorial', {
          p_id: claim.runId, p_receipt: claim.receiptId, p_token: claim.token, p_revision: claim.revision,
        }, controller.signal);
        check();
        if (!exact(result, ['state', 'revision']) || result.state !== 'READY' || result.revision !== claim.revision + 1)
          return 'publication_uncertain';
        return 'published';
      } catch {
        // No retry, release, failure transition or payload logging after an ambiguous write.
        if (writing) return 'publication_uncertain';
        return cancelled ? (signal?.aborted ? 'cancelled' : 'deadline_exceeded') : 'unavailable';
      }
    })();
    try { return report(await Promise.race([task, stopped])); }
    finally { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); controller.abort(); running = false; }
  } });
}
