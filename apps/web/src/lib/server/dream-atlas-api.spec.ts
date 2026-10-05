import { expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { DREAM_ATLAS_ENTRY_VERSION } from '@atv/domain';
import { POST as readRoute } from '../../routes/api/dream-atlas/entries/read/+server';
import { POST as saveRoute } from '../../routes/api/dream-atlas/entries/save/+server';
import { POST as deleteRoute } from '../../routes/api/dream-atlas/entries/delete/+server';

const owner = '00000000-0000-4000-8000-000000000001';
const runId = '00000000-0000-4000-8000-000000000002';
const entryId = '00000000-0000-4000-8000-000000000003';
const entry = {
	version: DREAM_ATLAS_ENTRY_VERSION,
	dreamDate: '2026-10-05',
	narrative: 'Relato sintético.',
	emotions: ['curiosidade'],
	associations: ['casa'],
	includeInSynthesis: false
};
const saved = {
	...entry,
	id: entryId,
	runId,
	revision: 1,
	createdAt: '2026-10-05T12:00:00+00:00',
	updatedAt: '2026-10-05T12:00:00+00:00'
};
function setup(data: unknown, error: string | null = null, sub: unknown = owner) {
	const abortSignal = vi.fn(async (signal: AbortSignal) => {
		expect(signal).toBeInstanceOf(AbortSignal);
		return { data, error: error ? { message: error } : null };
	});
	const rpc = vi.fn(() => ({ abortSignal }));
	const getClaims = vi.fn(async () => ({ data: { claims: { sub } }, error: null }));
	const event = (body: unknown, headers: Record<string, string> = {}, search = '') => {
		const url = new URL('http://localhost/api/dream-atlas/entries/read' + search);
		return {
			url,
			locals: { supabase: { auth: { getClaims }, rpc } },
			request: new Request(url, {
				method: 'POST',
				headers: { origin: url.origin, 'content-type': 'application/json', ...headers },
				body: JSON.stringify(body)
			})
		} as unknown as RequestEvent;
	};
	return { event, rpc };
}
const read = (event: RequestEvent) => readRoute(event as Parameters<typeof readRoute>[0]);
const save = (event: RequestEvent) => saveRoute(event as Parameters<typeof saveRoute>[0]);
const remove = (event: RequestEvent) => deleteRoute(event as Parameters<typeof deleteRoute>[0]);

it('reads only private entries of the requested run through the owner RPC', async () => {
	const s = setup({ startDate: '2026-10-01', entries: [saved] });
	const response = await read(s.event({ runId }));
	expect(response.status).toBe(200);
	expect(response.headers.get('cache-control')).toBe('private, no-store');
	expect(await response.json()).toEqual({ startDate: '2026-10-01', entries: [saved] });
	expect(s.rpc).toHaveBeenCalledWith('read_dream_atlas_entries', { p_run_id: runId });
});

it('saves explicit exclusion and revision, while rejecting forged historical fields', async () => {
	const s = setup(1);
	const response = await save(s.event({ runId, entryId, expectedRevision: 0, entry }));
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({ revision: 1 });
	expect(s.rpc).toHaveBeenCalledWith(
		'save_dream_atlas_entry',
		expect.objectContaining({
			p_run_id: runId,
			p_entry_id: entryId,
			p_include_in_synthesis: false
		})
	);
	const forged = await save(
		s.event({ runId, entryId, expectedRevision: 0, entry: { ...entry, history: ['outro sonho'] } })
	);
	expect(forged.status).toBe(400);
	expect(s.rpc).toHaveBeenCalledTimes(1);
});

it('deletes owned entries without requiring the release gate', async () => {
	const s = setup(true);
	const response = await remove(s.event({ runId, entryId }));
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({ deleted: true });
	expect(s.rpc).toHaveBeenCalledWith('delete_dream_atlas_entry', {
		p_run_id: runId,
		p_entry_id: entryId
	});
});

it('fails closed on authentication, cross-site writes, release denial and malformed reads', async () => {
	const unauth = setup([], null, null);
	expect((await read(unauth.event({ runId }))).status).toBe(401);
	expect(unauth.rpc).not.toHaveBeenCalled();
	const cross = setup([]);
	expect(
		(
			await save(
				cross.event(
					{ runId, entryId, expectedRevision: 0, entry },
					{ origin: 'https://evil.example' }
				)
			)
		).status
	).toBe(403);
	expect(cross.rpc).not.toHaveBeenCalled();
	const off = setup(null, 'atlas_unreleased');
	expect((await save(off.event({ runId, entryId, expectedRevision: 0, entry }))).status).toBe(409);
	const foreign = setup({ startDate: '2026-10-01', entries: [{ ...saved, runId: owner }] });
	expect((await read(foreign.event({ runId }))).status).toBe(503);
});
