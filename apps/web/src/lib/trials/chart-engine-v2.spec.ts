import { describe, expect, it } from 'vitest';
import { calculateTrial } from '../server/trial-calculation';
import { composeTrialReading, approveTrialReading, type SavedTrial } from './reading';
import {
	boxesOverlap,
	buildChartScene,
	chartSceneSvg,
	chartDegree,
	displayDegree,
	placeChartMarkers
} from './chart-engine-v2';
import type { WorkflowInput } from '@atv/domain';
const input: WorkflowInput = {
	version: 'atv-workflow/1.0.0',
	productId: 'career-compass',
	birth: {
		localDateTime: '2000-01-01T12:00:00',
		utcInstant: '2000-01-01T12:00:00Z',
		timezone: 'UTC',
		latitude: 0,
		longitude: 0,
		locationSource: 'synthetic'
	},
	context: 'Quero comparar uma mudança de área com a função atual.',
	consent: {
		storage: true,
		partner: false,
		continuity: false,
		policyVersion: 'atv-input-consent/1'
	}
};
export async function careerChartFixture(): Promise<SavedTrial> {
	const id = '00000000-0000-4000-8000-000000000084';
	const calculation = await calculateTrial(input, id),
		reading = composeTrialReading(input, calculation),
		approval = await approveTrialReading(input, calculation, reading);
	if (!approval) throw Error('fixture_approval_failed');
	return {
		id,
		product_id: input.productId,
		created_at: '2026-10-08T12:00:00Z',
		input,
		calculation,
		reading,
		approval
	};
}
describe('AstroChartEngineV2 saved geometry', () => {
	it('rounds minutes with sign and zodiac carry, without changing the raw value', () => {
		expect(chartDegree(29.99999)).toBe('0°00′ Touro');
		expect(chartDegree(359.99999)).toBe('0°00′ Áries');
		expect(displayDegree(13.683333)).toEqual({ sign: 0, degree: 13, minute: 41 });
		expect(() => displayDegree(360)).toThrow();
	});
	it.each([0, 359.99, 180])(
		'separates ten coincident labels at %s with true longitudes',
		(longitude) => {
			const positions = [
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
			].map((body) => ({ body, longitude }));
			const placed = placeChartMarkers(positions);
			expect(placed).toHaveLength(10);
			for (const [i, p] of placed.entries()) {
				expect(p.longitude).toBe(longitude);
				expect(placed.slice(i + 1).some((q) => boxesOverlap(p.box, q.box))).toBe(false);
			}
			expect(positions.every((p) => p.longitude === longitude)).toBe(true);
		}
	);
	it('uses saved positions, complete axes, available houses and accessible vector glyphs', async () => {
		const saved = await careerChartFixture(),
			before = JSON.stringify(saved.calculation),
			scene = buildChartScene(saved),
			svg = chartSceneSvg(scene);
		expect(scene.markers).toHaveLength(10);
		expect(
			scene.nodes.filter((n) => n.type === 'text' && ['ASC', 'DSC', 'MC', 'IC'].includes(n.text))
		).toHaveLength(4);
		expect(scene.nodes.filter((n) => n.type === 'text' && n.layer === 'houses')).toHaveLength(12);
		expect(svg).toContain('AstroChartEngineV2/2.0.0');
		expect(svg).toContain('stroke-dasharray');
		expect(svg).toContain('<desc');
		expect(JSON.stringify(saved.calculation)).toBe(before);
	});
	it('filters presentation layers and leaves calculation and aspect endpoints intact', async () => {
		const saved = await careerChartFixture(),
			full = buildChartScene(saved),
			reduced = buildChartScene(saved, { houses: false, aspects: 'none', degrees: false });
		expect(reduced.nodes.some((n) => n.layer === 'houses' || n.layer === 'aspects')).toBe(false);
		expect(reduced.markers).toEqual(full.markers);
		const positions = saved.calculation.data.positions as { body: string; longitude: number }[];
		for (const n of full.nodes.filter((n) => n.type === 'line' && n.layer === 'aspects')) {
			if (n.type !== 'line') continue;
			expect(
				positions.some(
					(p) => Math.abs(n.x - (450 - 278 * Math.cos((p.longitude * Math.PI) / 180))) < 1e-7
				)
			).toBe(true);
		}
	});
});
