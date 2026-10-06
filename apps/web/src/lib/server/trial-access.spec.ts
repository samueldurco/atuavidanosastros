import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { productCatalog } from '@atv/domain';
import { load as rootLoad } from '../../routes/+layout.server';
import { load as legacyLoad } from '../../routes/biblioteca/nova/[productId]/+page.server';
import { readTrialLibrary } from './trial-library';
import { handle } from '../../hooks.server';
vi.mock('$env/dynamic/public', () => ({ env: {} }));
vi.mock('$lib/server/symbolic-intake', () => ({
	readIntakeAccess: vi.fn(async () => ({ state: 'UNAVAILABLE' }))
}));
const owner = '00000000-0000-4000-8000-000000000052';
describe('nominal trial access in the normal app', () => {
	it.each([
		[null, null, true, false],
		[{ sub: owner }, { message: 'expired' }, true, false],
		[{ sub: owner }, null, false, false],
		[{ sub: owner }, null, true, true]
	])(
		'uses verified claims and the database grant (%j)',
		async (claims, authError, granted, expected) => {
			const rpc = vi.fn(() => ({ abortSignal: async () => ({ data: granted, error: null }) }));
			const result = await rootLoad({
				url: new URL('https://example.com/produtos/mapa-astral'),
				locals: {
					supabase: {
						auth: { getClaims: async () => ({ data: { claims }, error: authError }) },
						rpc
					}
				}
			} as unknown as Parameters<typeof rootLoad>[0]);
			expect(result).toMatchObject({ trialAccess: expected });
			expect(rpc).toHaveBeenCalledTimes(claims && !authError ? 1 : 0);
		}
	);
	it('fails closed on a failed grant lookup', async () => {
		const result = await rootLoad({
			url: new URL('https://example.com/produtos/mapa-astral'),
			locals: {
				supabase: {
					auth: { getClaims: async () => ({ data: { claims: { sub: owner } }, error: null }) },
					rpc: () => ({
						abortSignal: async () => {
							throw new Error('private');
						}
					})
				}
			}
		} as unknown as Parameters<typeof rootLoad>[0]);
		expect(result).toMatchObject({ trialAccess: false });
	});
	it.each(productCatalog.filter((p) => p.universe !== 'global').map((p) => p.id))(
		'redirects legacy %s to its private trial',
		async (productId) => {
			await expect(
				legacyLoad({
					params: { productId },
					parent: async () => ({ user: { id: owner }, trialAccess: true }),
					locals: {},
					setHeaders: vi.fn()
				} as unknown as Parameters<typeof legacyLoad>[0])
			).rejects.toMatchObject({ status: 303, location: `/testar-produtos/${productId}` });
		}
	);
	it('retains the login return path for anonymous legacy visits', async () => {
		await expect(
			legacyLoad({
				params: { productId: 'birth-chart' },
				parent: async () => ({ user: null, trialAccess: false }),
				locals: {},
				setHeaders: vi.fn()
			} as unknown as Parameters<typeof legacyLoad>[0])
		).rejects.toMatchObject({
			status: 303,
			location: '/entrar?next=%2Fbiblioteca%2Fnova%2Fbirth-chart'
		});
	});
	it('does not redirect an ungranted user into a trial', async () => {
		const result = await legacyLoad({
			params: { productId: 'birth-chart' },
			parent: async () => ({ user: { id: owner }, trialAccess: false }),
			locals: {},
			setHeaders: vi.fn()
		} as unknown as Parameters<typeof legacyLoad>[0]);
		expect(result).toMatchObject({ productId: 'birth-chart', ownerId: owner });
	});
	it('loads only the verified owner’s trial history with a bounded query', async () => {
		const rows = [{ id: owner, product_id: 'birth-chart', created_at: '2026-10-06T12:00:00Z' }];
		const query = {
			select: vi.fn(),
			eq: vi.fn(),
			order: vi.fn(),
			limit: vi.fn(),
			abortSignal: vi.fn(async () => ({ data: rows, error: null }))
		};
		for (const method of ['select', 'eq', 'order', 'limit'] as const)
			query[method].mockReturnValue(query);
		const from = vi.fn(() => query);
		expect(await readTrialLibrary({ from } as unknown as SupabaseClient, owner)).toEqual({
			readings: rows,
			unavailable: false
		});
		expect(from).toHaveBeenCalledWith('atv_trial_readings');
		expect(query.eq).toHaveBeenCalledWith('owner_id', owner);
		expect(query.limit).toHaveBeenCalledWith(100);
		query.abortSignal.mockRejectedValue(new Error('private'));
		expect(await readTrialLibrary({ from } as unknown as SupabaseClient, owner)).toEqual({
			readings: [],
			unavailable: true
		});
	});
	it.each(['sb-project-auth-token', 'sb-project-auth-token.0'])(
		'prevents caching account-specific product pages (%s)',
		async (name) => {
			const response = await handle({
				event: {
					locals: {},
					url: new URL('https://example.com/produtos/mapa-astral'),
					cookies: { getAll: () => [{ name, value: 'synthetic' }] }
				},
				resolve: async () => new Response('catalog')
			} as unknown as Parameters<typeof handle>[0]);
			expect(response.headers.get('cache-control')).toBe('private, no-store');
		}
	);
});
