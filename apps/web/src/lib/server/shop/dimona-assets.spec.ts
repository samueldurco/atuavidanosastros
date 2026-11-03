import { createCipheriv, createHmac } from 'node:crypto';
import { expect, it, vi } from 'vitest';
import { dimonaAssetUrls, getDimonaVariant, serveDimonaAsset } from './dimona-assets';

vi.mock('./dimona-art-manifest.json', () => {
	const hash = 'fbc4d5f6c0e3491d63b9839cb3365a6aaad02eac8e404ea827746861198a4f01';
	return {
		default: {
			products: { fixture: hash },
			variants: { '68006902235504': ['fixture', 'a'.repeat(64)] },
			sizes: { [hash]: 15, ['a'.repeat(64)]: 4 }
		}
	};
});

const env = { DIMONA_ASSET_SIGNING_KEY: '4f'.repeat(32) };
const variant = 'gid://shopify/ProductVariant/68006902235504';
const t = Date.UTC(2026, 10, 3);
const order = 'gid://shopify/Order/123456789';
const object = (hash: string) => {
	const raw = Buffer.from(env.DIMONA_ASSET_SIGNING_KEY, 'hex');
	const aes = createHmac('sha256', raw).update('dimona:assets:aes-gcm:v1').digest();
	const nonce = Buffer.alloc(12, 1);
	const cipher = createCipheriv('aes-256-gcm', aes, nonce);
	cipher.setAAD(Buffer.from('dimona-art-v1:' + hash));
	return Buffer.concat([
		nonce,
		cipher.update('industrial test'),
		cipher.final(),
		cipher.getAuthTag()
	]);
};

it('signs only mapped variants and hides the Shopify order ID', async () => {
	expect(getDimonaVariant('68006902235504')).toEqual(getDimonaVariant(variant));
	expect(getDimonaVariant('gid://shopify/Product/68006902235504')).toBeUndefined();
	await expect(dimonaAssetUrls({}, variant, order, t)).rejects.toThrow();
	await expect(dimonaAssetUrls(env, '999', order, t)).rejects.toThrow();
	const urls = await dimonaAssetUrls(env, variant, order, t);
	expect(urls.design).not.toContain('123456789');
	expect(new URL(urls.mock).pathname).toMatch(/\.jpg$/);
	expect(urls).not.toEqual(await dimonaAssetUrls(env, variant, 'other-order', t));
});

it('denies unsigned, expired, tampered or alternate-host URLs before fetching the encrypted object', async () => {
	const { design, mock } = await dimonaAssetUrls(env, variant, order, t);
	const fetcher = vi.fn();
	for (const url of [
		design.split('?')[0],
		design + '&extra=1',
		design.replace('.png', '.jpg'),
		design.replace('atuavidanosastros.com.br', 'preview.example'),
		mock.split('?')[0] + '?' + design.split('?')[1]
	]) {
		expect((await serveDimonaAsset(new Request(url), env, fetcher, t)).status).toBe(404);
	}
	expect(
		(await serveDimonaAsset(new Request(design), env, fetcher, t + 61 * 86400000)).status
	).toBe(404);
	expect(fetcher).not.toHaveBeenCalled();
});

it('decrypts only the exact content and lets the factory check the file type and size', async () => {
	const { design } = await dimonaAssetUrls(env, variant, order, t);
	const hash = getDimonaVariant(variant)!.designSha256;
	const data = object(hash);
	const fetcher = vi.fn(
		async () =>
			new Response(new Uint8Array(data), { headers: { 'content-length': String(data.length) } })
	);
	const good = await serveDimonaAsset(new Request(design), env, fetcher, t);
	expect(good.status).toBe(200);
	expect(good.headers.get('cache-control')).toContain('no-store');
	expect(good.headers.get('content-type')).toBe('image/png');
	expect(await good.text()).toBe('industrial test');
	expect(fetcher).toHaveBeenCalledWith(
		'https://atvna-matrizes-seladas.pages.dev/v1/' + hash + '.bin',
		expect.objectContaining({ redirect: 'manual' })
	);
	const head = await serveDimonaAsset(new Request(design, { method: 'HEAD' }), env, fetcher, t);
	expect(head.headers.get('content-length')).toBe('15');
	expect(await head.text()).toBe('');
	data[20] ^= 1;
	const corrupt = await serveDimonaAsset(new Request(design), env, fetcher, t);
	expect(corrupt.status).toBe(503);
	expect(await corrupt.text()).toBe('');
});

it('rejects a redirect from the encrypted object host without following it', async () => {
	const { design } = await dimonaAssetUrls(env, variant, order, t);
	const fetcher = vi.fn(async () => Response.redirect('https://elsewhere.example/asset', 302));
	const response = await serveDimonaAsset(new Request(design), env, fetcher, t);
	expect(response.status).toBe(503);
	expect(response.headers.has('location')).toBe(false);
	expect(fetcher).toHaveBeenCalledTimes(1);
});
