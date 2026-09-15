import type { ProductRunView } from '../../src/lib/product-run';
import {
	CARTOGRAPHY_VERSION,
	NATAL_SOURCE_VERSION,
	cartographyBodies
} from '../../src/lib/product-cartography';

export function svgFixture(variant = 'birth-chart'): ProductRunView {
	const run = pdfFixture();
	run.calculation!.version = NATAL_SOURCE_VERSION;
	run.cartography = {
		version: CARTOGRAPHY_VERSION,
		sourceVersion: NATAL_SOURCE_VERSION,
		zodiac: 'tropical',
		referenceFrame: 'geocentric-apparent-ecliptic-of-date',
		accuracyStatus: 'experimental',
		positions: cartographyBodies.map((body, i) => ({
			body,
			longitude: variant === 'cluster' ? 0.001 : (i * 37.123456789) % 360
		})),
		angles: { ascendant: 21.56789, midheaven: 291.098765 },
		houses: {
			system: 'placidus',
			status: 'ok',
			cusps: Array.from({ length: 12 }, (_, i) => (21.56789 + 30 * i) % 360)
		}
	};
	if (variant === 'ascendant') {
		run.productId = 'ascendant';
		run.cartography.positions = [];
		run.cartography.angles.midheaven = null;
		run.cartography.houses = { system: 'placidus', status: 'not-requested', cusps: [] };
	} else if (variant === 'polar') {
		run.cartography.angles.ascendant = null;
		run.cartography.houses = { system: 'placidus', status: 'not-applicable', cusps: [] };
	}
	return run;
}

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
