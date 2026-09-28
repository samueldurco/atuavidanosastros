import type { SupabaseClient } from '@supabase/supabase-js';
import { isUuid } from '$lib/library-result';
import { LIBRARY_PAGE_SIZE, type LibraryListItem, type LibraryPageData } from '$lib/library-page';
import { withRpcDeadline } from './rpc-deadline';

// Keep PostgreSQL microseconds and timezone verbatim; never round the keyset boundary to milliseconds.
const timestamp = (value: unknown): value is string =>
	typeof value === 'string' &&
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
	Number.isFinite(Date.parse(value));
const bounded = (value: unknown, max: number): value is string =>
	typeof value === 'string' && value.trim().length > 0 && value.length <= max;

function parseItem(value: unknown): LibraryListItem | null {
	if (!value || typeof value !== 'object') return null;
	const item = value as Record<string, unknown>;
	if (
		typeof item.id !== 'string' ||
		!isUuid(item.id) ||
		!bounded(item.title, 2000) ||
		!bounded(item.universe, 100) ||
		!bounded(item.item_type, 100) ||
		!(item.source_id === null || bounded(item.source_id, 2000)) ||
		!timestamp(item.created_at) ||
		!timestamp(item.occurred_at)
	)
		return null;
	return {
		id: item.id,
		title: item.title,
		universe: item.universe,
		item_type: item.item_type,
		source_id: item.source_id,
		occurred_at: item.occurred_at,
		created_at: item.created_at
	};
}

/** Verified session subject only. Cursor is an owned item reference, never a client-supplied timestamp/filter. */
export async function readLibraryPage(
	client: SupabaseClient | undefined,
	owner: string,
	before: string | null = null
): Promise<LibraryPageData> {
	const empty: LibraryPageData = {
		preview: false,
		items: [],
		libraryError: false,
		pagination: {
			before: before && isUuid(before) ? before.toLowerCase() : null,
			next: null,
			expired: false
		}
	};
	if (!client || !isUuid(owner)) return { ...empty, libraryError: true };
	if (before !== null && !isUuid(before))
		return { ...empty, pagination: { ...empty.pagination, expired: true } };
	try {
		return await withRpcDeadline(async (signal) => {
			let boundary: string | null = null;
			if (empty.pagination.before) {
				const { data, error } = await client
					.from('library_items')
					.select('id,created_at')
					.eq('user_id', owner)
					.is('archived_at', null)
					.eq('id', empty.pagination.before)
					.abortSignal(signal)
					.maybeSingle();
				if (error) throw new Error('unavailable');
				if (!data) return { ...empty, pagination: { ...empty.pagination, expired: true } };
				if (data.id !== empty.pagination.before || !timestamp(data.created_at))
					throw new Error('unavailable');
				boundary = data.created_at;
			}
			if (signal.aborted) throw new Error('unavailable');
			let query = client
				.from('library_items')
				.select('id,title,universe,item_type,source_id,occurred_at,created_at')
				.eq('user_id', owner)
				.is('archived_at', null)
				.order('created_at', { ascending: false })
				.order('id', { ascending: false })
				.limit(LIBRARY_PAGE_SIZE + 1);
			// Both interpolated fields have strict grammars and the cursor was resolved within owner scope.
			if (boundary)
				query = query.or(
					`created_at.lt.${boundary},and(created_at.eq.${boundary},id.lt.${empty.pagination.before})`
				);
			const { data, error } = await query.abortSignal(signal);
			if (error || !Array.isArray(data) || data.length > LIBRARY_PAGE_SIZE + 1)
				throw new Error('unavailable');
			const items = data.map(parseItem);
			if (
				items.some((item) => !item) ||
				new Set(items.map((item) => item?.id)).size !== items.length
			)
				throw new Error('unavailable');
			const page = (items as LibraryListItem[]).slice(0, LIBRARY_PAGE_SIZE);
			return {
				...empty,
				items: page,
				pagination: {
					...empty.pagination,
					next: items.length > LIBRARY_PAGE_SIZE ? page.at(-1)!.id : null
				}
			};
		});
	} catch {
		return { ...empty, libraryError: true };
	}
}
