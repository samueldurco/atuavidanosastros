/** Server-only Shopify transport. Routes own authorization, feature gates and release decisions. */
export const STOREFRONT_API_VERSION = '2026-10' as const;
export const STOREFRONT_TIMEOUT_MS = 8_000;
export const CATALOG_PAGE_SIZE = 25;
export const CATALOG_VARIANTS_LIMIT = 50;
export const CART_LINES_LIMIT = 20;
export const CART_QUANTITY_LIMIT = 10;
const MAX_RESPONSE_BYTES = 1_048_576;
const MAX_CATALOG_CURSOR_BYTES = 2_048;

export interface StorefrontConfig {
	shopDomain: string;
	privateToken: string;
	apiVersion: typeof STOREFRONT_API_VERSION;
	/** Explicit, server-controlled custom checkout hosts; never supplied by a buyer. */
	allowedCheckoutHosts?: readonly string[];
}
export interface ShopCartLine {
	merchandiseId: string;
	quantity: number;
}
export interface ShopPageInfo {
	hasNextPage: boolean;
	endCursor: string | null;
}
export interface ShopMoney {
	amount: string;
	currencyCode: string;
}
export interface ShopCatalogVariant {
	id: string;
	title: string;
	availableForSale: boolean;
	price: ShopMoney;
	selectedOptions: { name: string; value: string }[];
}
export interface ShopCatalogProduct {
	id: string;
	handle: string;
	title: string;
	description: string;
	availableForSale: boolean;
	featuredImage: {
		url: string;
		altText: string | null;
		width: number | null;
		height: number | null;
	} | null;
	variants: ShopCatalogVariant[];
	variantsPageInfo: ShopPageInfo;
}
export interface ShopCatalog {
	products: ShopCatalogProduct[];
	pageInfo: ShopPageInfo;
}
export interface ShopCart {
	/** Contains the cart access key. Do not log it or put it in diagnostics. */
	id: string;
	checkoutUrl: string;
	totalQuantity: number;
}
export interface ShopDeliveryAddress {
	countryCode: 'BR';
	zip: string;
	provinceCode: string;
	city: string;
	address1: string;
}
export interface ShopPreviewCart extends ShopCart {
	cost: { subtotalAmount: ShopMoney; totalAmount: ShopMoney };
	deliveryGroups: { options: { title: string | null; estimatedCost: ShopMoney }[] }[];
	deliveryGroupsHasNextPage: boolean;
}
type ErrorCode =
	| 'invalid_configuration'
	| 'invalid_buyer_ip'
	| 'invalid_cursor'
	| 'invalid_product'
	| 'invalid_delivery_address'
	| 'invalid_cart'
	| 'provider_unavailable'
	| 'provider_timeout'
	| 'invalid_provider_response';
const errorStatus: Record<ErrorCode, number> = {
	invalid_configuration: 503,
	invalid_buyer_ip: 400,
	invalid_cursor: 400,
	invalid_product: 400,
	invalid_delivery_address: 400,
	invalid_cart: 422,
	provider_unavailable: 503,
	provider_timeout: 504,
	invalid_provider_response: 503
};
interface ProviderDiagnostic {
	category: 'http_error' | 'graphql_error' | 'transport_type_error' | 'transport_error' | 'timeout';
	httpStatus?: number;
}
export class ShopStorefrontError extends Error {
	readonly status: number;
	constructor(
		readonly code: ErrorCode,
		/** Static metadata for the authenticated diagnostic only. Never copy provider content. */
		readonly providerDiagnostic?: ProviderDiagnostic
	) {
		super(code);
		this.name = 'ShopStorefrontError';
		this.status = errorStatus[code];
	}
}

