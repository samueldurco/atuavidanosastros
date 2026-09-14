import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { workflowApi } from './workflow-api';
import { parseProductRun } from '$lib/product-run';
import { readLibraryResult } from './library-reader';

const id = '00000000-0000-4000-8000-000000000001';
const owner = '00000000-0000-4000-8000-000000000002';
const libraryId = '00000000-0000-4000-8000-000000000003';
const at = '2026-09-14T12:00:00Z';
const input = {
	version: 'atv-workflow/1.0.0',
	productId: 'daily-card',
	consent: {
		storage: true,
		policyVersion: 'atv-input-consent/1',
		partner: false,
		continuity: false
	},
	questions: ['Questão sintética']
};
const view = {
	id,
	productId: 'daily-card',
	state: 'QUEUED',
	revision: 1,
	parentId: null,
	createdAt: at,
	updatedAt: at,
	released: false,
	canReprocess: false,
	libraryItemId: libraryId,
	history: [{ revision: 1, state: 'QUEUED', at }],
	calculation: null,
	editorial: null
};
const ready = {
	...view,
	state: 'READY',
	revision: 4,
	released: true,
	history: ['QUEUED', 'CALCULATED', 'AWAITING_EDITORIAL', 'READY'].map((state, i) => ({
		revision: i + 1,
		state,
		at
	})),
	calculation: {
		version: 'fixture/1',
		facts: [{ id: 'fact', kind: 'drawn', display: 'Sintético', source: 'fixture' }],
		limits: []
	},
	editorial: {
		version: 'fixture/1',
		promotionId: 'fixture',
		reviewDigest: 'a'.repeat(64),
		title: 'Sintético',
		sections: [{ title: 'Teste', text: 'Não é uma leitura real', evidence: ['fact'] }],
		limits: []
	}
};
function setup({ authenticated = true, rpcError = '', run = view as unknown } = {}) {
	const rpc = vi.fn(async (name: string) => ({
		data: name === 'read_product_run' ? run : name === 'delete_product_run' ? true : id,
		error: rpcError ? { message: rpcError } : null
	}));
	const getClaims = vi.fn(async () => ({
		data: { claims: authenticated ? { sub: owner } : null },
		error: null
	}));
	const event = (
		body: unknown = { requestKey: id, input },
		origin = 'http://localhost',
		method = 'POST'
	) =>
		({
			url: new URL('http://localhost/api/workflows'),
			locals: { supabase: { auth: { getClaims }, rpc } },
			request: new Request('http://localhost/api/workflows', {
				method,
				headers: { 'content-type': 'application/json', origin },
				...(method !== 'GET' ? { body: JSON.stringify(body) } : {})
			})
		}) as unknown as RequestEvent;
	return { event, rpc, getClaims };
}
describe('authenticated workflow boundary', () => {
	it('rejects CSRF, missing session and forged body owner before persistence', async () => {
		const { event, rpc, getClaims } = setup();
		expect(
			(await workflowApi(event(undefined, 'https://untrusted.example'), 'create')).status
		).toBe(403);
		expect(getClaims).not.toHaveBeenCalled();
		expect(
			(await workflowApi(event({ requestKey: id, input, user_id: owner }), 'create')).status
		).toBe(400);
		const anonymous = setup({ authenticated: false });
		expect((await workflowApi(anonymous.event(), 'create')).status).toBe(401);
		expect(rpc).not.toHaveBeenCalled();
		expect(anonymous.rpc).not.toHaveBeenCalled();
	});
	it('accepts only the input contract and sends the exact idempotency key without an owner override', async () => {
		const { event, rpc } = setup();
		const response = await workflowApi(event(), 'create');
		expect(response.status).toBe(202);
		expect(await response.json()).toEqual({ runId: id });
		expect(rpc).toHaveBeenCalledExactlyOnceWith('request_product_run', {
			p_product_id: 'daily-card',
			p_request_key: id,
			p_input: input,
			p_parent_id: null
		});
		expect(response.headers.get('cache-control')).toContain('no-store');
		expect(response.headers.get('referrer-policy')).toBe('no-referrer');
	});
	it('rejects malformed, excessive and out-of-contract inputs', async () => {
		const { event, rpc } = setup();
		for (const body of [
			null,
			{},
			{ requestKey: 'bad', input },
			{ requestKey: id, input: { ...input, birth: {} } },
			{ requestKey: id, input: { ...input, context: 'x'.repeat(21000) } }
		]) {
			expect((await workflowApi(event(body), 'create')).status).toBe(400);
		}
		expect(rpc).not.toHaveBeenCalled();
	});
	it('maps only exact safe database codes, never private provider/error text', async () => {
		for (const [message, status] of [
			['workflow_unreleased', 409],
			['entitlement_required', 403],
			['request_limit', 429],
			['idempotency_conflict', 409],
			['parent_not_reprocessable', 409],
			['private input and provider failure', 503]
		] as const) {
			const { event } = setup({ rpcError: message });
			const response = await workflowApi(event(), 'create');
			expect(response.status).toBe(status);
			if (status === 503) expect(await response.text()).not.toContain(message);
		}
	});
	it('recovers through the owner-only projection and strips unapproved data', async () => {
		const { event } = setup({
			run: { ...view, input: 'private', calculation: ready.calculation, editorial: ready.editorial }
		});
		const response = await workflowApi(event(undefined, undefined, 'GET'), 'read', id);
		expect(await response.json()).toEqual({ run: view });
		const missing = setup({ run: null });
		expect((await workflowApi(missing.event(undefined, undefined, 'GET'), 'read', id)).status).toBe(
			404
		);
		const wrong = setup({ run: { ...view, id: owner } });
		expect((await workflowApi(wrong.event(undefined, undefined, 'GET'), 'read', id)).status).toBe(
			503
		);
	});
	it('reprocess copies input on the server, including retries after gate closure', async () => {
		const { event, rpc } = setup();
		expect((await workflowApi(event({ requestKey: id }), 'reprocess', id)).status).toBe(202);
		expect(rpc).toHaveBeenLastCalledWith('request_product_run', {
			p_product_id: 'daily-card',
			p_request_key: id,
			p_input: null,
			p_parent_id: id
		});
		expect((await workflowApi(event({ requestKey: id, input }), 'reprocess', id)).status).toBe(400);
	});
	it('deletes via owner-checking RPC and fails closed for unavailable auth, malformed IDs and network failures', async () => {
		const { event, rpc } = setup();
		expect((await workflowApi(event(), 'delete', id)).status).toBe(200);
		expect(rpc).toHaveBeenCalledExactlyOnceWith('delete_product_run', { p_id: id });
		expect((await workflowApi(event(), 'delete', 'invalid')).status).toBe(404);
		const noClient = event();
		noClient.locals = {};
		expect((await workflowApi(noClient, 'create')).status).toBe(503);
		rpc.mockRejectedValueOnce(new Error('private details'));
		const response = await workflowApi(event(), 'delete', id);
		expect(response.status).toBe(503);
		expect(await response.text()).not.toContain('private details');
	});
});
describe('minimized reader contract', () => {
	it('rejects corrupted state/history/evidence and drops raw payloads even in approved data', () => {
		expect(parseProductRun(ready)).toEqual(ready);
		for (const broken of [
			{ ...view, history: [] },
			{ ...view, revision: 2 },
			{ ...ready, state: 'QUEUED' },
			{
				...ready,
				editorial: {
					...ready.editorial,
					sections: [{ title: 'test', text: 'test', evidence: ['invented'] }]
				}
			}
		])
			expect(parseProductRun(broken)).toBeNull();
		const projected = parseProductRun({
			...ready,
			input: input,
			calculation: {
				...ready.calculation,
				data: input,
				facts: ready.calculation.facts.map((f) => ({ ...f, private: input }))
			}
		});
		expect(projected).toEqual(ready);
	});
	it('Library uses an owner-filtered item and its exact source, not arbitrary run IDs', async () => {
		const filters: unknown[] = [];
		const query = {
			select: () => query,
			eq: (...args: unknown[]) => {
				filters.push(args);
				return query;
			},
			is: () => query,
			maybeSingle: async () => ({
				data: {
					id: libraryId,
					title: 'Sintético',
					universe: 'tarot-arcanos',
					item_type: 'PRODUCT_RUN',
					source_id: id,
					created_at: at
				},
				error: null
			})
		};
		const { event, rpc } = setup();
		const client = event().locals.supabase!;
		client.from = (() => query) as unknown as typeof client.from;
		const recovered = await readLibraryResult(client, owner, libraryId);
		expect(recovered.state).toBe('workflow');
		expect(filters).toContainEqual(['user_id', owner]);
		expect(rpc).toHaveBeenCalledWith('read_product_run', { p_id: id });
	});
});
