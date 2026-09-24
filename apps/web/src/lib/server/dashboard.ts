import type { SupabaseClient } from '@supabase/supabase-js';
import type { DashboardData, NatalSummary } from '$lib/dashboard';
import { parseOnboardingSnapshot } from '$lib/onboarding';
import { isUuid } from '$lib/library-result';

async function readNatal(client: SupabaseClient): Promise<NatalSummary> {
	try {
		const { data, error } = await client
			.rpc('read_natal_onboarding')
			.abortSignal(AbortSignal.timeout(10000));
		const snapshot = error ? null : parseOnboardingSnapshot(data);
		if (!snapshot) return { state: 'UNAVAILABLE' };
		return snapshot.natal
			? { state: 'COMPLETE', timePrecision: snapshot.natal.timePrecision }
			: { state: snapshot.state as 'NOT_STARTED' | 'IN_PROGRESS' };
	} catch {
		return { state: 'UNAVAILABLE' };
	}
}

async function readLibrary(client: SupabaseClient, owner: string) {
	try {
		const { data, error } = await client
			.from('library_items')
			.select('id,title,created_at')
			.eq('user_id', owner)
			.is('archived_at', null)
			.order('created_at', { ascending: false })
			.limit(3)
			.abortSignal(AbortSignal.timeout(10000));
		if (error || !Array.isArray(data) || data.length > 3) throw new Error('unavailable');
		const items: DashboardData['items'] = [];
		for (const item of data) {
			if (
				!item ||
				!isUuid(item.id) ||
				typeof item.title !== 'string' ||
				!item.title.trim() ||
				item.title.length > 2000 ||
				typeof item.created_at !== 'string' ||
				!Number.isFinite(Date.parse(item.created_at))
			)
				throw new Error('unavailable');
			items.push({ id: item.id, title: item.title, created_at: item.created_at });
		}
		return { items, libraryError: false };
	} catch {
		return { items: [], libraryError: true };
	}
}

/** Only called with the subject verified by the parent server load; never accept a browser owner. */
export async function readDashboard(
	client: SupabaseClient | undefined,
	owner: string
): Promise<DashboardData> {
	if (!client || !isUuid(owner))
		return { preview: false, items: [], libraryError: true, natal: { state: 'UNAVAILABLE' } };
	const [library, natal] = await Promise.all([readLibrary(client, owner), readNatal(client)]);
	return { preview: false, ...library, natal };
}