const CATALOG_QUERY = `query ShopRuntimeCatalog($cursor: String) @inContext(country: BR) {
  products(first: 25, after: $cursor) {
    nodes {
      id handle title description availableForSale
      featuredImage { url altText width height }
      variants(first: 50) {
        nodes { id title availableForSale price { amount currencyCode } selectedOptions { name value } }
        pageInfo { hasNextPage endCursor }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;
const CART_MUTATION = `mutation ShopRuntimeCart($input: CartInput!) {
  cartCreate(input: $input) {
    cart { id checkoutUrl totalQuantity }
    userErrors { field message code }
  }
}`;
const PRODUCT_QUERY = `query ShopPreviewProduct($handle: String!, $cursor: String) @inContext(country: BR) {
  product(handle: $handle) {
    id handle title description availableForSale
    featuredImage { url altText width height }
    variants(first: 50, after: $cursor) {
      nodes { id title availableForSale price { amount currencyCode } selectedOptions { name value } }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;
// Carrier-calculated rates require @defer. This JSON transport requests static rates only.
const PREVIEW_CART_MUTATION = `mutation ShopPreviewCart($input: CartInput!) {
  cartCreate(input: $input) {
    cart {
      id checkoutUrl totalQuantity
      cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
      deliveryGroups(first: 20) {
        nodes { deliveryOptions { title estimatedCost { amount currencyCode } } }
        pageInfo { hasNextPage }
      }
    }
    userErrors { field message code }
  }
}`;

function validHost(value: string): boolean {
	return (
		value.length <= 253 &&
		/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(value) &&
		!value.includes('..') &&
		value.includes('.')
	);
}
function validateConfig(config: StorefrontConfig) {
	if (
		!config ||
		typeof config.shopDomain !== 'string' ||
		!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com$/.test(config.shopDomain) ||
		config.apiVersion !== STOREFRONT_API_VERSION ||
		typeof config.privateToken !== 'string' ||
		config.privateToken.length < 16 ||
		config.privateToken.length > 4096 ||
		config.privateToken !== config.privateToken.trim() ||
		/[\r\n]/.test(config.privateToken) ||
		(config.allowedCheckoutHosts !== undefined &&
			(!Array.isArray(config.allowedCheckoutHosts) ||
				config.allowedCheckoutHosts.length > 10 ||
				config.allowedCheckoutHosts.some((host) => typeof host !== 'string' || !validHost(host))))
	)
		throw new ShopStorefrontError('invalid_configuration');
}
function validIp(value: string): boolean {
	if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value))
		return value.split('.').every((part) => Number(part) <= 255);
	if (!/^[0-9a-fA-F:]{2,45}$/.test(value) || !value.includes(':')) return false;
	try {
		return new URL(`https://[${value}]/`).hostname.startsWith('[');
	} catch {
		return false;
	}
}
function hasControlCharacters(value: string, lastControl = 0x9f): boolean {
	for (let index = 0; index < value.length; index++) {
		const code = value.charCodeAt(index);
		if (code <= 0x1f || (code >= 0x7f && code <= lastControl)) return true;
	}
	return false;
}
function validateCatalogCursor(cursor?: string): string | null {
	if (cursor === undefined) return null;
	if (
		typeof cursor !== 'string' ||
		cursor.length === 0 ||
		cursor.length > MAX_CATALOG_CURSOR_BYTES ||
		hasControlCharacters(cursor) ||
		new TextEncoder().encode(cursor).byteLength > MAX_CATALOG_CURSOR_BYTES
	)
		throw new ShopStorefrontError('invalid_cursor');
	return cursor;
}
type JsonRecord = Record<string, unknown>;
function record(value: unknown): JsonRecord {
	if (!value || typeof value !== 'object' || Array.isArray(value))
		throw new ShopStorefrontError('invalid_provider_response');
	return value as JsonRecord;
}
function string(value: unknown, max = 20_000): string {
	if (typeof value !== 'string' || value.length > max)
		throw new ShopStorefrontError('invalid_provider_response');
	return value;
}
function boolean(value: unknown): boolean {
	if (typeof value !== 'boolean') throw new ShopStorefrontError('invalid_provider_response');
	return value;
}
function array(value: unknown, max: number): unknown[] {
	if (!Array.isArray(value) || value.length > max)
		throw new ShopStorefrontError('invalid_provider_response');
	return value;
}
function pageInfo(value: unknown): ShopPageInfo {
	const item = record(value);
	return {
		hasNextPage: boolean(item.hasNextPage),
		endCursor: item.endCursor === null ? null : string(item.endCursor, 4096)
	};
}
function httpsUrl(value: unknown): URL {
	try {
		const url = new URL(string(value, 8192));
		if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error();
		return url;
	} catch {
		throw new ShopStorefrontError('invalid_provider_response');
	}
}
function gid(value: unknown, kind: 'Product' | 'ProductVariant'): string {
	const result = string(value, 200);
	if (!new RegExp(`^gid://shopify/${kind}/[0-9]+$`).test(result))
		throw new ShopStorefrontError('invalid_provider_response');
	return result;
}
async function responseJson(response: Response): Promise<unknown> {
	if (
		!/^application\/(?:json|graphql-response\+json)(?:;|$)/i.test(
			response.headers.get('content-type') ?? ''
		) ||
		Number(response.headers.get('content-length') ?? 0) > MAX_RESPONSE_BYTES ||
		!response.body
	)
		throw new ShopStorefrontError('invalid_provider_response');
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.byteLength;
		if (size > MAX_RESPONSE_BYTES) {
			await reader.cancel();
			throw new ShopStorefrontError('invalid_provider_response');
		}
		chunks.push(value);
	}
	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	try {
		return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
	} catch {
		throw new ShopStorefrontError('invalid_provider_response');
	}
}
async function graphql(
	config: StorefrontConfig,
	fetcher: typeof fetch,
	query: string,
	variables: JsonRecord,
	buyerIp?: string
): Promise<JsonRecord> {
	validateConfig(config);
	if (buyerIp !== undefined && !validIp(buyerIp)) throw new ShopStorefrontError('invalid_buyer_ip');
	const headers = new Headers({
		'Content-Type': 'application/json',
		'Shopify-Storefront-Private-Token': config.privateToken
	});
	if (buyerIp) headers.set('Shopify-Storefront-Buyer-IP', buyerIp);
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), STOREFRONT_TIMEOUT_MS);
	try {
		const response = await fetcher(
			`https://${config.shopDomain}/api/${config.apiVersion}/graphql.json`,
			{
				method: 'POST',
				headers,
				body: JSON.stringify({ query, variables }),
				signal: controller.signal,
				redirect: 'manual',
				cache: 'no-store',
				credentials: 'omit'
			}
		);
		if (!response.ok)
			throw new ShopStorefrontError('provider_unavailable', {
				category: 'http_error',
				httpStatus: response.status
			});
		const payload = record(await responseJson(response));
		if (
			payload.errors !== undefined &&
			(!Array.isArray(payload.errors) || payload.errors.length > 0)
		)
			throw new ShopStorefrontError('provider_unavailable', {
				category: 'graphql_error',
				httpStatus: response.status
			});
		return record(payload.data);
	} catch (error) {
		if (controller.signal.aborted)
			throw new ShopStorefrontError('provider_timeout', { category: 'timeout' });
		if (error instanceof ShopStorefrontError) throw error;
		throw new ShopStorefrontError('provider_unavailable', {
			category: error instanceof TypeError ? 'transport_type_error' : 'transport_error'
		});
	} finally {
		clearTimeout(timer);
	}
}

