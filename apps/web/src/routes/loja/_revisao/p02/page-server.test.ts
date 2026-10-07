import { beforeEach, describe, expect, it, vi } from 'vitest';

const environment = vi.hoisted(() => ({ dev: false }));
vi.mock('$app/environment', () => environment);
import { load } from './+page.server';

describe('P02 gated collection review', () => {
	beforeEach(() => {
		environment.dev = false;
	});

	it('returns 404 in production even for a localhost URL and forwarded development host', async () => {
		const setHeaders = vi.fn();
		await expect(
			load({
				setHeaders,
				url: new URL('https://localhost/loja/_revisao/p02'),
				request: new Request('https://localhost/loja/_revisao/p02', {
					headers: { 'x-forwarded-host': '127.0.0.1' }
				})
			} as never)
		).rejects.toMatchObject({ status: 404 });
		expect(setHeaders).not.toHaveBeenCalled();
	});

	it('keeps the local review out of caches and indexing', async () => {
		environment.dev = true;
		const setHeaders = vi.fn();
		await load({ setHeaders } as never);
		expect(setHeaders).toHaveBeenCalledWith({
			'cache-control': 'private, no-store',
			'x-robots-tag': 'noindex, nofollow'
		});
	});

	it('opens only the dedicated HTTPS Pages branch alias outside development', async () => {
		const setHeaders = vi.fn();
		await load({
			setHeaders,
			url: new URL(
				'https://codex-p02-catalogo-revisao-v.atuavidanosastros.pages.dev/loja/_revisao/p02'
			)
		} as never);
		expect(setHeaders).toHaveBeenCalledWith({
			'cache-control': 'private, no-store',
			'x-robots-tag': 'noindex, nofollow'
		});
	});

	it.each([
		'https://atuavidanosastros.com.br',
		'https://atuavidanosastros.pages.dev',
		'https://another.atuavidanosastros.pages.dev',
		'https://codex-p02-catalogo-revisao-v.atuavidanosastros.pages.dev.evil.example',
		'http://codex-p02-catalogo-revisao-v.atuavidanosastros.pages.dev'
	])('does not expose the pending catalog at %s', async (origin) => {
		await expect(
			load({ setHeaders: vi.fn(), url: new URL(origin) } as never)
		).rejects.toMatchObject({ status: 404 });
	});
});
