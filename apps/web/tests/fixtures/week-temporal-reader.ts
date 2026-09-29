import { exportFixture } from './product-export';

// Structural transport specimen only; the editorial text is not approved content.
export function weekTemporalReaderFixture() {
	const run = exportFixture();
	run.productId = 'week-reading';
	run.calculation = {
		version: 'atv-week-reading-calculation/1.2.0',
		temporal: {
			version: 'atv-week-reading-calculation/1.2.0' as const,
			eventCount: 1,
			windowCount: 1,
			events: [
				{
					id: 'event-1',
					transitBody: 'sun',
					natalBody: 'moon',
					aspect: 'trine',
					threshold: 'exact',
					mode: 'bracketed-crossing',
					from: '2026-09-29T12:00:00.000Z',
					to: '2026-09-29T12:01:00.000Z',
					phaseDirection: 'increasing'
				}
			],
			windows: [
				{
					transitBody: 'sun',
					natalBody: 'moon',
					aspect: 'trine',
					from: '2026-09-29T12:00:00.000Z',
					to: '2026-09-29T13:00:00.000Z',
					startClipped: false,
					endClipped: false
				}
			]
		},
		facts: [
			'summary',
			'sun',
			'moon',
			'mercury',
			'venus',
			'mars',
			'jupiter',
			'saturn',
			'uranus',
			'neptune',
			'pluto'
		].map((body) => ({
			id: `week-temporal-${body}`,
			kind: 'calculated',
			display:
				body === 'summary'
					? 'Busca nominal sintética: 34 janelas candidatas.'
					: `${body}: 3 eventos nominais.`,
			source: 'fixture;atv-week-reading-calculation/1.2.0'
		})),
		limits: ['Grade sintética; sem aprovação editorial.']
	};
	run.editorial!.sections[0].evidence = ['week-temporal-summary'];
	return run;
}