function money(value: unknown): ShopMoney {
	const price = record(value);
	const amount = string(price.amount, 32),
		currencyCode = string(price.currencyCode, 3);
	if (!/^(?:0|[1-9]\d{0,11})(?:\.\d{1,4})?$/.test(amount) || !/^[A-Z]{3}$/.test(currencyCode))
		throw new ShopStorefrontError('invalid_provider_response');
	return { amount, currencyCode };
}

function catalogProduct(value: unknown): ShopCatalogProduct {
	const product = record(value),
		variantConnection = record(product.variants);
	let image: ShopCatalogProduct['featuredImage'] = null;
	if (product.featuredImage !== null) {
		const source = record(product.featuredImage);
		const dimension = (value: unknown) => {
			if (value === null) return null;
			if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1)
				throw new ShopStorefrontError('invalid_provider_response');
			return value;
		};
		image = {
			url: httpsUrl(source.url).toString(),
			altText: source.altText === null ? null : string(source.altText),
			width: dimension(source.width),
			height: dimension(source.height)
		};
	}
	return {
		id: gid(product.id, 'Product'),
		handle: string(product.handle, 255),
		title: string(product.title),
		description: string(product.description),
		availableForSale: boolean(product.availableForSale),
		featuredImage: image,
		variants: array(variantConnection.nodes, CATALOG_VARIANTS_LIMIT).map((value) => {
			const variant = record(value);
			return {
				id: gid(variant.id, 'ProductVariant'),
				title: string(variant.title),
				availableForSale: boolean(variant.availableForSale),
				price: money(variant.price),
				selectedOptions: array(variant.selectedOptions, 10).map((value) => {
					const option = record(value);
					return { name: string(option.name), value: string(option.value) };
				})
			};
		}),
		variantsPageInfo: pageInfo(variantConnection.pageInfo)
	};
}

