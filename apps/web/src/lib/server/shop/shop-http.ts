import { json } from '@sveltejs/kit';
import {
	createShopCart,
	createShopPreviewCart,
	readShopCatalog,
	readShopProduct,
	ShopStorefrontError,
	type StorefrontConfig
} from './shopify-storefront';

type PrivateEnv = Record<string, string | undefined>;
const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' };
const reply = (body: unknown, status = 200) => json(body, { status, headers });
class ShopHttpError extends Error {
	constructor(
		readonly code: string,
		readonly status: number
	) {
		super(code);
	}
}

async function authorized(request: Request, secret: string): Promise<boolean> {
	const supplied = request.headers.get('authorization') ?? '';
	if (secret.length < 32 || supplied.length > 512 || !supplied.startsWith('Bearer ')) return false;
	const encoder = new TextEncoder();
	const [expected, received] = await Promise.all([
		crypto.subtle.digest('SHA-256', encoder.encode(secret)),
		crypto.subtle.digest('SHA-256', encoder.encode(supplied.slice(7)))
	]);
	const left = new Uint8Array(expected),
		right = new Uint8Array(received);
	let difference = 0;
	for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
	return difference === 0;
}

function config(env: PrivateEnv): StorefrontConfig | null {
	if (
		!env.SHOPIFY_STORE_DOMAIN ||
		!env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN ||
		env.SHOPIFY_STOREFRONT_API_VERSION !== '2026-10'
	)
		return null;
	return {
		shopDomain: env.SHOPIFY_STORE_DOMAIN,
		privateToken: env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN,
		apiVersion: '2026-10',
		allowedCheckoutHosts: env.SHOPIFY_CHECKOUT_HOSTS
			? env.SHOPIFY_CHECKOUT_HOSTS.split(',').map((host) => host.trim())
			: undefined
	};
}

