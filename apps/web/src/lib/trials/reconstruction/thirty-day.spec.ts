import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseWorkflowInput, type CalculationSnapshot, type WorkflowInput } from '@atv/domain';
import { calculateTrial } from '../../server/trial-calculation';
import { composeTrialReading, approveTrialReading, type SavedTrial } from '../reading';
import {
	PERIOD_VERSION,
	projectCalendarReading,
	assertCalendarProjection,
	type CalendarData
} from './calendar-facts';
import { thirtyDaySelection, reviewThirtyDayReading } from './thirty-day';
import {
	calendarBounds,
	assertCalendarSamples
} from '../../../../../worker/src/personal-calendar-samples';
import { createProductCalculators } from '../../../../../worker/src/product-runtime';
import { buildChartScene } from '../chart-engine-v2';

const runId = '00000000-0000-4000-8000-000000000130';
const fixture = (
	context = 'Quero rever dinheiro, renda e custos antes de assumir um compromisso.'
): WorkflowInput => ({
	version: 'atv-workflow/1.0.0',
	productId: 'career-forecast-30d',
	targetDate: '2026-10-15',
	forecastPeriod: 'rolling-30-days',
	context,
	birth: {
		localDateTime: '2000-09-09T12:00:00',
		utcInstant: '2000-09-09T15:00:00Z',
		timezone: 'America/Sao_Paulo',
		latitude: -23.5,
		longitude: -46.6,
		locationSource: 'synthetic'
	},
	calendarMarks: {
		authorization: 'atv-personal-calendar-marks/1',
		entries: [{ date: '2026-11-02', label: 'Rever uma proposta com a equipe' }]
	},
	consent: {
		storage: true,
		partner: false,
		continuity: false,
		policyVersion: 'atv-input-consent/1'
	}
});
let cached: CalculationSnapshot;
const sample = async () => (cached ??= await calculateTrial(fixture(), runId));
const asData = (c: CalculationSnapshot) => c.data as unknown as CalendarData;
const saved = async (): Promise<SavedTrial> => {
	const input = fixture(),
		calculation = await sample(),
		reading = composeTrialReading(input, calculation),
		approval = await approveTrialReading(input, calculation, reading);
	expect(approval).not.toBeNull();
	return {
		id: runId,
		product_id: input.productId,
		created_at: '2026-10-15T12:00:00Z',
		input,
		calculation,
		reading,
		approval: approval!
	};
};

