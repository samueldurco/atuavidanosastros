import { describe, expect, it } from 'vitest';
import {
	launchProductIds,
	workflowOfferProductIds,
	type WorkflowInput,
	type CalculationSnapshot
} from '@atv/domain';
import { composeCurrentReading, isCurrentReadingProduct, CURRENT_READING_VERSION } from './index';
import { latestReadingVersion } from '../versions';
import { LAUNCH_READING_VERSION } from '../launch-reading';

describe('public catalogue and private engine boundaries', () => {
	it.each(workflowOfferProductIds)('%s retains its current workflow edition', (id) => {
		expect(isCurrentReadingProduct(id)).toBe(true);
		expect(latestReadingVersion(id)).toBe(CURRENT_READING_VERSION);
	});
	it.each(launchProductIds)('%s cannot enter the original reading composer', (id) => {
		expect(isCurrentReadingProduct(id)).toBe(false);
		expect(latestReadingVersion(id)).toBe(LAUNCH_READING_VERSION);
		expect(() =>
			composeCurrentReading({ productId: id } as WorkflowInput, {} as CalculationSnapshot)
		).toThrow('not_current_offer');
	});
});