async function readBody(request: Request): Promise<unknown> {
	if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type') ?? ''))
		throw new ShopHttpError('invalid_content_type', 415);
	const declared = request.headers.get('content-length');
	if (declared && (!/^\d+$/.test(declared) || Number(declared) > 4096))
		throw new ShopHttpError('body_too_large', 413);
	const reader = request.body?.getReader();
	if (!reader) throw new ShopHttpError('invalid_body', 400);
	const chunks: Uint8Array[] = [];
	let length = 0;
	try {
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			length += value.length;
			if (length > 4096) {
				await reader.cancel();
				throw new ShopHttpError('body_too_large', 413);
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const raw = new Uint8Array(length);
	let offset = 0;
	for (const chunk of chunks) {
		raw.set(chunk, offset);
		offset += chunk.length;
	}
	try {
		return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
	} catch {
		throw new ShopHttpError('invalid_json', 400);
	}
}

function failure(error: unknown, diagnostic = false) {
	const known = error instanceof ShopStorefrontError || error instanceof ShopHttpError;
	const provider =
		diagnostic && error instanceof ShopStorefrontError ? error.providerDiagnostic : undefined;
	const metadata: { providerCategory?: string; providerHttpStatus?: number } = {};
	if (
		provider &&
		['http_error', 'graphql_error', 'transport_type_error', 'transport_error', 'timeout'].includes(
			provider.category
		)
	) {
		metadata.providerCategory = provider.category;
		if (
			typeof provider.httpStatus === 'number' &&
			Number.isInteger(provider.httpStatus) &&
			provider.httpStatus >= 100 &&
			provider.httpStatus <= 599
		)
			metadata.providerHttpStatus = provider.httpStatus;
	}
	return reply(
		{ ok: false, code: known ? error.code : 'shop_unavailable', ...metadata },
		known ? error.status : 503
	);
}

export async function shopCatalog(
	env: PrivateEnv,
	fetcher: typeof fetch,
	buyerIp?: string,
	cursor?: string
) {
	if (env.FEATURE_PHYSICAL_CHECKOUT !== 'true')
		return reply({ ok: false, code: 'physical_commerce_disabled' }, 503);
	const shop = config(env);
	if (!shop) return reply({ ok: false, code: 'shop_not_configured' }, 503);
	try {
		return reply({ ok: true, ...(await readShopCatalog(shop, fetcher, buyerIp, cursor)) });
	} catch (error) {
		return failure(error);
	}
}

export async function shopCart(
	request: Request,
	env: PrivateEnv,
	fetcher: typeof fetch,
	buyerIp?: string
) {
	if (env.FEATURE_PHYSICAL_CHECKOUT !== 'true')
		return reply({ ok: false, code: 'physical_commerce_disabled' }, 503);
	const url = new URL(request.url);
	if (
		request.headers.get('origin') !== url.origin ||
		request.headers.get('sec-fetch-site') === 'cross-site'
	)
		return reply({ ok: false, code: 'invalid_origin' }, 403);
	const shop = config(env);
	if (!shop) return reply({ ok: false, code: 'shop_not_configured' }, 503);
	try {
		const body = await readBody(request);
		if (
			!body ||
			typeof body !== 'object' ||
			Array.isArray(body) ||
			Object.keys(body).some((key) => key !== 'lines') ||
			!Array.isArray((body as { lines?: unknown }).lines) ||
			!(body as { lines: unknown[] }).lines.length
		)
			throw new ShopHttpError('invalid_lines', 400);
		const cart = await createShopCart(
			shop,
			fetcher,
			(body as { lines: Parameters<typeof createShopCart>[2] }).lines,
			buyerIp
		);
		return reply({ ok: true, checkoutUrl: cart.checkoutUrl, totalQuantity: cart.totalQuantity });
	} catch (error) {
		return failure(error);
	}
}

export async function shopDiagnostic(request: Request, env: PrivateEnv, fetcher: typeof fetch) {
	// Private smoke test. The server chooses an existing variant; no buyer/payment payloads.
	if (env.SHOPIFY_DIAGNOSTIC_ENABLED !== 'true')
		return reply({ ok: false, code: 'diagnostic_disabled' }, 404);
	const secret = env.SHOPIFY_DIAGNOSTIC_TOKEN ?? '';
	if (!(await authorized(request, secret))) return reply({ ok: false, code: 'unauthorized' }, 401);
	const shop = config(env);
	if (!shop) return reply({ ok: false, code: 'shop_not_configured' }, 503);
	try {
		const body = await readBody(request);
		if (
			!body ||
			typeof body !== 'object' ||
			Array.isArray(body) ||
			Object.keys(body).some((key) => key !== 'mode')
		)
			throw new ShopHttpError('invalid_diagnostic', 400);
		const mode = (body as { mode?: unknown }).mode;
		if (mode === 'catalog') {
			const catalog = await readShopCatalog(shop, fetcher);
			return reply({
				ok: true,
				mode,
				catalogAccessible: true,
				visibleProducts: catalog.products.length,
				hasNextPage: catalog.pageInfo.hasNextPage
			});
		}
		if (mode === 'empty-cart') {
			const cart = await createShopCart(shop, fetcher, []);
			return reply({
				ok: true,
				mode,
				emptyCartCreated: cart.totalQuantity === 0,
				checkoutUrlPresent: Boolean(cart.checkoutUrl),
				totalQuantity: cart.totalQuantity,
				ordersCreated: 0,
				paymentsCreated: 0
			});
		}
		if (mode === 'cart-lines') {
			const catalog = await readShopCatalog(shop, fetcher);
			const variant = catalog.products
				.filter((product) => product.availableForSale)
				.flatMap((product) => product.variants)
				.find((variant) => variant.availableForSale);
			if (!variant) throw new ShopHttpError('no_available_variant', 409);
			const cart = await createShopPreviewCart(shop, fetcher, [
				{ merchandiseId: variant.id, quantity: 1 }
			]);
			return reply({
				ok: true,
				mode,
				existingVariantUsed: true,
				totalQuantity: cart.totalQuantity,
				checkoutUrlPresent: Boolean(cart.checkoutUrl),
				costPresent: true,
				deliveryGroups: cart.deliveryGroups.length,
				deliveryOptions: cart.deliveryGroups.reduce((sum, group) => sum + group.options.length, 0),
				carrierRatesAtCheckout: true,
				ordersCreated: 0,
				paymentsCreated: 0
			});
		}
		throw new ShopHttpError('invalid_diagnostic', 400);
	} catch (error) {
		return failure(error, true);
	}
}

/** The isolated preparation Worker is the only caller. This does not release public commerce. */
export async function shopPreview(
	request: Request,
	env: PrivateEnv,
	fetcher: typeof fetch,
	buyerIp?: string
) {
	if (env.SHOPIFY_PREVIEW_ENABLED !== 'true' || env.SHOPIFY_DIAGNOSTIC_ENABLED !== 'true')
		return reply({ ok: false, code: 'preview_disabled' }, 404);
	if (!(await authorized(request, env.SHOPIFY_DIAGNOSTIC_TOKEN ?? '')))
		return reply({ ok: false, code: 'unauthorized' }, 401);
	const origin = request.headers.get('origin');
	if (
		(origin && origin !== new URL(request.url).origin) ||
		request.headers.get('sec-fetch-site') === 'cross-site'
	)
		return reply({ ok: false, code: 'invalid_origin' }, 403);
	const shop = config(env);
	if (!shop) return reply({ ok: false, code: 'shop_not_configured' }, 503);
	try {
		const body = await readBody(request);
		if (!body || typeof body !== 'object' || Array.isArray(body))
			throw new ShopHttpError('invalid_preview', 400);
		const input = body as Record<string, unknown>;
		const only = (keys: string[]) => Object.keys(input).every((key) => keys.includes(key));
		if (input.mode === 'catalog' && only(['mode', 'cursor'])) {
			const catalog = await readShopCatalog(
				shop,
				fetcher,
				buyerIp,
				input.cursor as string | undefined
			);
			return reply({ ok: true, ...catalog });
		}
		if (input.mode === 'product' && only(['mode', 'handle', 'cursor'])) {
			const product = await readShopProduct(
				shop,
				fetcher,
				input.handle as string,
				buyerIp,
				input.cursor as string | undefined
			);
			return product
				? reply({ ok: true, product })
				: reply({ ok: false, code: 'product_not_found' }, 404);
		}
		if (
			input.mode === 'cart' &&
			only(['mode', 'lines', 'deliveryAddress']) &&
			Array.isArray(input.lines) &&
			input.lines.length
		) {
			const cart = await createShopPreviewCart(
				shop,
				fetcher,
				input.lines as Parameters<typeof createShopPreviewCart>[2],
				buyerIp,
				input.deliveryAddress as Parameters<typeof createShopPreviewCart>[4]
			);
			return reply({
				ok: true,
				checkoutUrl: cart.checkoutUrl,
				totalQuantity: cart.totalQuantity,
				cost: cart.cost,
				deliveryGroups: cart.deliveryGroups,
				deliveryGroupsHasNextPage: cart.deliveryGroupsHasNextPage,
				carrierRatesAtCheckout: true,
				ordersCreated: 0,
				paymentsCreated: 0
			});
		}
		throw new ShopHttpError('invalid_preview', 400);
	} catch (error) {
		return failure(error);
	}
}
