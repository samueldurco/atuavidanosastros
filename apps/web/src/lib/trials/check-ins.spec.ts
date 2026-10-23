import { describe, expect, it } from 'vitest';
import { readingCheckIns } from './check-ins';
import { ATLAS_VERSION, atlasMethod } from './reconstruction/atlas-facts';
import { DIRECTION_VERSION } from './reconstruction/direction-facts';

describe('saved reading check-in steps', () => {
	it('includes each step of the actual Atlas method in both reader and API contract', () => {
		expect(readingCheckIns('life-atlas', ATLAS_VERSION)).toEqual([0, ...atlasMethod.path]);
	});

	it('keeps the established direction and tarot journeys available', () => {
		expect(readingCheckIns('direction-journey', DIRECTION_VERSION)).toEqual([0, 7, 14, 30]);
		expect(readingCheckIns('direction-journey', 'historical')).toEqual([0, 7, 14, 30]);
		expect(readingCheckIns('tarot-journey', 'historical')).toEqual([0, 1, 7, 14]);
	});

	it('does not add a journey to another product or an unrelated historical Atlas edition', () => {
		expect(readingCheckIns('birth-chart', ATLAS_VERSION)).toEqual([0]);
		expect(readingCheckIns('life-atlas', 'historical')).toEqual([0]);
	});
});
