import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { FreeToolResult } from '$lib/free-tools';
import { libraryReturnCursor } from '$lib/library-page';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) error(404);
	setHeaders({
		'cache-control': 'private, no-store',
		'x-robots-tag': 'noindex,nofollow',
		'referrer-policy': 'no-referrer'
	});
	const result: FreeToolResult = {
		version: 'atv-free-tool-result/1.0.0',
		id: '00000000-0000-4000-8000-000000000051',
		tool: 'registro-de-sonho',
		createdAt: '2026-10-23T12:00:00Z',
		title: 'Registro de Sonho — referência sintética',
		summary: 'Resultado local para testar o retorno à página da Biblioteca.',
		facts: [],
		sections: [{ id: 'registro', title: 'Registro salvo', body: 'Conteúdo sintético de teste.' }],
		limits: []
	};
	return {
		state: 'free-tool' as const,
		result,
		item: {
			id: result.id,
			title: result.title,
			universe: 'sonhos',
			created_at: result.createdAt
		},
		libraryBefore: libraryReturnCursor(url.searchParams)
	};
};
