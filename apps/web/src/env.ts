import { defineEnvVars } from '@sveltejs/kit/env';

// Optional bindings preserve each consumer's existing unavailable/disabled behavior.
const optional = (value: string | undefined) => value;

export const variables = defineEnvVars({
	ADMIN_EMAIL_ALLOWLIST: { schema: optional },
	TIKTOK_CLIENT_KEY: { schema: optional },
	TIKTOK_CLIENT_SECRET: { schema: optional },
	TIKTOK_REDIRECT_URI: { schema: optional },
	TIKTOK_TOKEN_ENCRYPTION_KEY: { schema: optional },
	SUPABASE_SERVICE_ROLE_KEY: { schema: optional },
	ATV_TRIAL_RUNTIME_KEY: { schema: optional },
	FREE_TOOL_RECEIPT_KEY: { schema: optional },
	FEATURE_HOTMART_LIVE: { schema: optional },
	HOTMART_HOTTOK: { schema: optional },
	FEATURE_MAGIC_LINK: { schema: optional },
	PUBLIC_SUPABASE_URL: { public: true, schema: optional },
	PUBLIC_SUPABASE_PUBLISHABLE_KEY: { public: true, schema: optional },
	PUBLIC_SUPABASE_ANON_KEY: { public: true, schema: optional }
});
