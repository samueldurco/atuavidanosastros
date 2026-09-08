import { error } from '@sveltejs/kit';
import type { LibraryReaderData } from '$lib/library-result';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) error(404);
	const requested = url.searchParams.get('state');
	const state = requested === 'unavailable' || requested === 'unsupported' ? requested : 'ready';
	return {
		state,
		synthetic: true,
		item: {
			id: '00000000-0000-0000-0000-000000000001',
			title: 'Bússola de Carreira — referência sintética',
			universe: 'proposito-prosperidade',
			created_at: '2026-09-08T09:00:00Z'
		},
		result:
			state === 'ready'
				? {
						midheaven: 280.5,
						degree: 10.5,
						sign: 'Capricórnio',
						status: requested === 'partial' ? 'not-applicable' : 'ok',
						warning:
							requested === 'partial'
								? 'Limitação de casas simulada para teste de interface.'
								: null,
						provenance: {
							provider: 'fixture',
							providerVersion: '1.0.0',
							calculatedAt: '2026-09-08T09:00:00Z'
						}
					}
				: null
	} satisfies LibraryReaderData;
};
