import type { ProductRunView } from '../../src/lib/product-run';

export function pdfFixture(): ProductRunView {
	const run = exportFixture();
	run.productId = 'birth-chart';
	run.calculation!.facts[0] = {
		id: 'card-0',
		kind: 'calculated',
		display: 'Referência técnica sintética: precisão de 0,01°.',
		source: 'Fixture de paginação; não é cálculo de pessoa'
	};
	return run;
}

// Synthetic renderer/boundary fixture only. Never a registry promotion or product release.
export function exportFixture(): ProductRunView {
	const at = '2026-09-14T12:00:00Z';
	return {
		id: '00000000-0000-4000-8000-000000000001',
		productId: 'daily-card',
		state: 'READY',
		revision: 4,
		parentId: null,
		createdAt: at,
		updatedAt: at,
		released: true,
		canReprocess: false,
		libraryItemId: '00000000-0000-4000-8000-000000000002',
		history: (['QUEUED', 'CALCULATED', 'AWAITING_EDITORIAL', 'READY'] as const).map(
			(state, index) => ({ revision: index + 1, state, at })
		),
		calculation: {
			version: 'fixture/1',
			facts: [
				{
					id: 'card-0',
					kind: 'drawn',
					display: 'O Louco — referência sintética 🌙',
					source: 'Fixture sintética; não houve sorteio'
				}
			],
			limits: ['Este exemplo não interpreta uma pessoa.']
		},
		editorial: {
			version: 'fixture/1',
			promotionId: 'fixture-not-approved',
			reviewDigest: '0'.repeat(64),
			title: 'Espaço para uma pergunta — exemplo sintético',
			sections: [
				{
					title: 'Um começo possível',
					text: 'Que pequeno passo você gostaria de experimentar hoje?\nEsta pergunta é somente uma referência sintética para teste.',
					evidence: ['card-0']
				}
			],
			limits: ['Nenhum modelo homologado.']
		}
	};
}
