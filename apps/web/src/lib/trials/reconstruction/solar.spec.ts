import { describe, expect, it } from 'vitest';
import { bodies } from '@atv/astrology';
import { parseWorkflowInput, type CalculationSnapshot, type WorkflowInput } from '@atv/domain';
import { calculateTrial } from '../../server/trial-calculation';
import { SOLAR_VERSION, assertSolarProjection, type SolarMonth } from './solar-facts';
import { composeTrialReading, approveTrialReading, type SavedTrial } from '../reading';
import { reviewReconstructedSolar } from './solar';
import { buildChartScene } from '../chart-engine-v2';
import type { SolarYearSamples } from '../../../../../worker/src/solar-year-samples';
import {
	calculateSolarYearSamples,
	assertSolarYearSamples
} from '../../../../../worker/src/solar-year-samples';
import { trialText } from '../exports';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const runId = '00000000-0000-4000-8000-000000000100';
const input = (
	context = 'Quero negociar responsabilidades de trabalho e reservar tempo para estudar.'
): WorkflowInput => ({
	version: 'atv-workflow/1.0.0',
	productId: 'solar-return',
	targetDate: '2026-01-01',
	returnYear: 2026,
	context,
	birth: {
		localDateTime: '2000-01-01T12:00:00',
		utcInstant: '2000-01-01T12:00:00Z',
		timezone: 'UTC',
		latitude: 0,
		longitude: 0,
		locationSource: 'synthetic'
	},
	returnLocation: {
		city: 'São Paulo',
		timezone: 'America/Sao_Paulo',
		latitude: -23.55,
		longitude: -46.63,
		locationSource: 'synthetic-return'
	},
	consent: {
		storage: true,
		partner: false,
		continuity: false,
		policyVersion: 'atv-input-consent/1'
	}
});
let cached: CalculationSnapshot;
const sample = async () => (cached ??= await calculateTrial(input(), runId));
const saved = async (): Promise<SavedTrial> => {
	const calculation = await sample(),
		value = input(),
		reading = composeTrialReading(value, calculation),
		approval = await approveTrialReading(value, calculation, reading);
	expect(reviewReconstructedSolar(value, calculation, reading)).toEqual([]);
	expect(new Set(calculation.facts.map((f) => f.id)).size).toBe(calculation.facts.length);
	expect(JSON.stringify({ calculation, reading, input: value }).length).toBeLessThan(749000);
	expect(approval).not.toBeNull();
	return {
		id: runId,
		product_id: value.productId,
		created_at: '2026-10-08T12:00:00Z',
		input: value,
		calculation,
		reading,
		approval: approval!
	};
};
describe('Revolução Solar reconstruída', () => {
	it.each([
		['1990-01-31', '2027-01-31', 'Lisboa', 'Europe/Lisbon', 38.72, -9.14],
		['2000-02-29', '2028-02-29', 'Tóquio', 'Asia/Tokyo', 35.68, 139.69],
		['1990-06-21', '2026-06-21', 'Tromsø', 'Europe/Oslo', 69.65, 18.96],
		['1986-10-15', '2027-10-15', 'Sydney', 'Australia/Sydney', -33.87, 151.21],
		['2000-01-01', '2098-01-01', 'Tóquio', 'Asia/Tokyo', 35.68, 139.69],
		['1900-01-01', '1902-01-01', 'São Paulo', 'America/Sao_Paulo', -23.55, -46.63]
	] as const)(
		'approves a complete distinct cycle %s → %s in %s',
		async (birthDate, targetDate, city, timezone, latitude, longitude) => {
			const value = input('Quero rever minha capacidade de trabalho e as prioridades do ciclo.');
			value.birth = {
				...value.birth!,
				localDateTime: birthDate + 'T12:00:00',
				utcInstant: birthDate + 'T12:00:00Z'
			};
			value.targetDate = targetDate;
			value.returnYear = Number(targetDate.slice(0, 4));
			value.returnLocation = {
				city,
				timezone,
				latitude,
				longitude,
				locationSource: 'synthetic-return'
			};
			const calculation = await calculateTrial(value, runId),
				reading = composeTrialReading(value, calculation);
			expect(() => assertSolarProjection(value, calculation)).not.toThrow();
			expect(reviewReconstructedSolar(value, calculation, reading)).toEqual([]);
			expect(JSON.stringify({ input: value, calculation, reading }).length).toBeLessThan(749000);
			expect(await approveTrialReading(value, calculation, reading)).not.toBeNull();
			expect(
				(calculation.data.months as SolarMonth[]).reduce((sum, m) => sum + m.sampleCount, 0)
			).toBe((calculation.data.samples as SolarYearSamples).rows.length);
			if (targetDate === '2028-02-29')
				expect((calculation.data.calendar as { endDateExclusive: string }).endDateExclusive).toBe(
					'2029-02-28'
				);
		},
		30000
	);
	it('changes priorities and practice with context while preserving every astronomical coordinate', async () => {
		const original = await sample(),
			selections: string[] = [],
			practices = new Set<string>();
		for (const context of [
			'Quero rever acordos no relacionamento.',
			'Quero melhorar minha rotina de estudos.',
			'Quero rever a carga de trabalho.',
			'Quero observar minhas escolhas pessoais.'
		]) {
			const value = input(context),
				calculation = await calculateTrial(value, runId),
				reading = composeTrialReading(value, calculation);
			for (const key of [
				'returnPositions',
				'returnHouses',
				'positions',
				'houses',
				'samples',
				'annualGeometry',
				'natalGeometry'
			])
				expect(calculation.data[key]).toEqual(original.data[key]);
			expect(reviewReconstructedSolar(value, calculation, reading)).toEqual([]);
			expect(await approveTrialReading(value, calculation, reading)).not.toBeNull();
			selections.push(reading.editorial!.selection.map((s) => s.factId).join('|'));
			practices.add(reading.practice);
		}
		expect(new Set(selections).size).toBeGreaterThan(1);
		expect(practices.size).toBe(4);
	}, 30000);
	it('keeps declared dates separate and excludes the next anniversary from monthly observations', async () => {
		const value = input();
		value.importantDates = {
			authorization: 'atv-solar-important-dates/1',
			entries: [
				{ date: '2026-01-01', label: 'Revisar prioridades' },
				{ date: '2026-06-01', label: 'Retomar acordos' },
				{ date: '2027-01-01', label: 'Revisar o ciclo' }
			]
		};
		const calculation = await calculateTrial(value, runId),
			reading = composeTrialReading(value, calculation),
			months = calculation.data.months as SolarMonth[];
		expect(months[0].importantDateIds).toContain('important-date-1');
		expect(months[5].importantDateIds).toContain('important-date-2');
		expect(months.flatMap((m) => m.importantDateIds)).not.toContain('important-date-3');
		expect(
			reading.sections.find((s) => s.title === 'Seu contexto e a revisão do ciclo')!.text
		).toContain('fronteira do próximo ciclo');
		expect(await approveTrialReading(value, calculation, reading)).not.toBeNull();
	}, 30000);
	it('rejects incomplete dates, unsupported cycles and an aborted daily calculation', async () => {
		expect(
			parseWorkflowInput({ ...input(), targetDate: '2099-01-01', returnYear: 2099 })
		).toBeNull();
		for (const [start, end] of [
			['2026-02-30', '2027-03-02'],
			['2099-06-01', '2100-06-01'],
			['1899-01-01', '1900-01-01'],
			['2026-01-01', '2026-12-31']
		])
			await expect(
				calculateSolarYearSamples(start, end, new AbortController().signal)
			).rejects.toThrow();
		const controller = new AbortController();
		controller.abort();
		await expect(
			calculateSolarYearSamples('2026-01-01', '2027-01-01', controller.signal)
		).rejects.toThrow();
		const samples = structuredClone((await sample()).data.samples as SolarYearSamples);
		samples.bodies.reverse();
		expect(() => assertSolarYearSamples(samples, '2026-01-01', '2027-01-01')).toThrow();
	});
	it('keeps a full annual chart, separate natal and 365 dated daily observations', async () => {
		const c = await sample(),
			samples = c.data.samples as SolarYearSamples,
			months = c.data.months as SolarMonth[];
		expect(c.version).toBe(SOLAR_VERSION);
		expect(() => assertSolarProjection(input(), c)).not.toThrow();
		expect(c.data.returnPositions).toHaveLength(10);
		expect(c.data.positions).toHaveLength(10);
		expect(samples.rows).toHaveLength(365);
		expect(months).toHaveLength(12);
		expect(months.reduce((sum, m) => sum + m.sampleCount, 0)).toBe(365);
		expect(months[0].startDate).toBe('2026-01-01');
		expect(months.at(-1)!.endDateExclusive).toBe('2027-01-01');
		expect((c.data.annualGeometry as { pairsEvaluated: number }).pairsEvaluated).toBe(45);
		expect((c.data.natalGeometry as { pairsEvaluated: number }).pairsEvaluated).toBe(100);
	}, 30000);
	it('independently verifies monthly counts and minima from the daily coordinates', async () => {
		const c = await sample(),
			samples = c.data.samples as SolarYearSamples,
			natal = c.data.positions as { body: string; longitude: number }[];
		const angles: Record<string, number> = {
			conjunction: 0,
			sextile: 60,
			square: 90,
			trine: 120,
			opposition: 180
		};
		for (const m of c.data.months as SolarMonth[]) {
			const rows = samples.rows.filter(
				(r) =>
					new Date(r[0]).toISOString().slice(0, 10) >= m.startDate &&
					new Date(r[0]).toISOString().slice(0, 10) < m.endDateExclusive
			);
			for (const contact of m.contacts) {
				const n = natal.find((p) => p.body === contact.natal)!,
					index = bodies.indexOf(contact.transit as (typeof bodies)[number]) + 1;
				const values = rows.map((r) => {
					const d = Math.abs(r[index] - n.longitude);
					return Math.abs(Math.min(d, 360 - d) - angles[contact.aspect]);
				});
				expect(contact.observedDates).toBe(values.filter((v) => v <= 2).length);
				expect(contact.minOrb).toBe(Math.min(...values));
				expect(contact.minimumDate).toBe(
					new Date(rows[values.indexOf(Math.min(...values))][0]).toISOString().slice(0, 10)
				);
			}
		}
	});
	it.each([
		'sample',
		'cadence',
		'annual',
		'monthly',
		'facts',
		'birth',
		'birth-coordinates',
		'return-coordinates',
		'calendar'
	])('rejects altered %s evidence', async (kind) => {
		const c = structuredClone(await sample()),
			value = input();
		if (kind === 'sample') (c.data.samples as SolarYearSamples).rows[0][1] += 1;
		if (kind === 'cadence') (c.data.samples as SolarYearSamples).rows[0][0] += 3600000;
		if (kind === 'annual') (c.data.returnPositions as { longitude: number }[])[1].longitude += 1;
		if (kind === 'monthly') (c.data.months as SolarMonth[])[0].contacts[0].observedDates++;
		if (kind === 'facts') c.facts[0].display += ' altered';
		if (kind === 'birth') value.birth!.utcInstant = '2001-01-01T12:00:00Z';
		if (kind === 'birth-coordinates') value.birth!.latitude = 15;
		if (kind === 'return-coordinates') value.returnLocation!.longitude = 15;
		if (kind === 'calendar') (c.data.calendar as { startDate: string }).startDate = '2026-01-02';
		expect(() => assertSolarProjection(value, c)).toThrow();
	});
	it('covers twelve distinct monthly chapters and refuses foreign editorial claims', async () => {
		const s = await saved();
		expect(reviewReconstructedSolar(s.input, s.calculation, s.reading)).toEqual([]);
		const months = s.reading.sections.filter((section) => /^Mês \d+/.test(section.title));
		expect(months).toHaveLength(12);
		expect(new Set(months.map((m) => m.text)).size).toBe(12);
		expect(months.every((m) => m.factIds.some((id) => /^solar-month-\d+-/.test(id)))).toBe(true);
		const altered = structuredClone(s.reading);
		altered.sections[0].text += ' Você vai ganhar uma promoção.';
		expect(await approveTrialReading(s.input, s.calculation, altered)).toBeNull();
	});
	it('draws the saved return chart separately from the natal and keeps valid fact targets', async () => {
		const s = await saved(),
			annual = buildChartScene(s),
			natal = buildChartScene(s, { solarView: 'natal' });
		expect(annual.markers).toHaveLength(10);
		expect(natal.markers).toHaveLength(10);
		expect(annual.title).toContain('carta anual');
		for (const [scene, positions] of [
			[annual, s.calculation.data.returnPositions],
			[natal, s.calculation.data.positions]
		] as const) {
			for (const marker of scene.markers)
				expect(marker.longitude).toBe(
					(positions as { body: string; longitude: number }[]).find((p) => p.body === marker.body)!
						.longitude
				);
		}
		expect(
			annual.nodes
				.filter((n) => n.factId)
				.every((n) => s.calculation.facts.some((f) => f.id === n.factId))
		).toBe(true);
	});
	it('exports the complete same reading as a book with annual and natal mandalas', async () => {
		const s = await saved(),
			{ trialPdf } = await import('../pdf'),
			{ PDFDocument } = await import('pdf-lib');
		const pdf = await trialPdf(s),
			document = await PDFDocument.load(pdf);
		expect(document.getPageCount()).toBeGreaterThan(10);
		const txt = trialText(s);
		expect(s.calculation.facts.every((f) => txt.includes(f.display))).toBe(true);
		const dir = process.env.ATV_RECONSTRUCTION_QA_DIR;
		if (dir) {
			await mkdir(dir, { recursive: true });
			await writeFile(join(dir, 'solar-return.pdf'), pdf);
			await writeFile(join(dir, 'solar-return.json'), JSON.stringify(s, null, 2));
			await writeFile(
				join(dir, 'solar-return-review.txt'),
				[
					s.reading.title,
					s.reading.opening,
					...s.reading.sections.map((s) => s.title + '\n' + s.text),
					s.reading.practice,
					s.reading.source,
					...s.reading.limits
				].join('\n\n')
			);
		}
	}, 30000);
});
