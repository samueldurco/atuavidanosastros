const general = [0] as const;
const atlas = [0, 7, 14, 21, 30] as const;
const direction = [0, 7, 14, 30] as const;
const tarot = [0, 1, 7, 14] as const;

/** The reader and note endpoint must offer the same steps for each saved edition. */
export function readingCheckIns(productId: string, calculationVersion: string): readonly number[] {
	if (productId === 'life-atlas' && calculationVersion === 'atv-private-life-atlas/4.0.0')
		return atlas;
	if (productId === 'direction-journey') return direction;
	if (productId === 'tarot-journey') return tarot;
	return general;
}
