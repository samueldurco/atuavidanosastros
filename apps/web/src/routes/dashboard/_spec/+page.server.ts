import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { DashboardData, NatalSummary } from '$lib/dashboard';

export const load: PageServerLoad = ({ url, setHeaders }) => {
	if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) error(404);
	setHeaders({
		'cache-control': 'private, no-store',
		'referrer-policy': 'no-referrer',
		'x-robots-tag': 'noindex, nofollow'
	});
	const states: Record<string, NatalSummary> = {
		preview: { state: 'PREVIEW' },
		unavailable: { state: 'UNAVAILABLE' },
		new: { state: 'NOT_STARTED' },
		progress: { state: 'IN_PROGRESS' },
		exact: { state: 'COMPLETE', timePrecision: 'EXACT' },
		approximate: { state: 'COMPLETE', timePrecision: 'APPROXIMATE' }
	};
	const name = url.searchParams.get('state') ?? 'new';
	if (!Object.hasOwn(states, name)) error(400);
	return {
		preview: name === 'preview',
		natal: states[name],
		libraryError: url.searchParams.get('library') === 'error',
		items:
			url.searchParams.get('library') === 'saved'
				? [
						{
							id: '00000000-0000-4000-8000-000000000052',
							title: 'Leitura sintética de teste',
							created_at: '2026-09-24T12:00:00Z'
						}
					]
				: []
	} satisfies DashboardData;
};
