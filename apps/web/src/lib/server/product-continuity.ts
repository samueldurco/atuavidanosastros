import {
	parseContinuityConsent,
	parseContinuityItem,
	prepareContinuityContext,
	workflowFor,
	type ContinuitySource,
	type ContinuityPreparation
} from '@atv/domain';

const uuid = (v: unknown): v is string =>
	typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
const object = (v: unknown): v is Record<string, unknown> =>
	!!v && typeof v === 'object' && !Array.isArray(v);
const exact = (v: Record<string, unknown>, names: string[]) =>
	Object.keys(v).length === names.length && names.every((k) => Object.hasOwn(v, k));
const revision = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) > 0;
const bounded = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
const limits = (v: unknown) =>
	Array.isArray(v) && v.length <= 24 && v.every((x) => bounded(x, 600));

function source(v: unknown): ContinuitySource | null {
	if (
		!object(v) ||
		!exact(v, ['ownerId', 'available', 'run']) ||
		!uuid(v.ownerId) ||
		v.available !== true ||
		!object(v.run)
	)
		return null;
	const r = v.run;
	if (
		!exact(r, ['id', 'productId', 'state', 'revision', 'calculation', 'editorial']) ||
		!uuid(r.id) ||
		typeof r.productId !== 'string' ||
		r.state !== 'READY' ||
		!revision(r.revision) ||
		!object(r.calculation) ||
		!object(r.editorial)
	)
		return null;
	const c = r.calculation,
		e = r.editorial,
		product = workflowFor(r.productId);
	if (
		!product ||
		!exact(c, ['kind', 'status', 'facts', 'limits']) ||
		c.kind !== product.kind ||
		!['recorded', 'experimental'].includes(String(c.status)) ||
		!limits(c.limits) ||
		!Array.isArray(c.facts) ||
		c.facts.length > 120 ||
		c.facts.some(
			(f) =>
				!object(f) ||
				!exact(f, ['id', 'kind', 'display', 'source']) ||
				!bounded(f.id, 80) ||
				!['calculated', 'reported', 'drawn'].includes(String(f.kind)) ||
				!bounded(f.display, 1200) ||
				f.source !== ''
		)
	)
		return null;
	if (
		!exact(e, ['title', 'sections', 'limits']) ||
		!bounded(e.title, 1200) ||
		!limits(e.limits) ||
		!Array.isArray(e.sections) ||
		e.sections.length > 64 ||
		e.sections.some(
			(s) =>
				!object(s) ||
				!exact(s, ['title', 'text', 'evidence']) ||
				s.title !== '' ||
				!bounded(s.text, 1200) ||
				!Array.isArray(s.evidence) ||
				s.evidence.length !== 0
		)
	)
		return null;
	return structuredClone(v) as unknown as ContinuitySource;
}

type Prepared = Extract<ContinuityPreparation, { status: 'prepared' }> & {
	/** Private only: do not serialize into model input, analytics, public API or cache. */
	audit: { consentRevision: number; itemRevisions: { itemId: string; revision: number }[] };
};
export type StoredContinuityResult =
	| Prepared
	| Extract<ContinuityPreparation, { status: 'blocked' }>
	| { status: 'blocked'; code: 'continuity_service_unavailable' };
const blockedCodes = [
	'disabled',
	'invalid_selection',
	'consent_required',
	'source_unavailable',
	'item_unavailable'
] as const;

/** Server-only repository boundary. Caller supplies a VERIFIED owner and its session-bound
 * read_product_continuity_selection RPC, never client-provided snapshots or service credentials.
 * Re-reads on every invocation; returned preparation is not authorization for a later send. */
export async function prepareStoredContinuity(input: {
	enabled?: boolean;
	ownerId: string;
	selectedIds: readonly string[];
	readSelection: (ids: string[], signal: AbortSignal) => Promise<{ data: unknown; error: unknown }>;
}): Promise<StoredContinuityResult> {
	const unavailable = (): StoredContinuityResult => ({
		status: 'blocked',
		code: 'continuity_service_unavailable'
	});
	if (input.enabled !== true) return { status: 'blocked', code: 'disabled' };
	if (
		!uuid(input.ownerId) ||
		!Array.isArray(input.selectedIds) ||
		input.selectedIds.length < 1 ||
		input.selectedIds.length > 12 ||
		!input.selectedIds.every(uuid) ||
		new Set(input.selectedIds).size !== input.selectedIds.length
	)
		return { status: 'blocked', code: 'invalid_selection' };
	const selectedIds = [...input.selectedIds];
	const ownerId = input.ownerId;
	try {
		const signal = AbortSignal.timeout(10000);
		const { data, error } = await input.readSelection([...selectedIds], signal);
		signal.throwIfAborted();
		if (error || !object(data) || JSON.stringify(data).length > 196608) return unavailable();
		if (data.status === 'blocked' && exact(data, ['status', 'code'])) {
			const code = blockedCodes.find((c) => c === data.code);
			return code ? { status: 'blocked', code } : unavailable();
		}
		if (
			!exact(data, [
				'status',
				'version',
				'ownerId',
				'consent',
				'consentRevision',
				'itemRevisions',
				'items',
				'sources'
			]) ||
			data.status !== 'selected' ||
			data.version !== 'atv-continuity-selection/1' ||
			data.ownerId !== ownerId ||
			!revision(data.consentRevision) ||
			!Array.isArray(data.items) ||
			data.items.length !== selectedIds.length ||
			!Array.isArray(data.itemRevisions) ||
			data.itemRevisions.length !== selectedIds.length ||
			!Array.isArray(data.sources) ||
			data.sources.length < 1 ||
			data.sources.length > selectedIds.length
		)
			return unavailable();
		const consent = parseContinuityConsent(data.consent),
			items = data.items.map(parseContinuityItem),
			sources = data.sources.map(source);
		if (
			!consent ||
			items.some((i) => !i) ||
			sources.some((s) => !s) ||
			data.itemRevisions.some(
				(v, n) =>
					!object(v) ||
					!exact(v, ['itemId', 'revision']) ||
					v.itemId !== selectedIds[n] ||
					!revision(v.revision)
			) ||
			items.some((v, n) => v?.id !== selectedIds[n])
		)
			return unavailable();
		const result = prepareContinuityContext({
			enabled: true,
			ownerId,
			consent,
			selectedIds,
			items,
			sources: sources as ContinuitySource[]
		});
		return result.status === 'prepared'
			? {
					...result,
					audit: {
						consentRevision: data.consentRevision,
						itemRevisions: structuredClone(data.itemRevisions) as Prepared['audit']['itemRevisions']
					}
				}
			: result;
	} catch {
		// No raw errors, arguments, notes or SQL in telemetry/responses; no fallback or retry.
		return unavailable();
	}
}
