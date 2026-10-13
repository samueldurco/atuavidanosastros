import { describe, expect, it, vi } from 'vitest';
import { permanentPublicDestination } from './public-redirects';
import { handle } from '../../hooks.server';

vi.mock('$env/dynamic/public', () => ({ env: {} }));

const canonicalHostCases = [
	['/', '/'],
	['/meu-ceu', '/temas/mapa-astral'],
	['/ciclos', '/temas/previsoes'],
	['/amor', '/temas/amor'],
	['/proposito', '/temas/carreira'],
	['/tarot', '/temas/tarot'],
	['/sonhos', '/temas/sonhos'],
	['/caderno/', '/revista'],
	['/mapa-de-proposito', '/mapa-de-proposito'],
	['/noticias/2026/10/sol-lua-ascendente', '/noticias/2026/10/sol-lua-ascendente'],
	['/ferramentas/ascendente', '/ferramentas/ascendente'],
	['/foo/', '/foo/'],
	['/caderno-extra', '/caderno-extra'],
	['/caderno%2F', '/caderno%2F'],
	['/meu-ceu/foo', '/meu-ceu/foo'],
	[
		'/biblioteca/663e45de-bd5b-4b1f-ae05-d17192a8a4e5',
		'/biblioteca/663e45de-bd5b-4b1f-ae05-d17192a8a4e5'
	],
	['/api/free-tools/calculate', '/api/free-tools/calculate']
].flatMap(([path, destination]) =>
	['GET', 'HEAD'].map((method) => ({ path, destination, method }))
);

describe('public URL migration', () => {
	it.each(canonicalHostCases)(
		'redirects HTTPS www $path to the canonical host in one hop for $method',
		async ({ path, destination, method }) => {
			const query = '?origem=host%20redirect&x=1&x=2&next=%2Fbiblioteca';
			const url = new URL(`https://www.atuavidanosastros.com.br${path}${query}`);
			const resolve = vi.fn(async () => new Response('duplicate page'));
			const response = await handle({
				event: { url, request: new Request(url, { method }), locals: {} },
				resolve
			} as unknown as Parameters<typeof handle>[0]);
			expect(response.status).toBe(301);
			expect(response.headers.get('location')).toBe(
				`https://atuavidanosastros.com.br${destination}${query}`
			);
			expect(resolve).not.toHaveBeenCalled();
		}
	);
	it.each([
		'https://atuavidanosastros.com.br',
		'https://78bfd7fc.atuavidanosastros.pages.dev',
		'http://localhost:4173',
		'https://example.test',
		'https://www.atuavidanosastros.com.br.evil.example',
		'https://preview.www.atuavidanosastros.com.br',
		'http://www.atuavidanosastros.com.br',
		'https://www.atuavidanosastros.com.br:8443'
	])('retains the existing path behavior for origin %s', (origin) => {
		expect(permanentPublicDestination(new URL(`${origin}/ferramentas/ascendente`))).toBeNull();
		expect(permanentPublicDestination(new URL(`${origin}/caderno?tema=proposito`))).toBe(
			'/revista?tema=proposito'
		);
	});
	it.each(['POST', 'PUT'])(
		'does not redirect a www %s request or alter its path/query',
		async (method) => {
			for (const path of ['/caderno', '/api/free-tools/calculate']) {
				const url = new URL(`https://www.atuavidanosastros.com.br${path}?x=1&x=2`);
				const originalHref = url.href;
				const request = new Request(url, { method, body: 'preserved request' });
				const event = { url, request, locals: {}, cookies: { getAll: () => [] } };
				const resolve = vi.fn(async () => new Response('resolved page'));
				const response = await handle({
					event,
					resolve
				} as unknown as Parameters<typeof handle>[0]);
				expect(response.status).toBe(200);
				expect(response.headers.get('location')).toBeNull();
				expect(resolve).toHaveBeenCalledOnce();
				expect(resolve).toHaveBeenCalledWith(event);
				expect(event.url.href).toBe(originalHref);
				expect(event.request.method).toBe(method);
				expect(await event.request.text()).toBe('preserved request');
			}
		}
	);
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
			'/caderno-extra',
			'/caderno%2F'
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
