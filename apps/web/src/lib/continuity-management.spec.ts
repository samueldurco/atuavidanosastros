import { describe, expect, it, vi } from 'vitest';
import {
	continuityRequest,
	parseContinuityView,
	selectionLabel,
	type ContinuityManagement
} from './continuity-management';
const id = '00000000-0000-4000-8000-000000000001';
const snapshot = (): ContinuityManagement => ({
	enabled: false,
	consent: {
		version: 'atv-continuity-consent/1',
		purpose: 'reading-context',
		state: 'revoked',
		runIds: [],
		revision: 1
	},
	items: [
		{
			id,
			runId: id,
			productId: 'daily-card',
			relevance: 'unreviewed',
			selection: { kind: 'reported', category: 'theme', text: '<script>literal</script>' },
			revision: 1,
			updatedAt: '2026-09-28T12:00:00Z'
		}
	]
});
describe('private continuity management view', () => {
	it('accepts management while disabled/revoked and returns a detached view', () => {
		const input = snapshot();
		const view = parseContinuityView(input);
		expect(view).toEqual(input);
		input.items[0].relevance = 'relevant';
		expect(view?.items[0].relevance).toBe('unreviewed');
	});
	it.each([
		(v: ContinuityManagement) => {
			v.consent.runIds = [id];
		},
		(v: ContinuityManagement) => {
			v.consent.revision = 0;
		},
		(v: ContinuityManagement) => {
			v.items.push(v.items[0]);
		},
		(v: ContinuityManagement) => {
			v.items[0].updatedAt = 'yesterday';
		},
		(v: ContinuityManagement) => {
			v.items[0].productId = 'not-a-product';
		},
		(v: ContinuityManagement) => {
			v.items[0].revision = -1;
		},
		(v: ContinuityManagement) => {
			v.items[0].runId = 'foreign';
		},
		(v: ContinuityManagement) => {
			Object.assign(v.items[0].selection, { ownerId: id });
		},
		(v: ContinuityManagement) => {
			Object.assign(v, { audit: {} });
		},
		(v: ContinuityManagement) => {
			v.items[0].selection = { kind: 'reported', category: 'theme', text: 'x'.repeat(601) };
		}
	])('fails closed on malformed data %#', (mutate) => {
		const input = snapshot();
		mutate(input);
		expect(parseContinuityView(input)).toBeNull();
	});
	it('labels source references without pretending to recover their content', () => {
		expect(selectionLabel({ kind: 'result' })).toContain('Referência');
		expect(selectionLabel({ kind: 'hypothesis', sectionIndex: 0 })).toContain('seção 1');
		expect(selectionLabel({ kind: 'cycle', factId: 'fact1' })).toContain('fact1');
	});
	it('sends one private POST with a bounded signal; no identifiers in URL', async () => {
		const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"deleted":false}'));
		await expect(continuityRequest('delete', { id }, request)).resolves.toEqual({ deleted: false });
		expect(request).toHaveBeenCalledExactlyOnceWith(
			'/api/continuity/delete',
			expect.objectContaining({
				method: 'POST',
				credentials: 'same-origin',
				cache: 'no-store',
				redirect: 'error',
				body: JSON.stringify({ id }),
				signal: expect.any(AbortSignal)
			})
		);
	});
	it.each([409, 503, 401])('does not retry HTTP %s', async (status) => {
		const request = vi
			.fn<typeof fetch>()
			.mockResolvedValue(new Response('private exception', { status }));
		await expect(continuityRequest('save', {}, request)).rejects.toThrow('continuity_unavailable');
		expect(request).toHaveBeenCalledTimes(1);
	});
	it('does not retry lost responses or malformed JSON', async () => {
		const request = vi.fn<typeof fetch>().mockRejectedValue(new Error('network'));
		await expect(continuityRequest('save', {}, request)).rejects.toThrow();
		expect(request).toHaveBeenCalledTimes(1);
		request.mockResolvedValue(new Response('{'));
		await expect(continuityRequest('read', {}, request)).rejects.toThrow();
		expect(request).toHaveBeenCalledTimes(2);
	});
	it.each(['access', 'clear-access'] as const)(
		'sends %s once without identifiers',
		async (action) => {
			const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'));
			await continuityRequest(action, {}, request);
			expect(request).toHaveBeenCalledExactlyOnceWith(
				`/api/continuity/${action}`,
				expect.objectContaining({
					method: 'POST',
					credentials: 'same-origin',
					cache: 'no-store',
					redirect: 'error',
					body: '{}',
					signal: expect.any(AbortSignal)
				})
			);
			request.mockRejectedValue(new Error('lost'));
			await expect(continuityRequest(action, {}, request)).rejects.toThrow();
			expect(request).toHaveBeenCalledTimes(2);
		}
	);
});
