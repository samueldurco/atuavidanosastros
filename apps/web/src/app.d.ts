import type { SupabaseClient } from '@supabase/supabase-js';

declare global {
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
