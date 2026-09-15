import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { WorkflowReaderData } from '$lib/product-run';
import { svgFixture } from '../../../../../tests/fixtures/product-export';

export const load: PageServerLoad = ({ url }) => {
	if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) error(404);
	const ready = url.searchParams.get('state') === 'ready';
	if (ready && url.searchParams.get('format') === 'svg') {
		const run = svgFixture();
		return {
			state: 'workflow',
			synthetic: true,
			run,
			item: {
				id: run.libraryItemId!,
				title: 'Mapa Natal — referência sintética',
				universe: 'meu-ceu',
				created_at: run.createdAt
			}
		} satisfies WorkflowReaderData;
	}
	const failed = url.searchParams.get('state') === 'failed';
	const revoked = url.searchParams.get('state') === 'revoked';
	const pdf = url.searchParams.get('format') === 'pdf';
	const states =
		ready || revoked
			? (['QUEUED', 'CALCULATED', 'AWAITING_EDITORIAL', 'READY'] as const)
			: failed
				? (['QUEUED', 'FAILED'] as const)
				: (['QUEUED', 'CALCULATED', 'AWAITING_EDITORIAL'] as const);
	const id = '00000000-0000-4000-8000-000000000001';
	const at = '2026-09-14T12:00:00Z';
	return {
		state: 'workflow',
		synthetic: true,
		item: {
			id,
			title: pdf ? 'Mapa Natal — referência sintética' : 'Carta do Dia — referência sintética',
			universe: pdf ? 'meu-ceu' : 'tarot-arcanos',
			created_at: at
		},
		run: {
			id,
			productId: pdf ? 'birth-chart' : 'daily-card',
			state: states.at(-1)!,
			revision: states.length,
			parentId: null,
			createdAt: at,
			updatedAt: at,
			released: ready,
			canReprocess: false,
			libraryItemId: id,
			history: states.map((state, i) => ({ revision: i + 1, state, at })),
			calculation: ready
				? {
						version: 'fixture/1',
						facts: [
							{
								id: 'card-0',
								kind: pdf ? 'calculated' : 'drawn',
								display: pdf
									? 'Referência técnica sintética: precisão de 0,01°.'
									: 'O Louco — carta de referência para teste',
								source: 'Fixture sintética; não é cálculo nem sorteio de pessoa'
							}
						],
						limits: ['Este exemplo testa o leitor; não interpreta uma pessoa.']
					}
				: null,
			editorial: ready
				? {
						version: 'fixture/1',
						promotionId: 'fixture-not-approved',
						reviewDigest: '0'.repeat(64),
						title: 'Espaço para uma pergunta',
						sections: [
							{
								title: 'Um começo possível',
								text: 'Que pequeno passo você gostaria de experimentar hoje? Esta pergunta é apenas um exemplo sintético para verificar a leitura e a navegação.',
								evidence: ['card-0']
							}
						],
						limits: []
					}
				: null
		}
	} satisfies WorkflowReaderData;
};
