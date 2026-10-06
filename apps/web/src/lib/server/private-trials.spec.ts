import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { privateTrial, trialDreamSources, trialIdentity, trialJson } from './private-trials';

const owner = '00000000-0000-4000-8000-000000000031';
const reading = '00000000-0000-4000-8000-000000000032';
function identity(grant: unknown = true, claims: unknown = { sub: owner }) {
	const rpc = vi.fn().mockResolvedValue({ data: grant, error: null });
	const supabase = {
		auth: { getClaims: vi.fn().mockResolvedValue({ data: { claims }, error: null }) },
		rpc,
		from: vi.fn()
	};
	return { locals: { supabase } as unknown as App.Locals, supabase, rpc };
}
function event(body: string, origin: string | null = 'https://example.test', length?: string) {
	const headers = new Headers();
	if (origin) headers.set('origin', origin);
	if (length) headers.set('content-length', length);
	return {
		url: new URL('https://example.test/api/private-trials'),
		request: new Request('https://example.test/api/private-trials', {
			method: 'POST',
			headers,
			body
		})
	} as RequestEvent;
}
describe('private trial authority and request boundaries', () => {
	it('uses verified claims and the database grant, never a supplied email', async () => {
		const { locals, rpc } = identity();
		expect((await trialIdentity(locals))?.ownerId).toBe(owner);
		expect(rpc).toHaveBeenCalledWith('has_atv_trial_access');
		const forged = identity(true, { email: 'owner@example.test' });
		await expect(trialIdentity(forged.locals)).rejects.toMatchObject({ status: 401 });
		expect(forged.rpc).not.toHaveBeenCalled();
	});
	it('fails closed on missing infrastructure, missing grant and provider errors', async () => {
		await expect(trialIdentity({} as App.Locals)).rejects.toMatchObject({ status: 503 });
		expect(await trialIdentity({} as App.Locals, false)).toBeNull();
		for (const grant of [false, null, 'true']) {
			await expect(trialIdentity(identity(grant).locals)).rejects.toMatchObject({ status: 403 });
		}
		const failing = identity();
		failing.rpc.mockResolvedValue({ data: true, error: { message: 'offline' } });
		await expect(trialIdentity(failing.locals)).rejects.toMatchObject({ status: 403 });
	});
	it('restricts saved lookup to the authenticated owner and rejects unavailable records', async () => {
		const { locals, supabase } = identity();
		const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
		query.select.mockReturnValue(query);
		query.eq.mockReturnValue(query);
		query.maybeSingle.mockResolvedValue({ data: { id: reading }, error: null });
		supabase.from.mockReturnValue(query);
		expect((await privateTrial(locals, reading)).id).toBe(reading);
		expect(query.eq.mock.calls).toEqual([
			['id', reading],
			['owner_id', owner]
		]);
		query.maybeSingle.mockResolvedValue({ data: null, error: null });
		await expect(privateTrial(locals, reading)).rejects.toMatchObject({ status: 404 });
		await expect(privateTrial(locals, '../../other')).rejects.toMatchObject({ status: 404 });
	});
	it('rejects duplicate or foreign dream selections before composing continuity', async () => {
		const { locals, supabase } = identity();
		await expect(trialDreamSources(locals, [reading, reading])).rejects.toMatchObject({
			status: 400
		});
		expect(supabase.from).not.toHaveBeenCalled();
		const query = { select: vi.fn(), eq: vi.fn(), in: vi.fn() };
		query.select.mockReturnValue(query);
		query.eq.mockReturnValue(query);
		query.in.mockResolvedValue({ data: [], error: null });
		supabase.from.mockReturnValue(query);
		await expect(trialDreamSources(locals, [reading])).rejects.toMatchObject({ status: 400 });
		expect(query.eq).toHaveBeenCalledWith('owner_id', owner);
	});
	it('requires the same origin even for otherwise valid JSON', async () => {
		for (const origin of [null, 'https://other.test']) {
			await expect(trialJson(event('{}', origin))).rejects.toMatchObject({ status: 403 });
		}
		expect(await trialJson(event('{"decision":"approved"}'))).toEqual({ decision: 'approved' });
	});
	it('rejects malformed JSON and enforces size with and without a length header', async () => {
		await expect(trialJson(event('{'))).rejects.toMatchObject({ status: 400 });
		await expect(trialJson(event('{}', 'https://example.test', '35001'))).rejects.toMatchObject({
			status: 413
		});
		await expect(trialJson(event(' '.repeat(35001)))).rejects.toMatchObject({ status: 413 });
	});
});