export async function readShopCatalog(
	config: StorefrontConfig,
	fetcher: typeof fetch,
	buyerIp?: string,
	cursor?: string
): Promise<ShopCatalog> {
	const variables = { cursor: validateCatalogCursor(cursor) };
	const data = await graphql(config, fetcher, CATALOG_QUERY, variables, buyerIp);
	const connection = record(data.products);
	const products = array(connection.nodes, CATALOG_PAGE_SIZE).map(catalogProduct);
	return { products, pageInfo: pageInfo(connection.pageInfo) };
}

export async function readShopProduct(
	config: StorefrontConfig,
	fetcher: typeof fetch,
	handle: string,
	buyerIp?: string,
	cursor?: string
): Promise<ShopCatalogProduct | null> {
	if (typeof handle !== 'string' || !/^[a-z0-9][a-z0-9-]{0,254}$/.test(handle))
		throw new ShopStorefrontError('invalid_product');
	const data = await graphql(
		config,
		fetcher,
		PRODUCT_QUERY,
		{ handle, cursor: validateCatalogCursor(cursor) },
		buyerIp
	);
	return data.product === null ? null : catalogProduct(data.product);
}

function cartLines(lines: readonly ShopCartLine[]): ShopCartLine[] {
	if (
		!Array.isArray(lines) ||
		lines.length > CART_LINES_LIMIT ||
		lines.some(
			(line) =>
				!line ||
				typeof line !== 'object' ||
				Object.keys(line).length !== 2 ||
				typeof line.merchandiseId !== 'string' ||
				!/^gid:\/\/shopify\/ProductVariant\/[0-9]+$/.test(line.merchandiseId) ||
				!Number.isSafeInteger(line.quantity) ||
				line.quantity < 1 ||
				line.quantity > CART_QUANTITY_LIMIT
		) ||
		new Set(lines.map((line) => line.merchandiseId)).size !== lines.length
	)
		throw new ShopStorefrontError('invalid_cart');
	return lines.map(({ merchandiseId, quantity }) => ({ merchandiseId, quantity }));
}

