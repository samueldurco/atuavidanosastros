import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { productEmailApi } from './product-email-api';
import { parseProductEmailCommand, parseProductEmailReceipt } from '$lib/product-email';

const id = '00000000-0000-4000-8000-000000000001';
const another = '00000000-0000-4000-8000-000000000002';
const command = {
	version: 'atv-email-request/1',
	runId: id,
	expectedRevision: 4,
	reviewDigest: 'a'.repeat(64),
	consent: {
		transactional: true,
		policyVersion: 'atv-email-delivery/1',
		recipient: 'account-owner'
	}
};
const receipt = {
	id: another,
	runId: id,
	revision: 4,
	reviewDigest: command.reviewDigest,
	state: 'REQUESTED',
	createdAt: '2026-09-28T10:00:00+00:00',
	cancelledAt: null
};
function setup({
	data = receipt as unknown,
	error = null as { message: string } | null,
	sub = another as unknown,
	claimsError = false,
	throws = false
} = {}) {
	const abortSignal = vi.fn(async (signal: AbortSignal) => {
		expect(signal).toBeInstanceOf(AbortSignal);
		if (throws) throw new Error('private database/provider detail');
		return { data, error };
	});
	const rpc = vi.fn(() => ({ abortSignal }));
	const getClaims = vi.fn(async () => ({
		data: { claims: { sub } },
		error: claimsError ? {} : null
	}));
	function event(
		body: unknown = { requestKey: id, command },
		headers: Record<string, string> = {},
		method = 'POST',
		search = ''
	) {
		const url = new URL('http://localhost/api/product-email/request' + search);
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
const body = async (response: Response) => {
	expect(response.headers.get('cache-control')).toBe('private, no-store');
	expect(response.headers.get('referrer-policy')).toBe('no-referrer');
	expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
	return response.json();
};
describe('email HTTP boundary', () => {
	it.each(['request', 'recover', 'cancel'] as const)(
		'rejects cross-site, method, origin, query and authentication before %s RPC',
		async (action) => {
			const s = setup();
			for (const e of [
				s.event({}, { origin: 'https://example.invalid' }),
				s.event({}, { 'sec-fetch-site': 'cross-site' }),
				s.event({}, { origin: '' }),
				s.event({}, {}, 'GET')
			]) {
				expect((await productEmailApi(e, action)).status).toBe(403);
			}
			expect((await productEmailApi(s.event({}, {}, 'POST', '?key=private'), action)).status).toBe(
				400
			);
			expect(s.getClaims).not.toHaveBeenCalled();
			expect(s.rpc).not.toHaveBeenCalled();
			for (const sub of [null, '', {}, 'bad']) {
				const missing = setup({ sub });
				expect((await productEmailApi(missing.event(), action)).status).toBe(401);
				expect(missing.rpc).not.toHaveBeenCalled();
			}
			const rejected = setup({ claimsError: true });
			expect((await productEmailApi(rejected.event(), action)).status).toBe(401);
			const absent = s.event();
			absent.locals.supabase = undefined;
			expect((await productEmailApi(absent, action)).status).toBe(503);
		}
	);
	it('persists only minimal validated command and returns a receipt, not delivery', async () => {
		const s = setup();
		const response = await productEmailApi(s.event(), 'request');
		expect(response.status).toBe(202);
		expect(await body(response)).toEqual({ receipt });
		expect(s.rpc).toHaveBeenCalledExactlyOnceWith('request_product_email', {
			p_request_key: id,
			p_command: command
		});
		expect(s.abortSignal).toHaveBeenCalledTimes(1);
	});
	it.each([
		null,
		[],
		{},
		{ requestKey: id, command, userId: another },
		{ requestKey: id, command, address: 'synthetic@example.invalid' },
		{ requestKey: 'invalid', command },
		{ requestKey: id, command: { ...command, email: 'synthetic@example.invalid' } },
		{
			requestKey: id,
			command: { ...command, consent: { ...command.consent, transactional: false } }
		},
		{ requestKey: id, command: { ...command, consent: { ...command.consent, marketing: true } } },
		{ requestKey: id, command: { ...command, expectedRevision: '4' } },
		{ requestKey: id, command: { ...command, reviewDigest: 'A'.repeat(64) } }
	])('refuses malformed or injected input %# without SQL', async (value) => {
		const s = setup();
		const response = await productEmailApi(s.event(value), 'request');
		expect(response.status).toBe(400);
		expect(await body(response)).toEqual({ error: 'invalid_input' });
		expect(s.rpc).not.toHaveBeenCalled();
	});
	it('bounds actual streamed body and rejects MIME/UTF-8/JSON errors without trusting Content-Length', async () => {
		const s = setup();
		for (const payload of [
			'{',
			JSON.stringify({ requestKey: id, command, padding: 'x'.repeat(3072) }),
			new Uint8Array([255])
		]) {
			const e = s.event();
			e.request = new Request(e.url, {
				method: 'POST',
				headers: {
					origin: e.url.origin,
					'content-type': 'application/json',
					'content-length': '1'
				},
				body: payload
			});
			expect((await productEmailApi(e, 'request')).status).toBe(400);
		}
		expect(
			(await productEmailApi(s.event(undefined, { 'content-type': 'text/plain' }), 'request'))
				.status
		).toBe(400);
		expect(s.rpc).not.toHaveBeenCalled();
	});
	it.each([
		['auth_required', 401],
		['profile_unavailable', 403],
		['invalid_input', 400],
		['email_disabled', 409],
		['email_unavailable', 409],
		['email_already_requested', 409],
		['idempotency_conflict', 409],
		['request_limit', 429],
		['private SQL data', 503],
		['toString', 503]
	] as const)('maps %s without exposing internal detail', async (message, status) => {
		const s = setup({ error: { message } });
		const response = await productEmailApi(s.event(), 'request');
		expect(response.status).toBe(status);
		expect(await body(response)).toEqual({
			error: status === 503 ? 'email_service_unavailable' : message
		});
	});
	it.each([
		null,
		{},
		{ ...receipt, address: 'synthetic@example.invalid' },
		{ ...receipt, state: 'SENT' },
		{ ...receipt, revision: 5 },
		{ ...receipt, runId: another },
		{ ...receipt, reviewDigest: 'b'.repeat(64) },
		{ ...receipt, createdAt: 'invalid' },
		{ ...receipt, cancelledAt: receipt.createdAt },
		{ ...receipt, state: 'CANCELLED', cancelledAt: null },
		{ ...receipt, state: 'CANCELLED', cancelledAt: '2026-09-27T10:00:00Z' }
	])('fails closed on unexpected request projection %#', async (data) => {
		const s = setup({ data });
		const response = await productEmailApi(s.event(), 'request');
		expect(response.status).toBe(503);
		expect(await body(response)).toEqual({ error: 'email_service_unavailable' });
	});
	it('supports read-only absence and cancellation while rejecting unexpected cancelled identity/state', async () => {
		const s = setup({ data: null });
		for (const action of ['recover', 'cancel'] as const) {
			const response = await productEmailApi(
				s.event(action === 'recover' ? { requestKey: id } : { receiptId: another }),
				action
			);
			expect(response.status).toBe(200);
			expect(await body(response)).toEqual({ receipt: null });
		}
		for (const data of [
			receipt,
			{ ...receipt, id: id, state: 'CANCELLED', cancelledAt: receipt.createdAt }
		]) {
			const wrong = setup({ data });
			expect((await productEmailApi(wrong.event({ receiptId: another }), 'cancel')).status).toBe(
				503
			);
		}
		const cancelled = { ...receipt, state: 'CANCELLED', cancelledAt: receipt.createdAt };
		const ok = setup({ data: cancelled });
		expect(await body(await productEmailApi(ok.event({ receiptId: another }), 'cancel'))).toEqual({
			receipt: cancelled
		});
		expect(ok.rpc).toHaveBeenCalledExactlyOnceWith('cancel_product_email_request', {
			p_id: another
		});
		const recovery = setup();
		expect(
			await body(await productEmailApi(recovery.event({ requestKey: id }), 'recover'))
		).toEqual({ receipt });
		expect(recovery.rpc).toHaveBeenCalledExactlyOnceWith('read_product_email_request', {
			p_request_key: id
		});
	});
	it('does not retry after an uncertain transport failure', async () => {
		const s = setup({ throws: true });
		const response = await productEmailApi(s.event(), 'request');
		expect(response.status).toBe(503);
		expect(await body(response)).toEqual({ error: 'email_service_unavailable' });
		expect(s.rpc).toHaveBeenCalledTimes(1);
	});
	it('strict shared parsers preserve exact values and reject extra fields', () => {
		expect(parseProductEmailCommand(command)).toEqual(command);
		expect(parseProductEmailReceipt(receipt)).toEqual(receipt);
		for (const expectedRevision of [0, 9, 4.1, NaN])
			expect(parseProductEmailCommand({ ...command, expectedRevision })).toBeNull();
		for (const consent of [
			null,
			{},
			{ ...command.consent, policyVersion: 'old' },
			{ ...command.consent, recipient: 'partner' }
		])
			expect(parseProductEmailCommand({ ...command, consent })).toBeNull();
		expect(
			parseProductEmailCommand({ ...command, runId: '00000000-0000-0000-0000-000000000000' })
		).toBeNull();
		expect(parseProductEmailReceipt({ ...receipt, owner: another })).toBeNull();
	});
});