describe('30 consecutive days: private calendar and career forecast', () => {
	it('requires the explicit contract and preserves legacy calendar input', () => {
		const value = fixture();
		expect(parseWorkflowInput(value)).toEqual(value);
		expect(parseWorkflowInput({ ...value, forecastPeriod: undefined })).toBeNull();
		expect(parseWorkflowInput({ ...value, forecastPeriod: 'month' })).toBeNull();
		expect(parseWorkflowInput({ ...value, productId: 'direction-journey' })).toBeNull();
		expect(
			parseWorkflowInput({ ...value, targetDate: '2099-12-03', calendarMarks: undefined })
		).toBeNull();
		const legacy = {
			...value,
			productId: 'personal-calendar',
			targetDate: '2026-10-01',
			forecastPeriod: undefined,
			calendarMarks: undefined
		};
		expect(parseWorkflowInput(legacy)?.forecastPeriod).toBeUndefined();
		expect(parseWorkflowInput({ ...legacy, targetDate: '2026-10-15' })).toBeNull();
		expect(
			parseWorkflowInput({
				...value,
				calendarMarks: {
					...value.calendarMarks,
					entries: [{ date: '2026-11-14', label: 'Fora do período' }]
				}
			})
		).toBeNull();
	});
	it.each([
		['2026-10-15', '2026-11-14'],
		['2028-02-15', '2028-03-16'],
		['2026-12-20', '2027-01-19'],
		['2099-12-02', '2100-01-01']
	])('bounds %s to %s with the end excluded', (start, end) => {
		expect(calendarBounds(start, true)).toBe(end);
		expect((Date.parse(end) - Date.parse(start)) / 86400000).toBe(30);
	});
	it('keeps the new calculator opt-in, with no public release implied', () => {
		expect(createProductCalculators()['career-forecast-30d']).toBeUndefined();
		expect(
			createProductCalculators({ experimentalPersonalCalendarBase: true })['career-forecast-30d']
		).toBeUndefined();
		expect(
			createProductCalculators({ experimentalCareerForecastBase: true })['career-forecast-30d']
		).toBeTypeOf('function');
		expect(() =>
			createProductCalculators({ experimentalCareerForecastBase: false } as never)
		).toThrow();
	});
	it('preserves IANA natal provenance and exactly 120 six-hour observations across months', async () => {
		const c = await sample(),
			d = asData(c);
		expect(c.version).toBe(PERIOD_VERSION);
		expect(d.days).toHaveLength(30);
		expect(d.samples.rows).toHaveLength(120);
		expect(d.days[0].date).toBe('2026-10-15');
		expect(d.days.at(-1)!.date).toBe('2026-11-13');
		expect(d.samples.rows.at(-1)![0]).toBe(Date.parse('2026-11-13T18:00:00Z'));
		expect(d.base.data.natalInput).toEqual(fixture().birth);
		expect(() => assertCalendarProjection(fixture(), c)).not.toThrow();
		expect(reviewThirtyDayReading(fixture(), c, composeTrialReading(fixture(), c))).toEqual([]);
	});
	it('changes priorities and selected signals with context, without changing the sky or natal positions', async () => {
		const c = await sample(),
			nextInput = fixture('Quero organizar tarefas, equipe, prazos e carga de trabalho.'),
			next = await calculateTrial(nextInput, runId);
		expect(asData(next).samples.rows).toEqual(asData(c).samples.rows);
		expect(asData(next).positions).toEqual(asData(c).positions);
		const ids = (i: WorkflowInput, v: CalculationSnapshot) =>
			thirtyDaySelection(i, v).days.flatMap((d) => d.signals.map((s) => s.event.id));
		expect(ids(nextInput, next)).not.toEqual(ids(fixture(), c));
		expect(composeTrialReading(nextInput, next).sections[0].text).not.toBe(
			composeTrialReading(fixture(), c).sections[0].text
		);
		expect(
			await approveTrialReading(nextInput, next, composeTrialReading(nextInput, next))
		).not.toBeNull();
		expect(() => assertCalendarProjection(nextInput, c)).toThrow();
	});
	it('changes natal receivers and hypotheses when birth changes, keeping the same period samples', async () => {
		const value = fixture();
		value.birth = {
			...value.birth!,
			localDateTime: '1992-03-11T12:00:00',
			utcInstant: '1992-03-11T15:00:00Z'
		};
		const first = await sample(),
			next = await calculateTrial(value, runId);
		expect(asData(next).samples.rows).toEqual(asData(first).samples.rows);
		expect(asData(next).positions).not.toEqual(asData(first).positions);
		expect(asData(next).events).not.toEqual(asData(first).events);
		expect(await approveTrialReading(value, next, composeTrialReading(value, next))).not.toBeNull();
	});
	it('supports zero, sparse and dense dates without filling quotas or attributing luck', async () => {
		const c = await sample(),
			selection = thirtyDaySelection(fixture(), c),
			counts = selection.days.map((d) => d.signals.length);
		expect(counts).toContain(0);
		expect(counts.some((n) => n > 0)).toBe(true);
		expect(Math.max(...counts)).toBeLessThanOrEqual(2);
		for (const { signals } of selection.days)
			for (const s of signals) {
				expect(selection.prominence(s)).toBeGreaterThanOrEqual(selection.threshold);
				expect(s.window.entireMonth).toBe(false);
			}
		const d = asData(c),
			stationary = structuredClone(d.samples);
		stationary.rows = stationary.rows.map((row) => [row[0], ...stationary.rows[0].slice(1)]);
		const empty = projectCalendarReading(fixture(), d.base, d.natal, stationary),
			reading = composeTrialReading(fixture(), empty);
		expect(thirtyDaySelection(fixture(), empty).days.every((d) => d.signals.length === 0)).toBe(
			true
		);
		expect(await approveTrialReading(fixture(), empty, reading)).not.toBeNull();
	});
	it('rejects altered provenance, missing samples, mismatched dates and unsupported editorial claims', async () => {
		const c = await sample();
		for (const change of [
			(d: CalendarData) => {
				d.samples.rows.pop();
			},
			(d: CalendarData) => {
				d.samples.rows[0][0] += 3600000;
			},
			(d: CalendarData) => {
				d.samples.source = 'invented';
			},
			(d: CalendarData) => {
				d.days[0].date = '2026-10-16';
			},
			(d: CalendarData) => {
				d.natal.facts.pop();
			}
		]) {
			const bad = structuredClone(c);
			change(asData(bad));
			expect(() => assertCalendarProjection(fixture(), bad)).toThrow();
		}
		const missing = structuredClone(asData(c).samples);
		missing.rows.pop();
		expect(() => assertCalendarSamples(missing, '2026-10-15', true)).toThrow();
		const reading = composeTrialReading(fixture(), c);
		for (const change of [
			(r: typeof reading) => {
				r.sections[2].factIds = [];
			},
			(r: typeof reading) => {
				r.sections[2].text += ' Vai receber uma promoção garantida.';
			},
			(r: typeof reading) => {
				r.editorial!.selection = [];
			}
		]) {
			const bad = structuredClone(reading);
			change(bad);
			expect(await approveTrialReading(fixture(), c, bad)).toBeNull();
		}
	});
	it('interprets each selected window once and links later stages to its first date', async () => {
		const calculation = await sample();
		const selected = thirtyDaySelection(fixture(), calculation).days.flatMap((day) => day.signals);
		const windows = new Set(selected.map((signal) => signal.window.id));
		const reading = composeTrialReading(fixture(), calculation);
		const text = reading.sections
			.slice(2, 8)
			.map((section) => section.text)
			.join('\n');
		expect(selected.length).toBeGreaterThan(windows.size);
		expect(text.match(/a hipótese aproxima/g)).toHaveLength(windows.size);
		expect(text.match(/Compare com a interpretação de \d{2}\/\d{2}\/\d{4}/g)).toHaveLength(
			selected.length - windows.size
		);
		expect(await approveTrialReading(fixture(), calculation, reading)).not.toBeNull();
	});
	it('renders both boundary-day charts and six dated reading groups with every date covered', async () => {
		const s = await saved(),
			d = asData(s.calculation);
		expect(s.reading.sections).toHaveLength(10);
		expect(s.reading.editorial!.plan.filter((p) => p.role.startsWith('period-days-'))).toHaveLength(
			6
		);
		for (const day of d.days)
			expect(
				s.reading.sections.some((section) => section.factIds.includes(`calendar-day-${day.date}`))
			).toBe(true);
		expect(
			s.reading.sections.some((section) =>
				section.text.includes('Marco informado por você: Rever uma proposta com a equipe')
			)
		).toBe(true);
		for (const day of [0, 29])
			expect(
				buildChartScene(s, { weekDay: day }).nodes.some(
					(n) => n.factId === `calendar-position-${d.days[day].date}-moon`
				)
			).toBe(true);
	});
	it('uses the same rolling contract for the general calendar, with its own thematic selection', async () => {
		const value = {
			...fixture('Quero entender meus relacionamentos e combinar espaço com meu parceiro.'),
			productId: 'personal-calendar'
		};
		const c = await calculateTrial(value, runId),
			reading = composeTrialReading(value, c);
		expect(c.version).toBe(PERIOD_VERSION);
		expect(asData(c).days).toHaveLength(30);
		expect(reading.title).toBe('Calendário de Previsões — Próximos 30 Dias');
		expect(reading.editorial!.context.key).toBe('relationship');
		expect(await approveTrialReading(value, c, reading)).not.toBeNull();
	});
	it('exports a complete compact PDF and optional synthetic review evidence', async () => {
		const s = await saved(),
			{ trialPdf } = await import('../pdf'),
			{ PDFDocument } = await import('pdf-lib'),
			bytes = await trialPdf(s),
			pdf = await PDFDocument.load(bytes);
		expect(pdf.getPageCount()).toBeGreaterThan(5);
		expect(pdf.getPageCount()).toBeLessThan(31);
		const dir = process.env.ATV_RECONSTRUCTION_QA_DIR;
		if (dir) {
			await mkdir(dir, { recursive: true });
			await writeFile(join(dir, 'career-forecast-30d.pdf'), bytes);
			await writeFile(join(dir, 'career-forecast-30d.json'), JSON.stringify(s, null, 2));
		}
	}, 30000);
});