function parsedCart(
	data: JsonRecord,
	config: StorefrontConfig,
	lines: readonly ShopCartLine[]
): ShopCart {
	const result = record(data.cartCreate);
	if (array(result.userErrors, 250).length > 0) throw new ShopStorefrontError('invalid_cart');
	const cart = record(result.cart),
		checkout = httpsUrl(cart.checkoutUrl);
	const allowedHosts = [
		config.shopDomain,
		'checkout.shopify.com',
		...(config.allowedCheckoutHosts ?? [])
	];
	if (
		!allowedHosts.includes(checkout.hostname) ||
		checkout.hash ||
		typeof cart.totalQuantity !== 'number' ||
		!Number.isSafeInteger(cart.totalQuantity) ||
		cart.totalQuantity < 0 ||
		cart.totalQuantity !== lines.reduce((sum, line) => sum + line.quantity, 0)
	)
		throw new ShopStorefrontError('invalid_provider_response');
	const id = string(cart.id, 4096);
	if (!/^gid:\/\/shopify\/Cart\/[^\s]+$/.test(id))
		throw new ShopStorefrontError('invalid_provider_response');
	return { id, checkoutUrl: checkout.toString(), totalQuantity: cart.totalQuantity };
}

export async function createShopCart(
	config: StorefrontConfig,
	fetcher: typeof fetch,
	lines: readonly ShopCartLine[],
	buyerIp?: string
): Promise<ShopCart> {
	const data = await graphql(
		config,
		fetcher,
		CART_MUTATION,
		{ input: { lines: cartLines(lines), buyerIdentity: { countryCode: 'BR' } } },
		buyerIp
	);
	return parsedCart(data, config, lines);
}

function deliveryAddress(value: ShopDeliveryAddress): ShopDeliveryAddress {
	const source = value as unknown as Record<string, unknown>;
	if (
		!source ||
		typeof source !== 'object' ||
		Array.isArray(source) ||
		Object.keys(source).length !== 5 ||
		source.countryCode !== 'BR' ||
		typeof source.zip !== 'string' ||
		!/^\d{5}-?\d{3}$/.test(source.zip) ||
		typeof source.provinceCode !== 'string' ||
		![
			'AC',
			'AL',
			'AP',
			'AM',
			'BA',
			'CE',
			'DF',
			'ES',
			'GO',
			'MA',
			'MT',
			'MS',
			'MG',
			'PA',
			'PB',
			'PR',
			'PE',
			'PI',
			'RJ',
			'RN',
			'RS',
			'RO',
			'RR',
			'SC',
			'SP',
			'SE',
			'TO'
		].includes(source.provinceCode) ||
		['city', 'address1'].some(
			(key) =>
				typeof source[key] !== 'string' ||
				!(source[key] as string).trim() ||
				(source[key] as string).length > 255 ||
				hasControlCharacters(source[key] as string, 0x7f)
		)
	)
		throw new ShopStorefrontError('invalid_delivery_address');
	return {
		countryCode: 'BR',
		zip: source.zip.replace('-', ''),
		provinceCode: source.provinceCode,
		city: (source.city as string).trim(),
		address1: (source.address1 as string).trim()
	};
}

export async function createShopPreviewCart(
	config: StorefrontConfig,
	fetcher: typeof fetch,
	lines: readonly ShopCartLine[],
	buyerIp?: string,
	address?: ShopDeliveryAddress
): Promise<ShopPreviewCart> {
	const input: JsonRecord = { lines: cartLines(lines), buyerIdentity: { countryCode: 'BR' } };
	if (address !== undefined)
		input.delivery = {
			addresses: [
				{ address: { deliveryAddress: deliveryAddress(address) }, selected: true, oneTimeUse: true }
			]
		};
	const data = await graphql(config, fetcher, PREVIEW_CART_MUTATION, { input }, buyerIp);
	const base = parsedCart(data, config, lines);
	const cart = record(record(data.cartCreate).cart),
		cost = record(cart.cost);
	const groups = record(cart.deliveryGroups);
	return {
		...base,
		cost: { subtotalAmount: money(cost.subtotalAmount), totalAmount: money(cost.totalAmount) },
		deliveryGroups: array(groups.nodes, 20).map((value) => ({
			options: array(record(value).deliveryOptions, 250).map((value) => {
				const option = record(value);
				return {
					title: option.title === null ? null : string(option.title),
					estimatedCost: money(option.estimatedCost)
				};
			})
		})),
		deliveryGroupsHasNextPage: boolean(record(groups.pageInfo).hasNextPage)
	};
}
