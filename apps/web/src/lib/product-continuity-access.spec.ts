import { expect, it } from 'vitest';
import { parseContinuityAccess } from './product-continuity-access';

const id = '00000000-0000-4000-8000-000000000001';
const secondId = '00000000-0000-4000-8000-000000000002';
const item = { itemId: id, itemRevision: 1, runId: secondId, runRevision: 4 };
const event = {
	id,
	purpose: 'reading-context',
	outcome: 'selected',
	createdAt: '2026-09-28T10:00:00+00:00',
	expiresAt: '2026-10-05T10:00:00+00:00',
	consentRevision: 1,
	items: [item]
};
const snapshot = { version: 'atv-continuity-access/1', events: [event] };

it('accepts empty/maximum metadata history and copies nested objects without dropping rows', () => {
	expect(parseContinuityAccess({ ...snapshot, events: [] })).toEqual({ ...snapshot, events: [] });
	const result = parseContinuityAccess(snapshot);
	expect(result).toEqual(snapshot);
	expect(result?.events[0].items[0]).not.toBe(item);
	const maximum = {
		...snapshot,
		events: Array.from({ length: 1000 }, (_, index) => ({
			...event,
			id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
			items: Array.from({ length: 12 }, (_, j) => ({
				...item,
				itemId: `00000000-0000-4000-8000-${String(j).padStart(12, '0')}`
			}))
		}))
	};
	expect(parseContinuityAccess(maximum)?.events).toHaveLength(1000);
});

it.each([
	null,
	[],
	{},
	{ ...snapshot, ownerId: id },
	{ ...snapshot, version: 'next' },
	{ ...snapshot, events: Array(1001).fill(event) },
	{ ...snapshot, events: [event, event] },
	...[
		{ id: 'bad' },
		{ purpose: 'marketing' },
		{ outcome: 'used-by-model' },
		{ consentRevision: 0 },
		{ consentRevision: 2147483648 },
		{ consentRevision: 1.5 },
		{ createdAt: 'bad' },
		{ expiresAt: event.createdAt },
		{ items: [] },
		{ items: null },
		{ items: Array(13).fill(item) },
		{ items: [item, item] },
		{ text: 'PRIVATE' },
		{ items: [{ ...item, text: 'PRIVATE' }] },
		{ items: [{ ...item, itemId: 'bad' }] },
		{ items: [{ ...item, runId: 'bad' }] },
		{ items: [{ ...item, itemRevision: 0 }] },
		{ items: [{ ...item, runRevision: '4' }] },
		{ items: [item, { ...item, itemId: secondId, runRevision: 5 }] }
	].map((change) => ({ ...snapshot, events: [{ ...event, ...change }] }))
])('rejects malformed/additional/duplicate/inconsistent metadata %# atomically', (value) => {
	expect(parseContinuityAccess(value)).toBeNull();
});

it('refuses non-serializable payload without throwing or exposing it', () => {
	const recursive: Record<string, unknown> = { ...snapshot };
	recursive.events = [recursive];
	expect(parseContinuityAccess(recursive)).toBeNull();
});
