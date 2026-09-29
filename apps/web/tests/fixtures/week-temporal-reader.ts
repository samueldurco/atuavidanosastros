import { exportFixture } from './product-export';

// Structural transport specimen only; the editorial text is not approved content.
export function weekTemporalReaderFixture() {
	const run = exportFixture();
	run.productId = 'week-reading';
	run.calculation = {
		version: 'atv-week-reading-calculation/1.2.0',
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
