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
	'FEATURE_MAGIC_LINK'
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
