import { readFile, readdir } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { variables } from './env';

const publicBindings = [
	'PUBLIC_SUPABASE_URL',
	'PUBLIC_SUPABASE_PUBLISHABLE_KEY',
	'PUBLIC_SUPABASE_ANON_KEY'
];
const privateBindings = [
	'DIMONA_FRETE_TOKEN',
	'ATVNA_FACTORY_RUNNER_KEY',
	'DIMONA_ASSET_SIGNING_KEY',
	'DIMONA_ORDER_DISPATCH',
	'SHOPIFY_FULFILLMENT_CLIENT_ID',
	'SHOPIFY_FULFILLMENT_CLIENT_SECRET',
	'SHOPIFY_FULFILLMENT_ADMIN_TOKEN',
	'GUBO_FRETE_TOKEN',
	'ATVNA_CHECKOUT_SIGNING_KEY',
	'SHOPIFY_DRAFT_CLIENT_ID',
	'SHOPIFY_DRAFT_CLIENT_SECRET',
	'SHOPIFY_DRAFT_ORDERS_TOKEN',
	'SHOP_ARIES_SINGLE_UNIT_ONLY',
	'SHOP_DELIVERY_MAX_BUSINESS_DAYS',
	'SHOP_VERIFIED_FLAT_SHIPPING_BRL',
	'SHOP_SELLER_DISCLOSURE_APPROVED',
	'SHOP_SELLER_PUBLIC_NAME',
	'SHOP_SELLER_PUBLIC_ADDRESS',
	'SHOP_SELLER_PUBLIC_POSTCODE',
	'SHOP_SELLER_PUBLIC_EMAIL',
	'SHOP_SELLER_PUBLIC_DOCUMENT',
	'SHOP_SELLER_PRIVATE_RETURN_LOCATION',
	'FEATURE_PHYSICAL_CHECKOUT',
	'SHOPIFY_CHECKOUT_HOSTS',
	'SHOPIFY_DIAGNOSTIC_ENABLED',
	'SHOPIFY_DIAGNOSTIC_TOKEN',
	'SHOPIFY_PREVIEW_ENABLED',
	'SHOPIFY_STORE_DOMAIN',
	'SHOPIFY_STOREFRONT_API_VERSION',
	'SHOPIFY_STOREFRONT_PRIVATE_TOKEN',
	'ADMIN_EMAIL_ALLOWLIST',
	'TIKTOK_CLIENT_KEY',
	'TIKTOK_CLIENT_SECRET',
	'TIKTOK_REDIRECT_URI',
	'TIKTOK_TOKEN_ENCRYPTION_KEY',
	'SUPABASE_SERVICE_ROLE_KEY',
	'ATV_TRIAL_RUNTIME_KEY',
	'FREE_TOOL_RECEIPT_KEY',
	'FEATURE_HOTMART_LIVE',
	'HOTMART_HOTTOK',
	'FEATURE_MAGIC_LINK',
	'AUTOMATIC_SPEND_CAP_BRL',
	'FEATURE_ATV_PLUS_COMMERCIAL',
	'FEATURE_WHATSAPP_WEBHOOK',
	'FEATURE_WHATSAPP_CONSULTATION',
	'FEATURE_WHATSAPP_PUBLIC_ENTRY',
	'WHATSAPP_ACCESS_TOKEN',
	'WHATSAPP_APP_SECRET',
	'WHATSAPP_WABA_ID',
	'WHATSAPP_PHONE_NUMBER_ID',
	'WHATSAPP_GRAPH_VERSION',
	'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
	'WHATSAPP_COMMERCIAL_NUMBER',
	'WHATSAPP_CONSULTATION_SUBJECT_SECRET',
	'WHATSAPP_CONSULTATION_VERIFIED_AT',
	'WHATSAPP_CONSULTATION_FREE_REPLY_VERIFIED'
];

it('keeps the generated dynamic environment available with an explicit public boundary', () => {
	expect(Object.keys(privateEnv).sort()).toEqual([...privateBindings].sort());
	expect(Object.keys(publicEnv).sort()).toEqual([...publicBindings].sort());
	expect(Object.keys(publicEnv).some((name) => privateBindings.includes(name))).toBe(false);
});

it('accepts absent optional bindings while preserving values for runtime initialization', async () => {
	for (const [name, config] of Object.entries(variables)) {
		expect('static' in config && config.static === true, name).toBe(false);
		expect('public' in config && config.public === true, name).toBe(publicBindings.includes(name));
		expect(await config.schema['~standard'].validate(undefined), name).toEqual({
			value: undefined
		});
		expect(await config.schema['~standard'].validate('synthetic-runtime-binding'), name).toEqual({
			value: 'synthetic-runtime-binding'
		});
	}
});

it('declares all runtime bindings consumed by the shop server as private', async () => {
	const dir = new URL('./lib/server/shop/', import.meta.url);
	const modules = (await readdir(dir)).filter(
		(name) => name.endsWith('.ts') && !name.endsWith('.spec.ts')
	);
	for (const name of modules) {
		const source = await readFile(new URL(name, dir), 'utf8');
		for (const match of source.matchAll(/\benv\.([A-Z][A-Z0-9_]+)\b/g)) {
			expect(Object.hasOwn(privateEnv, match[1]), name + ': ' + match[1]).toBe(true);
			expect(Object.hasOwn(publicEnv, match[1]), name + ': ' + match[1]).toBe(false);
		}
	}
});

it('declares the WhatsApp entry, webhook and commercial gates without exposing them publicly', async () => {
	for (const path of [
		'./lib/server/whatsapp-entry.ts',
		'./routes/api/webhooks/whatsapp/+server.ts',
		'./lib/server/atv-plus-commercial-page.ts'
	]) {
		const source = await readFile(new URL(path, import.meta.url), 'utf8');
		for (const match of source.matchAll(
			/\b(?:settings|runtime)\.([A-Z][A-Z0-9_]+)\b|\bsetting\(event,\s*'([A-Z][A-Z0-9_]+)'/g
		)) {
			const binding = match[1] ?? match[2];
			const exposed = publicBindings.includes(binding);
			expect(Object.hasOwn(exposed ? publicEnv : privateEnv, binding), path + ': ' + binding).toBe(
				true
			);
			expect(Object.hasOwn(exposed ? privateEnv : publicEnv, binding), path + ': ' + binding).toBe(
				false
			);
		}
	}
});
