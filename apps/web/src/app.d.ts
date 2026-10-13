import type { SupabaseClient } from '@supabase/supabase-js';

declare global {
	interface Env {
		FREE_TOOL_RECEIPT_KEY?: string;
		SUPABASE_SERVICE_ROLE_KEY?: string;
	}
	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		// interface Error {}
		interface Locals {
			supabase?: SupabaseClient;
		}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
