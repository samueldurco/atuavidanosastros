import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
		error(404, 'Página não encontrada.');
	const libraryError = url.searchParams.get('state') === 'error';
	return {
		preview: false,
		libraryError,
		items: libraryError
			? []
			: [
					{
						id: '00000000-0000-4000-8000-000000000001',
						title: 'Bússola de Carreira — referência sintética A',
						universe: 'proposito-prosperidade',
						item_type: 'COMPASS_RESULT',
						occurred_at: '2026-09-01T12:00:00Z',
						created_at: '2026-09-01T12:00:00Z'
					},
					{
						id: '00000000-0000-4000-8000-000000000002',
						title: 'Bússola de Carreira — referência sintética B',
						universe: 'proposito-prosperidade',
						item_type: 'COMPASS_RESULT',
						occurred_at: '2026-09-02T12:00:00Z',
						created_at: '2026-09-02T12:00:00Z'
					},
					{
						id: '00000000-0000-4000-8000-000000000003',
						title: 'Caderno de símbolos — referência sintética',
						universe: 'SONHOS',
						item_type: 'TEST_FIXTURE',
						occurred_at: '2026-09-03T12:00:00Z',
						created_at: '2026-09-03T12:00:00Z'
					}
				]
	};
};
