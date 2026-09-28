export type ContinuityAccess = {
	version: 'atv-continuity-access/1';
	events: {
		id: string;
		purpose: 'reading-context';
		outcome: 'selected';
		createdAt: string;
		expiresAt: string;
		consentRevision: number;
		items: { itemId: string; itemRevision: number; runId: string; runRevision: number }[];
	}[];
};

const object = (v: unknown): v is Record<string, unknown> =>
	!!v && typeof v === 'object' && !Array.isArray(v);
const exact = (v: Record<string, unknown>, keys: string[]) =>
	Object.keys(v).length === keys.length && keys.every((k) => Object.hasOwn(v, k));
const uuid = (v: unknown): v is string =>
	typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
const revision = (v: unknown): v is number =>
	Number.isInteger(v) && Number(v) >= 1 && Number(v) <= 2147483647;
const timestamp = (v: unknown): v is string =>
	typeof v === 'string' &&
	v.length <= 40 &&
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/.test(v) &&
	Number.isFinite(Date.parse(v));

/** Metadata only. Ownership is enforced by the session-bound SQL RPC, not by this parser. */
export function parseContinuityAccess(value: unknown): ContinuityAccess | null {
	try {
		if (
			!object(value) ||
			!exact(value, ['version', 'events']) ||
			value.version !== 'atv-continuity-access/1' ||
			!Array.isArray(value.events) ||
			value.events.length > 1000 ||
			JSON.stringify(value).length > 3145728
		)
			return null;
		const events: ContinuityAccess['events'] = [];
		const ids = new Set<string>();
		for (const event of value.events) {
			if (
				!object(event) ||
				!exact(event, [
					'id',
					'purpose',
					'outcome',
					'createdAt',
					'expiresAt',
					'consentRevision',
					'items'
				]) ||
				!uuid(event.id) ||
				ids.has(event.id) ||
				event.purpose !== 'reading-context' ||
				event.outcome !== 'selected' ||
				!timestamp(event.createdAt) ||
				!timestamp(event.expiresAt) ||
				Date.parse(event.expiresAt) <= Date.parse(event.createdAt) ||
				!revision(event.consentRevision) ||
				!Array.isArray(event.items) ||
				event.items.length < 1 ||
				event.items.length > 12
			)
				return null;
			const items: ContinuityAccess['events'][number]['items'] = [];
			const itemIds = new Set<string>();
			const sources = new Map<string, number>();
			for (const item of event.items) {
				if (
					!object(item) ||
					!exact(item, ['itemId', 'itemRevision', 'runId', 'runRevision']) ||
					!uuid(item.itemId) ||
					itemIds.has(item.itemId) ||
					!uuid(item.runId) ||
					!revision(item.itemRevision) ||
					!revision(item.runRevision) ||
					(sources.has(item.runId) && sources.get(item.runId) !== item.runRevision)
				)
					return null;
				itemIds.add(item.itemId);
				sources.set(item.runId, item.runRevision);
				items.push({
					itemId: item.itemId,
					itemRevision: item.itemRevision,
					runId: item.runId,
					runRevision: item.runRevision
				});
			}
			ids.add(event.id);
			events.push({
				id: event.id,
				purpose: event.purpose,
				outcome: event.outcome,
				createdAt: event.createdAt,
				expiresAt: event.expiresAt,
				consentRevision: event.consentRevision,
				items
			});
		}
		return { version: 'atv-continuity-access/1', events };
	} catch {
		return null;
	}
}
