import { describe, expect, it } from 'vitest';
import { buildNatalChartScene, chartSceneSvg } from './trials/chart-engine-v2';
import { chartImageSource, chartPosition, chartWheelSvg } from './astrological-chart-presentation';

describe('web chart presentation', () => {
	it('keeps calculated wheel geometry and separates poster headings and legend from the web scene', () => {
		const scene = buildNatalChartScene({
			positions: [
				{ body: 'sun', longitude: 29.99999 },
				{ body: 'moon', longitude: 95.5 }
			],
			angles: { ascendant: 350, midheaven: 260 },
			houses: {
				status: 'calculated',
				cusps: Array.from({ length: 12 }, (_, i) => (350 + i * 30) % 360)
			},
			aspects: [{ first: 'sun', second: 'moon', kind: 'sextile' }],
			tracks: new Map()
		});
		const poster = chartSceneSvg(scene),
			wheel = chartWheelSvg(poster);
		const wheelElements = (svg: string) =>
			svg.match(
				/<(?:circle|line|text)\b[^>]*data-layer="(?:signs|ticks|houses|angles|aspects|planets|labels)"[^>]*(?:\/>|>[^<]*<\/text>)/g
			);
		expect(wheel).toContain('viewBox="40 40 820 820"');
		expect(wheel).not.toMatch(/data-layer="(?:paper|heading|legend)"/);
		expect(wheelElements(wheel)).toEqual(wheelElements(poster));
		expect(wheel).toContain('data-longitude="29.99999"');
		expect(poster).toContain('viewBox="0 0 900 1160"');
		expect(poster).toContain('data-layer="legend"');
	});
	it('stabilizes web path coordinates while keeping calculated positions intact', () => {
		const scene = (coordinate: string) =>
			`<svg data-engine="AstroChartEngineV2/test" viewBox="0 0 900 1160"><path data-layer="signs" d="M 598.5000000000001 ${coordinate} A 297 297 0 0 1 560.1 220.2" data-longitude="29.99999" /></svg>`;
		const server = scene('192.79045507602177');
		const client = scene('192.79045507602183');
		expect(chartWheelSvg(server)).toBe(chartWheelSvg(client));
		expect(chartWheelSvg(server)).toContain('d="M 598.5 192.79 A 297 297 0 0 1 560.1 220.2"');
		expect(chartWheelSvg(server)).toContain('data-longitude="29.99999"');
		expect(server).toContain('192.79045507602177');
	});
	it('keeps unsupported saved charts intact and encodes the supplied image', () => {
		const svg = '<svg viewBox="0 0 360 360"><text>Sol &amp; Lua</text></svg>';
		expect(chartWheelSvg(svg)).toBe(svg);
		expect(decodeURIComponent(chartImageSource(svg).split(',')[1])).toBe(svg);
	});
	it('rounds display degrees across signs while locating houses from unrounded geometry', () => {
		const cusps = Array.from({ length: 12 }, (_, i) => (350 + i * 30) % 360);
		expect(chartPosition(359.99999, cusps)).toEqual({ sign: 'Áries', degree: '0°00′', house: 1 });
		expect(chartPosition(20, cusps)).toEqual({ sign: 'Áries', degree: '20°00′', house: 2 });
		expect(chartPosition(349.99, cusps).house).toBe(12);
		expect(chartPosition(29.99999)).toEqual({ sign: 'Touro', degree: '0°00′', house: null });
	});
});
