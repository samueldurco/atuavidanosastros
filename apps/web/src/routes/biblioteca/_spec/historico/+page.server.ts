import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { LibraryPageData } from '$lib/library-page';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	if (!['localhost', '127.0.0.1'].includes(url.hostname)) error(404, 'Página não encontrada.');
	setHeaders({ 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer' });
	const cursor = '00000000-0000-4000-8000-000000000004';
	const before = url.searchParams.get('before');
	const state = url.searchParams.get('state');
	const expired = state === 'expired' || (before !== null && before !== cursor);
	const libraryError = state === 'error';
	const ids = expired || libraryError || state === 'empty' ? [] : before ? [3, 2, 1] : [6, 5, 4];
	return {
		preview: false,
		libraryError,
		pagination: { before, next: before || !ids.length ? null : cursor, expired },
		items: ids.map((n) => ({
			id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
			title: `Leitura sintética ${n}`,
			universe: before ? 'SONHOS' : 'TAROT',
			item_type: 'TEST_FIXTURE',
			source_id: null,
			occurred_at: '2026-09-28T12:00:00Z',
			created_at: '2026-09-28T12:00:00Z'
		}))
	} satisfies LibraryPageData;
};
