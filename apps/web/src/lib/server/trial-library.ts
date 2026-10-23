import type { SupabaseClient } from '@supabase/supabase-js';
import { TRIAL_LIBRARY_PAGE_SIZE, type TrialLibraryData } from '$lib/trials/library';
import { isUuid } from '$lib/library-result';
import { withRpcDeadline } from './rpc-deadline';
import { retiredTarotIds } from '@atv/domain';

const timestamp = (value: unknown): value is string =>
	typeof value === 'string' &&
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
	Number.isFinite(Date.parse(value));
const retiredFilter = `(${retiredTarotIds.join(',')})`;

/** Called only after verified claims and the nominal server grant. RLS also checks access. */
export async function readTrialLibrary(
	client: SupabaseClient | undefined,
	owner: string,
	before: string | null = null
): Promise<TrialLibraryData> {
	const empty: TrialLibraryData = {
		readings: [],
		unavailable: false,
		pagination: {
			before: before && isUuid(before) ? before.toLowerCase() : null,
			next: null,
			expired: false
		}
	};
	if (!client || !isUuid(owner)) return { ...empty, unavailable: true };
	if (before !== null && !isUuid(before))
		return { ...empty, pagination: { ...empty.pagination!, expired: true } };
	try {
		return await withRpcDeadline(async (signal) => {
			let boundary: string | null = null;
			if (empty.pagination!.before) {
				const { data, error } = await client
					.from('atv_trial_readings')
					.select('id,created_at')
					.eq('owner_id', owner)
					.is('archived_at', null)
					.not('product_id', 'in', retiredFilter)
					.eq('id', empty.pagination!.before)
					.abortSignal(signal)
					.maybeSingle();
				if (error) throw new Error('unavailable');
				if (!data) return { ...empty, pagination: { ...empty.pagination!, expired: true } };
				if (data.id !== empty.pagination!.before || !timestamp(data.created_at))
					throw new Error('unavailable');
				boundary = data.created_at;
			}
			if (signal.aborted) throw new Error('unavailable');
			let query = client
				.from('atv_trial_readings')
				.select('id,product_id,created_at,version:reading->>version')
				.eq('owner_id', owner)
				.is('archived_at', null)
				.not('product_id', 'in', retiredFilter)
				.order('created_at', { ascending: false })
				.order('id', { ascending: false })
				.limit(TRIAL_LIBRARY_PAGE_SIZE + 1);
			// Strict timestamp and owned UUID preserve PostgreSQL microseconds without client filters.
			if (boundary)
				query = query.or(
					`created_at.lt.${boundary},and(created_at.eq.${boundary},id.lt.${empty.pagination!.before})`
				);
			const { data, error } = await query.abortSignal(signal);
			if (
				error ||
				!Array.isArray(data) ||
				data.length > TRIAL_LIBRARY_PAGE_SIZE + 1 ||
				data.some(
					(item) =>
						!isUuid(item.id) ||
						!timestamp(item.created_at) ||
						typeof item.product_id !== 'string' ||
						retiredTarotIds.includes(item.product_id)
				) ||
				new Set(data.map((item) => item.id)).size !== data.length
			)
				throw new Error('unavailable');
			const readings = data.slice(0, TRIAL_LIBRARY_PAGE_SIZE);
			return {
				...empty,
				readings,
				pagination: {
					...empty.pagination!,
					next: data.length > TRIAL_LIBRARY_PAGE_SIZE ? readings.at(-1)!.id : null
				}
			};
		});
	} catch {
		return { ...empty, unavailable: true };
	}
}
