import {
	parseContinuitySelection,
	workflowFor,
	type ContinuityItem,
	type ContinuitySelection
} from '@atv/domain';

export type ManagedContinuityItem = Omit<ContinuityItem, 'version' | 'ownerId'> & {
	revision: number;
	updatedAt: string;
};
export type ContinuityManagement = {
	enabled: boolean;
	consent: {
		version: 'atv-continuity-consent/1';
		purpose: 'reading-context';
		state: 'granted' | 'revoked';
		runIds: string[];
		revision: number;
	};
	items: ManagedContinuityItem[];
};
export type ContinuityLibrarySource = {
	id: string;
	title: string;
	item_type: string;
	source_id?: string | null;
};
const object = (v: unknown): v is Record<string, unknown> =>
	!!v && typeof v === 'object' && !Array.isArray(v);
export const continuityUuid = (v: unknown): v is string =>
	typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
const revision = (v: unknown, min = 0): v is number =>
	Number.isInteger(v) && Number(v) >= min && Number(v) <= 2147483647;
const exact = (v: Record<string, unknown>, names: string[]) =>
	Object.keys(v).length === names.length && Object.keys(v).every((k) => names.includes(k));

/** Public management projection only. Never attests eligibility or authorizes a model call. */
export function parseContinuityView(v: unknown): ContinuityManagement | null {
	if (
		!object(v) ||
		!exact(v, ['enabled', 'consent', 'items']) ||
		typeof v.enabled !== 'boolean' ||
		!object(v.consent) ||
		!Array.isArray(v.items) ||
		v.items.length > 100 ||
		JSON.stringify(v).length > 196608
	)
		return null;
	const c = v.consent;
	if (
		!exact(c, ['version', 'purpose', 'state', 'runIds', 'revision']) ||
		c.version !== 'atv-continuity-consent/1' ||
		c.purpose !== 'reading-context' ||
		!['granted', 'revoked'].includes(String(c.state)) ||
		!revision(c.revision) ||
		!Array.isArray(c.runIds) ||
		c.runIds.length > 100 ||
		!c.runIds.every(continuityUuid) ||
		new Set(c.runIds).size !== c.runIds.length ||
		(c.state === 'revoked' && c.runIds.length) ||
		(c.revision === 0 && (c.state !== 'revoked' || v.items.length))
	)
		return null;
	const seen = new Set<string>();
	for (const item of v.items) {
		if (
			!object(item) ||
			!exact(item, [
				'id',
				'runId',
				'productId',
				'relevance',
				'selection',
				'revision',
				'updatedAt'
			]) ||
			!continuityUuid(item.id) ||
			!continuityUuid(item.runId) ||
			seen.has(item.id) ||
			typeof item.productId !== 'string' ||
			!workflowFor(item.productId) ||
			!['relevant', 'irrelevant', 'unreviewed'].includes(String(item.relevance)) ||
			!parseContinuitySelection(item.selection) ||
			!revision(item.revision, 1) ||
			typeof item.updatedAt !== 'string' ||
			item.updatedAt.length > 40 ||
			!/^\d{4}-\d{2}-\d{2}T/.test(item.updatedAt) ||
			!Number.isFinite(Date.parse(item.updatedAt))
		)
			return null;
		seen.add(item.id);
	}
	return structuredClone(v) as ContinuityManagement;
}

export function selectionLabel(s: ContinuitySelection): string {
	if (s.kind === 'reported') return s.text;
	if (s.kind === 'hypothesis') return `Hipótese editorial · seção ${s.sectionIndex + 1}`;
	if (s.kind === 'cycle') return `Referência de cálculo · ${s.factId}`;
	return 'Referência ao resultado salvo';
}

/** Single attempt; even an error response may follow a committed mutation. */
export async function continuityRequest(
	action: 'read' | 'consent' | 'save' | 'delete',
	body: unknown,
	request: typeof fetch = fetch
): Promise<unknown> {
	const response = await request(`/api/continuity/${action}`, {
		method: 'POST',
		credentials: 'same-origin',
		cache: 'no-store',
		redirect: 'error',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(15000)
	});
	if (!response.ok) throw new Error('continuity_unavailable');
	return response.json();
}
