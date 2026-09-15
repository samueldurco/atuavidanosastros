import { describe, expect, it } from 'vitest';
import { svgFixture, pdfFixture } from '../../../tests/fixtures/product-export';
import { parseProductRun } from '../product-run';
import { NATAL_SOURCE_VERSION, parseProductCartography } from '../product-cartography';
import { longitudePoint, renderProductSvg } from './product-svg';

describe('saved cartography contract and inert SVG', () => {
	it('copies exact coordinates, strips unknown fields and canonicalizes body order only', () => {
		const run = svgFixture();
		const geo = run.cartography!;
		const parsed = parseProductCartography(
			{
				...geo,
				input: 'PRIVATE',
				positions: [...geo.positions].reverse().map((p) => ({ ...p, latitude: 77, raw: 'PRIVATE' }))
			},
			run.productId,
			NATAL_SOURCE_VERSION
		);
		expect(parsed).toEqual(geo);
		expect(JSON.stringify(parsed)).not.toContain('PRIVATE');
	});
	it.each(['birth-chart', 'ascendant', 'polar', 'cluster'])(
		'renders %s without recalculating or substituting houses',
		(variant) => {
			const run = svgFixture(variant);
			const first = renderProductSvg(run)!;
			expect(first).toEqual(renderProductSvg(run));
			for (const p of run.cartography!.positions)
				expect(first.svg).toContain(`data-body="${p.body}" data-longitude="${p.longitude}"`);
			expect((first.svg.match(/data-house=/g) ?? []).length).toBe(
				run.cartography!.houses.cusps.length
			);
			expect(first.svg).toContain('data:font/woff2;base64,');
			expect(first.svg).not.toMatch(/<(script|image|use|foreignObject|a)\b|\bhref=|\bonload=/);
			expect(first.svg).toContain('não é uma interpretação ou homologação');
		}
	);
	it('maps cardinal longitudes without angular displacement or aspect claims', () => {
		for (const [a, x, y] of [
			[0, 400, 430],
			[90, 500, 530],
			[180, 600, 430],
			[270, 500, 330]
		]) {
			const point = longitudePoint(a, 100);
			expect(point.x).toBeCloseTo(x, 10);
			expect(point.y).toBeCloseTo(y, 10);
		}
		expect(
			renderProductSvg(svgFixture('cluster'))!.svg.match(/data-longitude="0.001"/g)
		).toHaveLength(10);
	});
	it('withholds malformed optional geometry but preserves the valid text reader', () => {
		const original = svgFixture();
		const g = original.cartography!;
		const bad = [
			null,
			{},
			{ ...g, version: 'new' },
			{ ...g, sourceVersion: 'old' },
			{ ...g, zodiac: 'sidereal' },
			{ ...g, referenceFrame: 'heliocentric' },
			{ ...g, accuracyStatus: 'approved' },
			{ ...g, positions: g.positions.slice(1) },
			{ ...g, positions: g.positions.map(() => g.positions[0]) },
			...[NaN, Infinity, -1, 360, '1', null, {}].map((longitude) => ({
				...g,
				positions: g.positions.map((p, i) => (i ? p : { ...p, longitude }))
			})),
			{ ...g, angles: { ascendant: 0 } },
			{ ...g, houses: { ...g.houses, cusps: [] } },
			{ ...g, houses: { ...g.houses, status: 'not-applicable' } }
		];
		for (const cartography of bad) {
			const run = { ...original, cartography };
			expect(parseProductRun(run)?.editorial).not.toBeNull();
			expect(parseProductRun(run)?.cartography).toBeNull();
			expect(renderProductSvg(run)).toBeNull();
		}
	});
	it('never parses facts or raw snapshots as a geometry fallback; respects all release inputs', () => {
		for (const run of [
			pdfFixture(),
			{ ...svgFixture(), released: false },
			{ ...svgFixture(), editorial: null },
			{ ...svgFixture(), productId: 'life-atlas' },
			{ ...svgFixture(), calculation: { ...svgFixture().calculation, version: 'old' } }
		])
			expect(renderProductSvg(run)).toBeNull();
		const run = {
			...svgFixture(),
			input: 'RAW_INPUT_SECRET',
			raw: '<script>RAW_SCRIPT_CANARY</script>'
		};
		const svg = renderProductSvg(run)!.svg;
		expect(svg).not.toContain('RAW_INPUT_SECRET');
		expect(svg).not.toContain('RAW_SCRIPT_CANARY');
	});
});
