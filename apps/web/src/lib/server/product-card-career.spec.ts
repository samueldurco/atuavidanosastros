import { describe, expect, it } from 'vitest';
import { exportFixture } from '../../../tests/fixtures/product-export';
import { renderProductCard } from './product-card';

function careerRun() {
	const run = exportFixture();
	run.productId = 'career-compass';
	run.calculation!.facts = [
		{
			id: 'angle-midheaven',
			kind: 'calculated',
			display: 'Meio do Céu: 12° de Touro',
			source: 'Cálculo sintético da revisão exata'
		}
	];
	run.editorial!.title = 'Bússola de Carreira · Meio do Céu em Touro';
	run.editorial!.sections = [
		{
			title: 'Direção pública possível',
			text: 'Conferir esta hipótese com a experiência vivida.',
			evidence: ['angle-midheaven']
		}
	];
	return run;
}

describe('career compass contracted formats', () => {
	it('does not expose an uncontracted reading card, even for an approved run', () => {
		expect(renderProductCard(careerRun(), 0)).toBeNull();
	});
});
