import { describe, expect, it, vi } from 'vitest';
import { permanentPublicDestination } from './public-redirects';
import { handle } from '../../hooks.server';

vi.mock('$env/dynamic/public', () => ({ env: {} }));

describe('public URL migration', () => {
	it('retains query parameters when moving topics and the magazine', () => {
		expect(
			permanentPublicDestination(
				new URL('https://example.test/caderno?tema=proposito&utm_source=old')
			)
		).toBe('/revista?tema=proposito&utm_source=old');
		expect(permanentPublicDestination(new URL('https://example.test/meu-ceu/'))).toBe(
			'/temas/mapa-astral'
		);
	});
	it.each(['/mapa-de-proposito', '/mapa-de-proposito/', '/mapa-de-proposito?origem=old'])(
		'preserves the indexable public landing %s instead of redirecting to a preparing product',
		(path) => {
			expect(permanentPublicDestination(new URL(`https://example.test${path}`))).toBeNull();
		}
	);
	it('preserves article/tool collisions and private IDs', () => {
		for (const path of [
			'/mapa-astral',
			'/ascendente',
			'/bussola-de-carreira',
			'/horoscopo/aries',
			'/temas/mapa-astral',
			'/ferramentas/mapa-astral',
			'/api/free-tools/calculate',
			'/biblioteca/663e45de-bd5b-4b1f-ae05-d17192a8a4e5',
			'/testar-produtos/birth-chart',
			'/produtos/mapa-astral',
			'/caderno-extra'
		])
			expect(permanentPublicDestination(new URL(`https://example.test${path}`)), path).toBeNull();
	});
	it.each(['GET', 'HEAD'])(
		'redirects safe %s requests before resolving the old page',
		async (method) => {
			const url = new URL('https://example.test/caderno?tema=proposito');
			const resolve = vi.fn(async () => new Response('old page'));
			const response = await handle({
				event: { url, request: new Request(url, { method }), locals: {} },
				resolve
			} as unknown as Parameters<typeof handle>[0]);
			expect(response.status).toBe(301);
			expect(response.headers.get('location')).toBe('/revista?tema=proposito');
			expect(resolve).not.toHaveBeenCalled();
		}
	);
	it.each(['POST', undefined])('does not assume a redirect for a %s method', async (method) => {
		const url = new URL('https://example.test/caderno');
		const resolve = vi.fn(async () => new Response('resolved page'));
		const response = await handle({
			event: {
				url,
				request: method ? new Request(url, { method }) : undefined,
				locals: {},
				cookies: { getAll: () => [] }
			},
			resolve
		} as unknown as Parameters<typeof handle>[0]);
		expect(response.status).toBe(200);
		expect(response.headers.get('location')).toBeNull();
		expect(resolve).toHaveBeenCalledOnce();
	});
	it.each(['GET', 'HEAD'])('resolves the preserved public landing for %s', async (method) => {
		const url = new URL('https://example.test/mapa-de-proposito?origem=old');
		const resolve = vi.fn(async () => new Response('public landing'));
		const response = await handle({
			event: {
				url,
				request: new Request(url, { method }),
				locals: {},
				cookies: { getAll: () => [] }
			},
			resolve
		} as unknown as Parameters<typeof handle>[0]);
		expect(response.status).toBe(200);
		expect(response.headers.get('location')).toBeNull();
		expect(resolve).toHaveBeenCalledOnce();
	});
});
