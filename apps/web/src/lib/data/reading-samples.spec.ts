import { describe, expect, it } from 'vitest';
import { offeredProductIds } from '@atv/domain';
import { launchProducts } from './launch-products';
import { readingSamples, readingSample, sampleTarotPositions } from './reading-samples';

describe('public reading samples', () => {
	it('covers the current offers without a fallback to another product', () => {
		expect(Object.keys(readingSamples).sort()).toEqual([...offeredProductIds].sort());
		expect(readingSample('unknown')).toBeUndefined();
		expect(readingSample('atv-plus')).toBeUndefined();
		expect(
			new Set(Object.values(readingSamples).map((sample) => sample.sections[0].text)).size
		).toBe(offeredProductIds.length);
	});
	it.each(launchProducts)('preserves the approved P02 example for $id', (product) => {
		const sample = readingSample(product.id)!;
		expect(sample.context).toBe(product.sampleInput);
		expect(sample.sections[0].text).toBe(product.sampleDelivery);
		expect(sample.note).toContain('dados fictícios');
	});
	it('pairs every tarot example with the complete, current method', () => {
		for (const sample of Object.values(readingSamples).filter((sample) => sample.cards)) {
			const positions = sampleTarotPositions(sample);
			expect(sample.cards!.length, sample.productId).toBe(positions.length);
			expect(sample.note).toContain('nenhuma tiragem');
		}
		expect(readingSample('tarot-astrological-mandala')!.cards).toHaveLength(13);
	});
});
