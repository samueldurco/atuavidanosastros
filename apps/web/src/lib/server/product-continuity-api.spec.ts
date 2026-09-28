import { expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { productContinuityApi, parseContinuityManagement } from './product-continuity-api';
import { POST as readRoute } from '../../routes/api/continuity/read/+server';
import { POST as consentRoute } from '../../routes/api/continuity/consent/+server';
import { POST as saveRoute } from '../../routes/api/continuity/save/+server';
import { POST as deleteRoute } from '../../routes/api/continuity/delete/+server';
import { POST as accessRoute } from '../../routes/api/continuity/access/+server';
import { POST as clearAccessRoute } from '../../routes/api/continuity/clear-access/+server';

// Fixtures supply the common request fields; route params are intentionally unused.
const read = (event: RequestEvent) => readRoute(event as Parameters<typeof readRoute>[0]);
const consent = (event: RequestEvent) => consentRoute(event as Parameters<typeof consentRoute>[0]);
const save = (event: RequestEvent) => saveRoute(event as Parameters<typeof saveRoute>[0]);
const remove = (event: RequestEvent) => deleteRoute(event as Parameters<typeof deleteRoute>[0]);
const access = (event: RequestEvent) => accessRoute(event as Parameters<typeof accessRoute>[0]);
const clearAccess = (event: RequestEvent) =>
	clearAccessRoute(event as Parameters<typeof clearAccessRoute>[0]);

const owner = '00000000-0000-4000-8000-000000000001';
const runId = '00000000-0000-4000-8000-000000000002';
const id = '00000000-0000-4000-8000-000000000003';
const grant = {
	version: 'atv-continuity-consent/1',
	purpose: 'reading-context',
	expectedRevision: 0,
	runIds: [runId],
	granted: true
};
const command = {
	id,
	runId,
	expectedRevision: 0,
	relevance: 'unreviewed',
	selection: { kind: 'reported', category: 'theme', text: 'Nota sintética privada.' }
};
const snapshot = {
	enabled: false,
	consent: {
		version: 'atv-continuity-consent/1',
		ownerId: owner,
		purpose: 'reading-context',
		state: 'revoked',
		runIds: []
	},
	consentRevision: 2,
	items: [
		{
			item: {
				version: 'atv-continuity/1.0.0',
				id,
				ownerId: owner,
				runId,
				productId: 'daily-card',
				relevance: 'unreviewed',
				selection: command.selection
			},
			revision: 1,
			updatedAt: '2026-09-28T13:00:00+00:00'
		}
	]
};
function setup({
	data = snapshot as unknown,
	error = null as { message: string } | null,
	sub = owner as unknown,
	claimsError = false,
	throws = false
} = {}) {
	const abortSignal = vi.fn(async (signal: AbortSignal) => {
		expect(signal).toBeInstanceOf(AbortSignal);
		if (throws) throw new Error('PRIVATE_SQL_RAW_CONTENT');
		return { data, error };
	});
	const rpc = vi.fn(() => ({ abortSignal }));
	const getClaims = vi.fn(async () => ({
		data: { claims: { sub } },
		error: claimsError ? {} : null
	}));
	function event(
		body: unknown = {},
		headers: Record<string, string> = {},
		method = 'POST',
		search = ''
	) {
		const url = new URL('http://localhost/api/continuity/read' + search);
		return {
			url,
			locals: { supabase: { auth: { getClaims }, rpc } },
			request: new Request(url, {
				method,
				headers: { origin: url.origin, 'content-type': 'application/json', ...headers },
				...(method === 'GET' ? {} : { body: JSON.stringify(body) })
			})
		} as unknown as RequestEvent;
	}
	return { event, rpc, getClaims, abortSignal };
}
async function body(response: Response) {
	expect(response.headers.get('cache-control')).toBe('private, no-store');
	expect(response.headers.get('referrer-policy')).toBe('no-referrer');
	expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
	return response.json();
}

it('read route returns management while off/revoked, with no owner identity or source payload', async () => {
	const s = setup();
	const response = await read(s.event());
	expect(response.status).toBe(200);
	const value = await body(response);
	expect(value).toMatchObject({
		enabled: false,
		consent: { state: 'revoked', revision: 2 },
		items: [{ id, revision: 1, selection: command.selection }]
	});
	const encoded = JSON.stringify(value);
	for (const key of [owner, 'ownerId', 'manifest', 'audit', 'sources', 'editorial', 'calculation'])
		expect(encoded).not.toContain(key);
	expect(s.rpc).toHaveBeenCalledExactlyOnceWith('read_product_continuity', {});
});

it('consent/save/delete routes send only narrow session-bound arguments and validate receipts', async () => {
	const c = setup({ data: 1 });
	expect(await body(await consent(c.event(grant)))).toEqual({ revision: 1 });
	expect(c.rpc).toHaveBeenCalledExactlyOnceWith('set_product_continuity_consent', {
		p_expected_revision: 0,
		p_run_ids: [runId],
		p_granted: true
	});
	const s = setup({ data: 1 });
	expect(await body(await save(s.event(command)))).toEqual({ revision: 1 });
	expect(s.rpc).toHaveBeenCalledExactlyOnceWith('save_product_continuity_item', {
		p_id: id,
		p_run_id: runId,
		p_expected_revision: 0,
		p_relevance: 'unreviewed',
		p_selection: command.selection
	});
	for (const deleted of [true, false]) {
		const d = setup({ data: deleted });
		expect(await body(await remove(d.event({ id })))).toEqual({ deleted });
		expect(d.rpc).toHaveBeenCalledExactlyOnceWith('delete_product_continuity_item', { p_id: id });
	}
	const revoke = setup({ data: 3 });
	expect(
		await body(
			await consent(revoke.event({ ...grant, expectedRevision: 2, runIds: [], granted: false }))
		)
	).toEqual({ revision: 3 });
});

it.each(['read', 'consent', 'save', 'delete', 'access', 'clear-access'] as const)(
	'rejects method/origin/query/auth before %s repository access',
	async (action) => {
		const s = setup();
		for (const e of [
			s.event({}, { origin: 'https://example.invalid' }),
			s.event({}, { origin: '' }),
			s.event({}, { 'sec-fetch-site': 'cross-site' }),
			s.event({}, {}, 'GET')
		]) {
			expect((await productContinuityApi(e, action)).status).toBe(403);
		}
		expect(
			(await productContinuityApi(s.event({}, {}, 'POST', '?id=private'), action)).status
		).toBe(400);
		expect(s.getClaims).not.toHaveBeenCalled();
		expect(s.rpc).not.toHaveBeenCalled();
		for (const opts of [{ sub: null }, { sub: 'invalid' }, { claimsError: true }]) {
			const invalid = setup(opts);
			expect((await productContinuityApi(invalid.event(), action)).status).toBe(401);
			expect(invalid.rpc).not.toHaveBeenCalled();
		}
		const absent = s.event();
		absent.locals = {};
		expect((await productContinuityApi(absent, action)).status).toBe(503);
	}
);

it('access routes only inspect/clear metadata using the verified session and empty arguments', async () => {
	const empty = { version: 'atv-continuity-access/1', events: [] };
	const s = setup({ data: empty });
	expect(await body(await access(s.event()))).toEqual(empty);
	expect(s.rpc).toHaveBeenCalledExactlyOnceWith('read_product_continuity_access', {});
	for (const deleted of [0, 1, 1000]) {
		const c = setup({ data: deleted });
		expect(await body(await clearAccess(c.event()))).toEqual({ deleted });
		expect(c.rpc).toHaveBeenCalledExactlyOnceWith('clear_product_continuity_access', {});
	}
});

it.each(['access', 'clear-access'] as const)(
	'rejects extra input, sanitizes failure and never retries %s',
	async (action) => {
		for (const input of [
			{ ownerId: owner },
			{ id },
			{ retentionDays: 7 },
			{ selectedIds: [id] },
			[],
			null
		]) {
			const s = setup();
			expect((await productContinuityApi(s.event(input), action)).status).toBe(400);
			expect(s.rpc).not.toHaveBeenCalled();
		}
		for (const opts of [
			{ data: null },
			{ data: { text: 'PRIVATE' } },
			{ error: { message: 'PRIVATE_SQL' } },
			{ throws: true }
		]) {
			const s = setup(opts);
			const response = await productContinuityApi(s.event(), action);
			expect(response.status).toBe(503);
			expect(await body(response)).toEqual({ error: 'continuity_service_unavailable' });
			expect(s.rpc).toHaveBeenCalledTimes(1);
		}
	}
);

it.each([-1, 1.5, '1', true, 2147483648])(
	'rejects invalid clear-access receipt %#',
	async (data) => {
		const s = setup({ data });
		expect((await clearAccess(s.event())).status).toBe(503);
		expect(s.rpc).toHaveBeenCalledTimes(1);
	}
);

it.each([
	null,
	[],
	{ ownerId: owner },
	{ selectedIds: [id] },
	{ enabled: true },
	{ action: 'prepare' }
])('rejects management body %# before SQL', async (input) => {
	const s = setup();
	expect((await read(s.event(input))).status).toBe(400);
	expect(s.rpc).not.toHaveBeenCalled();
});

it.each([
	{ ...grant, ownerId: owner },
	{ ...grant, granted: 1 },
	{ ...grant, purpose: 'marketing' },
	{ ...grant, version: 'unversioned' },
	{ ...grant, runIds: [] },
	{ ...grant, runIds: [runId, runId] },
	{ ...grant, runIds: Array(101).fill(runId) },
	{ ...grant, runIds: ['bad'] },
	{ ...grant, granted: false },
	{ ...grant, expectedRevision: -1 },
	{ ...grant, expectedRevision: 0.5 },
	{ ...grant, expectedRevision: 2147483647 }
])('rejects consent command %# before SQL', async (input) => {
	const s = setup();
	expect((await consent(s.event(input))).status).toBe(400);
	expect(s.rpc).not.toHaveBeenCalled();
});

it.each([
	{ ...command, ownerId: owner },
	{ ...command, productId: 'daily-card' },
	{ ...command, id: 'bad' },
	{ ...command, relevance: 'inferred' },
	{ ...command, expectedRevision: 2147483647 },
	{ ...command, selection: { kind: 'reported', category: 'theme', text: 'x'.repeat(601) } },
	{ ...command, selection: { kind: 'reported', category: 'theme', text: '  ' } },
	{ ...command, selection: { kind: 'reported', category: 'theme', text: 'x\u0000' } },
	{ ...command, selection: { kind: 'hypothesis', sectionIndex: 64 } },
	{ ...command, selection: { kind: 'result', text: 'invented' } },
	{ ...command, selection: { kind: 'cycle', factId: '../private' } }
])('rejects item command %# before SQL', async (input) => {
	const s = setup();
	expect((await save(s.event(input))).status).toBe(400);
	expect(s.rpc).not.toHaveBeenCalled();
});

it('accepts every selector without deciding source availability in HTTP', async () => {
	for (const selection of [
		command.selection,
		{ kind: 'result' },
		{ kind: 'hypothesis', sectionIndex: 63 },
		{ kind: 'cycle', factId: 'fact-1' }
	]) {
		const s = setup({ data: 1 });
		expect((await save(s.event({ ...command, selection }))).status).toBe(200);
		expect(s.rpc).toHaveBeenCalledTimes(1);
	}
});

it('bounds bytes and refuses media/invalid JSON/UTF8 without SQL', async () => {
	const s = setup();
	const examples = [
		s.event({
			...command,
			selection: { kind: 'reported', category: 'theme', text: 'x'.repeat(9000) }
		}),
		s.event({}, { 'content-type': 'text/plain' })
	];
	for (const bytes of [new TextEncoder().encode('{broken'), new Uint8Array([0xff])]) {
		const e = s.event();
		e.request = new Request(e.url, {
			method: 'POST',
			headers: { origin: e.url.origin, 'content-type': 'application/json' },
			body: bytes
		});
		examples.push(e);
	}
	for (const e of examples) expect((await save(e)).status).toBe(400);
	expect(s.rpc).not.toHaveBeenCalled();
});

it.each([
	null,
	{},
	{ ...snapshot, extra: 'RAW_SECRET' },
	{ ...snapshot, consentRevision: -1 },
	{ ...snapshot, consent: { ...snapshot.consent, ownerId: runId } },
	{ ...snapshot, consent: { ...snapshot.consent, runIds: [runId] } },
	{ ...snapshot, items: Array(101).fill(snapshot.items[0]) },
	{ ...snapshot, items: [snapshot.items[0], snapshot.items[0]] },
	{ ...snapshot, items: [{ ...snapshot.items[0], updatedAt: 'not-a-date' }] },
	{ ...snapshot, items: [{ ...snapshot.items[0], revision: 0 }] },
	{
		...snapshot,
		items: [{ ...snapshot.items[0], item: { ...snapshot.items[0].item, ownerId: runId } }]
	},
	{ ...snapshot, items: [{ ...snapshot.items[0], rawInput: 'SECRET' }] }
])('rejects malformed or foreign management response %# without leaking payload', async (data) => {
	const s = setup({ data });
	const response = await read(s.event());
	expect(response.status).toBe(503);
	expect(await body(response)).toEqual({ error: 'continuity_service_unavailable' });
});

it('accepts first read and granted scope emptied by source deletion; never grants implicitly', () => {
	expect(
		parseContinuityManagement({ ...snapshot, consentRevision: 0, items: [] }, owner)
	).toMatchObject({ consent: { state: 'revoked', revision: 0 } });
	expect(
		parseContinuityManagement(
			{ ...snapshot, consent: { ...snapshot.consent, state: 'granted' }, items: [] },
			owner
		)
	).toMatchObject({ consent: { state: 'granted', runIds: [] } });
	expect(parseContinuityManagement(snapshot, 'bad')).toBeNull();
});

it.each([null, '1', 0, 2, true, { revision: 1 }])(
	'rejects nonmatching revision receipt %# without retry',
	async (data) => {
		const s = setup({ data });
		const response = await save(s.event(command));
		expect(response.status).toBe(503);
		expect(await body(response)).toEqual({ error: 'continuity_service_unavailable' });
		expect(s.rpc).toHaveBeenCalledTimes(1);
	}
);

it('preserves conflict/disabled/revocation codes and redacts raw errors, no automatic retry', async () => {
	for (const [message, status] of [
		['revision_conflict', 409],
		['continuity_disabled', 409],
		['consent_required', 409],
		['source_unavailable', 409],
		['item_unavailable', 409],
		['item_limit', 429],
		['invalid_selection', 400],
		['PRIVATE_SQL_RAW_CONTENT', 503]
	] as const) {
		const s = setup({ error: { message } });
		const response = await save(s.event(command));
		expect(response.status).toBe(status);
		expect(await body(response)).toEqual({
			error: status === 503 ? 'continuity_service_unavailable' : message
		});
		expect(s.rpc).toHaveBeenCalledTimes(1);
	}
	const s = setup({ throws: true });
	expect(await body(await save(s.event(command)))).toEqual({
		error: 'continuity_service_unavailable'
	});
	expect(s.rpc).toHaveBeenCalledTimes(1);
	const malformedDelete = setup({ data: 1 });
	expect((await remove(malformedDelete.event({ id }))).status).toBe(503);
});
