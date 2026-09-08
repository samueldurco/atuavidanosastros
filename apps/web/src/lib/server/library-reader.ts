import type { SupabaseClient } from '@supabase/supabase-js';
import { isUuid, parseSavedCompass, type LibraryReaderData } from '$lib/library-result';

export type ReaderLookup = LibraryReaderData | { state: 'not-found' };

/** The caller passes the session client, never a service-role client. Explicit ownership complements RLS. */
export async function readLibraryResult(
	client: SupabaseClient,
	userId: string,
	itemId: string
): Promise<ReaderLookup> {
	if (!isUuid(itemId) || !isUuid(userId)) return { state: 'not-found' };
	try {
		const { data: item, error: itemError } = await client
			.from('library_items')
			.select('id,title,universe,item_type,source_id,created_at')
			.eq('id', itemId)
			.eq('user_id', userId)
			.is('archived_at', null)
			.maybeSingle();
		if (itemError) return { state: 'unavailable', item: null, result: null };
		if (!item) return { state: 'not-found' };
		if (
			typeof item.title !== 'string' ||
			typeof item.universe !== 'string' ||
			!Number.isFinite(Date.parse(item.created_at))
		)
			return { state: 'unavailable', item: null, result: null };
		const summary = {
			id: itemId,
			title: item.title,
			universe: item.universe,
			created_at: item.created_at
		};
		if (item.item_type !== 'COMPASS_RESULT')
			return { state: 'unsupported', item: summary, result: null };
		if (typeof item.source_id !== 'string' || !isUuid(item.source_id))
			return { state: 'unavailable', item: summary, result: null };
		const { data: calculation, error: resultError } = await client
			.from('calculation_results')
			.select('result,provenance')
			.eq('id', item.source_id)
			.eq('user_id', userId)
			.eq('kind', 'MIDHEAVEN')
			.maybeSingle();
		if (resultError || !calculation) return { state: 'unavailable', item: summary, result: null };
		const result = parseSavedCompass(calculation.result, calculation.provenance);
		return { state: result ? 'ready' : 'unavailable', item: summary, result };
	} catch {
		return { state: 'unavailable', item: null, result: null };
	}
}
