import { describe, expect, it } from 'vitest';
import type { WorkflowInput } from '@atv/domain';
import { calculateTrial } from './server/trial-calculation';
import { approveTrialReading, composeTrialReading, type SavedTrial } from './trials/reading';
import { buildChartScene, buildNatalChartScene, chartSceneSvg } from './trials/chart-engine-v2';
import { chartImageSource, chartPosition, chartWheelSvg } from './astrological-chart-presentation';

describe('web chart presentation', () => {
	it.each([
		'date-reading',
		'synastry',
		'couple-dossier',
		'week-reading',
		'personal-calendar',
		'career-forecast-30d'
	])(
		'keeps every external card inside the web viewBox of the real %s map',
		async (productId) => {
			// These are the production calculation inputs used by the final catalogue
			// exports, whose external cards crossed both sides of the natal crop.
			const birth = (date = '2000-01-01T12:00:00') => ({
				localDateTime: date,
				utcInstant: `${date}Z`,
				timezone: 'UTC',
				latitude: 0,
				longitude: 0,
				locationSource: 'synthetic'
			});
			const relationship = ['synastry', 'couple-dossier'].includes(productId);
			const input: WorkflowInput = {
				version: 'atv-workflow/1.0.0',
				productId,
				birth: birth(),
				...(relationship ? { partner: birth('2001-07-12T07:00:00') } : {}),
				...(productId === 'couple-dossier'
					? {
							context: 'Queremos conversar sobre distância e responsabilidades.',
							questions: [
								'Como conversar sem transformar diferenças em discussão?',
								'Como conciliar nossos projetos futuros?'
							]
						}
					: {}),
				...(!relationship ? { targetDate: '2026-10-15' } : {}),
				...(['personal-calendar', 'career-forecast-30d'].includes(productId)
					? { forecastPeriod: 'rolling-30-days' as const }
					: {}),
				consent: {
					storage: true,
					partner: relationship,
					continuity: false,
					policyVersion: 'atv-input-consent/1'
				}
			};
			const id = '00000000-0000-4000-8000-000000000084';
			const calculation = await calculateTrial(input, id);
			const reading = composeTrialReading(input, calculation);
			const approval = await approveTrialReading(input, calculation, reading);
			expect(approval).not.toBeNull();
			const saved: SavedTrial = {
				id,
				product_id: productId,
				created_at: '2026-10-20T12:00:00Z',
				input,
				calculation,
				reading,
				approval: approval!
			};
			const scene = buildChartScene(saved);
			const before = structuredClone(scene);
			const poster = chartSceneSvg(scene);
			const wheel = chartWheelSvg(poster);
			const [x, y, width, height] = wheel
				.match(/viewBox="([^"]*)"/)![1]
				.split(' ')
				.map(Number);
			expect(width).toBe(height);
			expect(x + width / 2).toBe(450);
			expect(y + height / 2).toBe(450);
			const external = scene.markers.filter((marker) => marker.body.startsWith('sample:'));
			expect(external).toHaveLength(10);
			// Confirm the fixture exercises the original left/right clipping defect.
			expect(external.some(({ box }) => box.x < 40)).toBe(true);
			expect(external.some(({ box }) => box.x + box.w > 860)).toBe(true);
			for (const { box } of scene.markers) {
				expect(box.x - x).toBeGreaterThan(4);
				expect(box.y - y).toBeGreaterThan(4);
				expect(x + width - (box.x + box.w)).toBeGreaterThan(4);
				expect(y + height - (box.y + box.h)).toBeGreaterThan(4);
			}
			expect(wheel).not.toMatch(/data-layer="(?:paper|heading|legend)"/);
			const markerGeometry = (svg: string) =>
				svg.match(/<(?:rect|line|circle)\b[^>]*data-layer="(?:markers|leaders)"[^>]*>/g);
			expect(markerGeometry(wheel)).toEqual(markerGeometry(poster));
			expect(scene).toEqual(before);
		},
		15_000
	);
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
