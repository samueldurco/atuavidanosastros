import { describe, expect, it } from 'vitest';
import { horoscopeReaderFixture } from '../../../tests/fixtures/horoscope-reader';
import { parseProductRun } from '../product-run';
import { productFactLabel } from '../product-fact-label';
import { productCatalog } from '@atv/domain';

describe('synthetic Horoscope web contract, without editorial approval', () => {
	for (const withContext of [true, false])
		it(`recovers every fact, source and section (${withContext})`, async () => {
			const fixture = await horoscopeReaderFixture('ready', withContext);
			const run = parseProductRun(fixture.run);
			expect(run).not.toBeNull();
			expect(run!.calculation!.facts).toHaveLength(withContext ? 122 : 121);
			expect(run!.editorial!.sections).toHaveLength(withContext ? 28 : 27);
			expect(run!.editorial!.sections.at(-1)!.evidence).toHaveLength(withContext ? 122 : 121);
			expect(run!.calculation!.facts).toEqual(fixture.run.calculation!.facts);
			expect(run!.editorial!.sections).toEqual(fixture.run.editorial!.sections);
			expect(productFactLabel('horoscope', 'transit-mercury-natal-moon')).toBe(
				'Mercúrio da amostra × Lua natal (transit-mercury-natal-moon)'
			);
			expect(productFactLabel('horoscope', 'natal-pluto')).toBe(
				'Base natal · Plutão (natal-pluto)'
			);
			expect(productFactLabel('horoscope', 'sample-instant')).toBe(
				'Instante da amostra (12h UTC) (sample-instant)'
			);
			expect(productFactLabel('date-reading', 'transit-mercury-natal-moon')).toBe(
				'transit-mercury-natal-moon'
			);
			expect(productFactLabel('horoscope', 'unknown')).toBe('unknown');
			expect(productCatalog.find((p) => p.id === 'horoscope')!.delivery).toEqual(['web']);
		});

	it('scopes source and evidence bounds to the product and rejects dangling references', async () => {
		const fixture = await horoscopeReaderFixture('ready');
		const extended = structuredClone(fixture.run);
		extended.calculation!.facts[0].source = 's'.repeat(300);
		expect(parseProductRun(extended)).not.toBeNull();
		extended.calculation!.facts[0].source += 's';
		expect(parseProductRun(extended)).toBeNull();
		const dangling = structuredClone(fixture.run);
		dangling.editorial!.sections.at(-1)!.evidence[0] = 'missing';
		expect(parseProductRun(dangling)).toBeNull();
		const generic = structuredClone(fixture.run);
		generic.productId = 'date-reading';
		expect(parseProductRun(generic)).toBeNull();
	});

	it('withholds private reading and facts in pending, revoked and failed states', async () => {
		for (const state of ['pending', 'revoked', 'failed']) {
			const fixture = await horoscopeReaderFixture(state);
			const run = parseProductRun(fixture.run);
			expect(run).not.toBeNull();
			expect(run!.released).toBe(false);
			expect(run!.calculation).toBeNull();
			expect(run!.editorial).toBeNull();
		}
	});
});
