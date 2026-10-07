import type { SupabaseClient } from '@supabase/supabase-js';
import type { TrialLibraryData } from '$lib/trials/library';
import { withRpcDeadline } from './rpc-deadline';

/** Called only after verified claims and the nominal server grant. RLS also checks access. */
export async function readTrialLibrary(
	client: SupabaseClient | undefined,
	owner: string
): Promise<TrialLibraryData> {
	if (!client) return { readings: [], unavailable: true };
	try {
		const result = await withRpcDeadline((signal) =>
			client
				.from('atv_trial_readings')
				.select('id,product_id,created_at,version:reading->>version')
				.eq('owner_id', owner)
				.order('created_at', { ascending: false })
				.limit(100)
				.abortSignal(signal)
		);
		return {
			readings: result.error ? [] : (result.data ?? []),
			unavailable: Boolean(result.error)
		};
	} catch {
		return { readings: [], unavailable: true };
	}
}
