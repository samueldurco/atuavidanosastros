import manifest from './dimona-art-manifest.json';
import skuMap from './national-skus.json';
import { fail, type PrivateEnv } from './freight-provider';

const shopOrigin = 'https://atuavidanosastros.com.br';
const sealedOrigin = 'https://atvna-matrizes-seladas.pages.dev';
const assetRoute = '/api/shop/dimona/assets/';
const validity = 60 * 24 * 60 * 60;
const products: Record<string, string> = manifest.products;
const variants: Record<string, string[]> = manifest.variants;
const sizes: Record<string, number> = manifest.sizes;
const skus: Record<string, string> = skuMap;
const text = new TextEncoder();
const hex = (bytes: ArrayBuffer) =>
	Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
const unhex = (value: string) =>
	Uint8Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));

export function getDimonaVariant(variantId: string) {
	const id = /^(?:gid:\/\/shopify\/ProductVariant\/)?(\d+)$/.exec(variantId)?.[1];
	if (!id || !variants[id] || !skus[id]) return;
	const [slug, mockHash] = variants[id];
	return {
		variantId: 'gid://shopify/ProductVariant/' + id,
		sku: skus[id],
		slug,
		designSha256: products[slug],
		mockPath: mockHash + '.jpg'
	};
}

async function masterKey(env: PrivateEnv) {
	const raw = env.DIMONA_ASSET_SIGNING_KEY;
	if (!raw || !/^[a-f\d]{64}$/.test(raw)) return fail('dimona_assets_unconfigured', 503);
	return crypto.subtle.importKey('raw', unhex(raw), { name: 'HMAC', hash: 'SHA-256' }, false, [
		'sign',
		'verify'
	]);
}

const sign = (key: CryptoKey, input: string) => crypto.subtle.sign('HMAC', key, text.encode(input));
const ticketMessage = (name: string, expiry: string, ticket: string) =>
	['dimona:assets:link:v1', name, expiry, ticket].join('\n');

export async function dimonaAssetUrls(
	env: PrivateEnv,
	variantId: string,
	orderId: string,
	now = Date.now()
) {
	const item = getDimonaVariant(variantId);
	if (!item || !/^[a-zA-Z0-9_:/-]{1,128}$/.test(orderId)) return fail('dimona_asset_unmapped', 422);
	const key = await masterKey(env);
	const expires = String(Math.floor(now / 1000) + validity);
	const ticket = hex(await sign(key, 'dimona:assets:order:v1\n' + orderId)).slice(0, 32);
	const url = async (name: string) => {
		const sig = hex(await sign(key, ticketMessage(name, expires, ticket)));
		return shopOrigin + assetRoute + name + '?' + new URLSearchParams({ expires, ticket, sig });
	};
	const [design, mock] = await Promise.all([url(item.designSha256 + '.png'), url(item.mockPath)]);
	return { design, mock };
}

const safeHeaders = {
	'Cache-Control': 'private, no-store',
	'Referrer-Policy': 'no-referrer',
	'X-Robots-Tag': 'noindex, nofollow, noarchive',
	'X-Content-Type-Options': 'nosniff'
};

export async function serveDimonaAsset(
	request: Request,
	env: PrivateEnv,
	fetcher: typeof fetch,
	now = Date.now()
) {
	const url = new URL(request.url);
	const name = url.pathname.slice(assetRoute.length);
	const file = /^([a-f0-9]{64})\.(png|jpg)$/.exec(name);
	const deny = () => new Response(null, { status: 404, headers: safeHeaders });
	const { searchParams: params } = url;
	const expires = params.get('expires') ?? '',
		ticket = params.get('ticket') ?? '',
		sig = params.get('sig') ?? '';
	const seconds = Math.floor(now / 1000);
	if (
		!['HEAD', 'GET'].includes(request.method) ||
		url.origin !== shopOrigin ||
		!url.pathname.startsWith(assetRoute) ||
		!file ||
		!sizes[file[1]] ||
		params.size !== 3 ||
		!/^\d{10}$/.test(expires) ||
		+expires <= seconds ||
		+expires > seconds + validity ||
		!/^[a-f0-9]{32}$/.test(ticket) ||
		!/^[a-f0-9]{64}$/.test(sig)
	)
		return deny();
	try {
		const key = await masterKey(env);
		if (
			!(await crypto.subtle.verify(
				'HMAC',
				key,
				unhex(sig),
				text.encode(ticketMessage(name, expires, ticket))
			))
		)
			return deny();
		const [, hash, ext] = file;
		const size = sizes[hash];
		const headers = {
			...safeHeaders,
			'Content-Type': ext === 'png' ? 'image/png' : 'image/jpeg',
			'Content-Length': String(size)
		};
		const response = await fetcher(sealedOrigin + '/v1/' + hash + '.bin', {
			method: request.method,
			redirect: 'error',
			signal: AbortSignal.timeout(20000)
		});
		const length = response.headers.get('content-length');
		if (response.status !== 200 || (length !== null && Number(length) !== size + 28))
			throw Error('asset unavailable');
		if (request.method === 'HEAD') return new Response(null, { headers });
		const sealed = new Uint8Array(await response.arrayBuffer());
		if (sealed.length !== size + 28) throw Error('invalid object length');
		const aes = await crypto.subtle.importKey(
			'raw',
			await sign(key, 'dimona:assets:aes-gcm:v1'),
			'AES-GCM',
			false,
			['decrypt']
		);
		const plain = await crypto.subtle.decrypt(
			{
				name: 'AES-GCM',
				iv: sealed.subarray(0, 12),
				additionalData: text.encode('dimona-art-v1:' + hash)
			},
			aes,
			sealed.subarray(12)
		);
		if (hex(await crypto.subtle.digest('SHA-256', plain)) !== hash)
			throw Error('invalid object content');
		return new Response(plain, { headers });
	} catch {
		return new Response(null, { status: 503, headers: safeHeaders });
	}
}
