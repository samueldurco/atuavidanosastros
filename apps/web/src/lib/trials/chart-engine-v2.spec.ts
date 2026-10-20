import { describe, expect, it } from 'vitest';
import { calculateTrial } from '../server/trial-calculation';
import { composeTrialReading, approveTrialReading, type SavedTrial } from './reading';
import {
	boxesOverlap,
	NATAL_ASPECT_RADIUS,
	buildChartScene,
	buildNatalChartScene,
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
		expect(svg).toContain('AstroChartEngineV2/2.1.0');
		expect(svg).toContain('#f6efdf');
		expect(svg).toContain('#4d6231');
		expect(svg).toContain('#ce9b45');
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
					(p) =>
						Math.abs(n.x - (450 - NATAL_ASPECT_RADIUS * Math.cos((p.longitude * Math.PI) / 180))) <
						1e-7
				)
			).toBe(true);
		}
	});
});

describe('compact natal markers keep crowded labels separate from factual geometry', () => {
	const bodies = [
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
	];
	type Box = { x: number; y: number; w: number; h: number };
	const pointAt = (longitude: number, radius: number) => ({
		x: 450 - radius * Math.cos((longitude * Math.PI) / 180),
		y: 450 + radius * Math.sin((longitude * Math.PI) / 180)
	});
	const expectClearance = (a: Box, b: Box) => {
		// Check the final rectangles independently of the engine's collision predicate.
		const gap = Math.max(
			b.x - (a.x + a.w),
			a.x - (b.x + b.w),
			b.y - (a.y + a.h),
			a.y - (b.y + b.h)
		);
		expect(gap).toBeGreaterThanOrEqual(4 - 1e-7);
	};
	const cases = [
		...[
			['ASC', 0],
			['house number', 15],
			['IC', 90],
			['DSC', 180],
			['MC', 270],
			['zodiac end', 359.99]
		].map(([name, longitude]) => ({
			name: String(name),
			longitudes: Array<number>(10).fill(Number(longitude))
		})),
		{
			name: '359° to 0° seam',
			longitudes: [359.1, 359.3, 359.5, 359.7, 359.9, 0.1, 0.3, 0.5, 0.7, 0.9]
		}
	];

	it.each(cases)('protects final boxes and original coordinates near $name', ({ longitudes }) => {
		expect(NATAL_ASPECT_RADIUS).toBe(152);
		const geometry: Parameters<typeof buildNatalChartScene>[0] = {
			positions: bodies.map((body, i) => ({ body, longitude: longitudes[i] })),
			angles: { ascendant: 0, midheaven: 270 },
			houses: { status: 'ok', cusps: Array.from({ length: 12 }, (_, i) => i * 30) },
			aspects: [{ first: 'sun', second: 'moon', kind: 'conjunction' }],
			tracks: new Map()
		};
		const original = structuredClone(geometry);
		const scene = buildNatalChartScene(geometry);
		const protectedBoxes = scene.nodes.flatMap((node): Box[] => {
			if (node.type === 'rect' && node.layer === 'angles')
				return [{ x: node.x, y: node.y, w: node.w, h: node.h }];
			if (node.type === 'text' && node.layer === 'houses')
				return [{ x: node.x - 8, y: node.y - 13, w: 16, h: 18 }];
			return [];
		});
		expect(protectedBoxes).toHaveLength(16);
		expect(scene.markers).toHaveLength(10);
		for (const [i, marker] of scene.markers.entries()) {
			for (const other of scene.markers.slice(i + 1)) expectClearance(marker.box, other.box);
			for (const obstacle of protectedBoxes) expectClearance(marker.box, obstacle);
			const nearestX = Math.max(marker.box.x, Math.min(450, marker.box.x + marker.box.w));
			const nearestY = Math.max(marker.box.y, Math.min(450, marker.box.y + marker.box.h));
			expect(Math.hypot(nearestX - 450, nearestY - 450)).toBeGreaterThan(NATAL_ASPECT_RADIUS);
			const radius = Math.hypot(marker.x - 450, marker.y - 450);
			expect(Math.min(Math.abs(radius - 232), Math.abs(radius - 190))).toBeLessThan(1e-7);
			expect(marker.box.w).toBe(46);
			expect(marker.box.h).toBe(43);

			const source = original.positions.find((position) => position.body === marker.body)!;
			expect(marker.longitude).toBe(source.longitude);
			const truePoint = pointAt(source.longitude, 280);
			const factId = `position-${source.body}`;
			expect(
				scene.nodes.find((node) => node.type === 'circle' && node.factId === factId)
			).toMatchObject({ ...truePoint, r: 3, layer: 'positions' });
			expect(
				scene.nodes.find((node) => node.type === 'line' && node.factId === factId)
			).toMatchObject({
				...truePoint,
				x2: marker.x,
				y2: marker.y,
				layer: 'leaders'
			});
			expect(
				scene.nodes.find((node) => node.type === 'rect' && node.factId === factId)
			).toMatchObject({ ...marker.box, layer: 'markers' });
			expect(
				scene.nodes.find((node) => node.type === 'path' && node.factId === factId)
			).toMatchObject({ x: marker.x, y: marker.y, layer: 'markers' });
		}
		const aspectStart = pointAt(longitudes[0], NATAL_ASPECT_RADIUS);
		const aspectEnd = pointAt(longitudes[1], NATAL_ASPECT_RADIUS);
		expect(
			scene.nodes.find((node) => node.type === 'line' && node.layer === 'aspects')
		).toMatchObject({ ...aspectStart, x2: aspectEnd.x, y2: aspectEnd.y });
		expect(geometry).toEqual(original);
	});

	it('keeps compact seam placement deterministic when input order changes', () => {
		const positions = bodies.map((body, i) => ({
			body,
			longitude: [359.1, 359.3, 359.5, 359.7, 359.9, 0.1, 0.3, 0.5, 0.7, 0.9][i]
		}));
		const obstacles = [{ x: 177, y: 441, w: 36, h: 18 }];
		const before = structuredClone(positions);
		const placed = placeChartMarkers(positions, obstacles, [232, 190], true);
		expect(placeChartMarkers([...positions].reverse(), obstacles, [232, 190], true)).toEqual(
			placed
		);
		expect(
			placed.some((marker) => {
				const ideal = pointAt(marker.longitude, 232);
				return Math.hypot(marker.x - ideal.x, marker.y - ideal.y) > 1;
			})
		).toBe(true);
		for (const [i, marker] of placed.entries()) {
			for (const other of placed.slice(i + 1)) expectClearance(marker.box, other.box);
			for (const obstacle of obstacles) expectClearance(marker.box, obstacle);
		}
		expect(positions).toEqual(before);
	});
});
