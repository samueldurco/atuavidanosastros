import { describe, expect, it } from 'vitest';
import { CaelusEphemerisProvider, type EphemerisProvider } from '@atv/astrology';
import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import { calculateTrial } from '../../server/trial-calculation';
import { composeTrialReading, approveTrialReading, type SavedTrial } from '../reading';
import {
	calendarBounds,
	calculateCalendarSamples,
	assertCalendarSamples
} from '../../../../../worker/src/personal-calendar-samples';
import {
	CALENDAR_VERSION,
	assertCalendarProjection,
	projectCalendarReading,
	type CalendarData
} from './calendar-facts';
import { calendarSelection, reviewReconstructedCalendar } from './calendar';
import { buildChartScene } from '../chart-engine-v2';
import { trialText } from '../exports';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const runId = '00000000-0000-4000-8000-000000000110';
const input = (
	targetDate = '2026-01-01',
	context = 'Quero negociar responsabilidades de trabalho e reservar tempo para estudar.'
): WorkflowInput => ({
	version: 'atv-workflow/1.0.0',
	productId: 'personal-calendar',
	targetDate,
	context,
	birth: {
		localDateTime: '2000-01-01T12:00:00',
		utcInstant: '2000-01-01T12:00:00Z',
		timezone: 'UTC',
		latitude: 0,
		longitude: 0,
		locationSource: 'synthetic'
	},
	calendarMarks: {
		authorization: 'atv-personal-calendar-marks/1',
		entries: [{ date: targetDate.slice(0, 8) + '15', label: 'Revisão de prioridades com a equipe' }]
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
	expect(reviewReconstructedCalendar(value, calculation, reading)).toEqual([]);
	expect(approval).not.toBeNull();
	expect(JSON.stringify({ calculation, reading, input: value }).length).toBeLessThan(749000);
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
describe('Calendário Pessoal reconstruído', () => {
	it.each([
		['2026-02-01', 28],
		['2028-02-01', 29],
		['2026-04-01', 30],
		['2026-01-01', 31],
		['2099-12-01', 31]
	] as const)(
		'preserves all dates of %s (%i days) and excludes the next month boundary',
		async (start, count) => {
			const c = await calculateTrial(input(start), runId),
				d = c.data as unknown as CalendarData;
			expect(c.version).toBe(CALENDAR_VERSION);
			expect(d.days).toHaveLength(count);
			expect(d.samples.rows).toHaveLength(count * 4);
			expect(d.days[0].date).toBe(start);
			expect(d.days.at(-1)!.endInstantExclusive.slice(0, 10)).toBe(calendarBounds(start));
			expect(d.samples.rows.at(-1)![0]).toBe(Date.parse(d.days.at(-1)!.date + 'T18:00:00Z'));
			expect(
				await approveTrialReading(input(start), c, composeTrialReading(input(start), c))
			).not.toBeNull();
		}
	);
	it.each(['2026-01-02', '2026-02-30', '1899-12-01', '2100-01-01'])(
		'rejects an unsupported month %s',
		(start) => expect(() => calendarBounds(start)).toThrow()
	);
	it('binds every observation to its actual epoch, common source, license and geocentric input', async () => {
		const d = (await sample()).data as unknown as CalendarData;
		assertCalendarSamples(d.samples, input().targetDate!);
		expect(d.samples.license).toBe('caelus@0.24.1/MIT');
		const provider = new CaelusEphemerisProvider(),
			index = 47,
			epoch = d.samples.rows[index][0],
			utcInstant = new Date(epoch).toISOString();
		const chart = await provider.calculate({
			...d.samples.inputTemplate,
			localDateTime: utcInstant.slice(0, -1),
			utcInstant
		});
		for (const [j, body] of d.samples.bodies.entries())
			expect(d.samples.rows[index][j + 1]).toBe(
				chart.positions.find((p) => p.body === body)!.longitude
			);
	});
	it.each(['missing', 'duplicate', 'epoch', 'source', 'license', 'longitude'])(
		'rejects %s observation evidence without accepting a partial month',
		async (kind) => {
			const c = structuredClone(await sample()),
				d = c.data as unknown as CalendarData;
			if (kind === 'missing') d.samples.rows.splice(12, 1);
			if (kind === 'duplicate') d.samples.rows[12] = [...d.samples.rows[11]];
			if (kind === 'epoch') d.samples.rows[0][0] += 1000;
			if (kind === 'source') d.samples.source = 'wrong-source';
			if (kind === 'license') (d.samples as unknown as { license: string }).license = 'unknown';
			if (kind === 'longitude') d.samples.rows[12][1] = 360;
			expect(() => assertCalendarProjection(input(), c)).toThrow();
			await expect(
				approveTrialReading(input(), c, composeTrialReading(input(), await sample()))
			).rejects.toThrow();
		}
	);
	it('stops on abort or a provider that changes the requested observation time', async () => {
		const abort = new AbortController();
		abort.abort();
		await expect(calculateCalendarSamples('2026-01-01', abort.signal)).rejects.toThrow();
		const actual = new CaelusEphemerisProvider();
		const provider = {
			calculate: async (value: Parameters<EphemerisProvider['calculate']>[0]) => {
				const chart = await actual.calculate(value);
				return {
					...chart,
					provenance: {
						...chart.provenance,
						temporal: { ...chart.provenance.temporal, utcInstant: '2026-01-01T01:00:00.000Z' }
					}
				};
			}
		} as EphemerisProvider;
		await expect(
			calculateCalendarSamples('2026-01-01', new AbortController().signal, provider)
		).rejects.toThrow(/instante/);
	});
	it('keeps observed entry, strict sampled peak and first outside sample attached to their own dates', async () => {
		const d = (await sample()).data as unknown as CalendarData;
		for (const e of d.events) {
			const w = d.windows.find((w) => w.id === e.windowId)!;
			expect(e.date).toBe(e.instant.slice(0, 10));
			expect(d.days.find((day) => day.date === e.date)!.eventIds).toContain(e.id);
			if (e.kind === 'entry') {
				expect(e.instant).toBe(w.firstInstant);
				expect(e.orb).toBeLessThanOrEqual(2);
			}
			if (e.kind === 'peak') {
				expect(e.instant).toBe(w.minimumInstant);
				expect(e.orb).toBe(w.minOrb);
			}
			if (e.kind === 'exit') {
				expect(Date.parse(e.instant) - Date.parse(w.lastInstant)).toBe(21600000);
				expect(e.orb).toBeGreaterThan(2);
			}
		}
		expect(new Set(d.events.map((e) => e.kind))).toEqual(new Set(['entry', 'peak', 'exit']));
	});
	it('keeps at most three unique changes per day and separates month-long background', async () => {
		const s = await saved(),
			d = s.calculation.data as unknown as CalendarData,
			choice = calendarSelection(s.input, s.calculation);
		expect(choice.days).toHaveLength(31);
		for (const { day, signals } of choice.days) {
			expect(signals.length).toBeLessThanOrEqual(3);
			expect(new Set(signals.map((s) => s.window.id)).size).toBe(signals.length);
			expect(signals.every((s) => s.event.date === day.date && !s.window.entireMonth)).toBe(true);
		}
		expect(
			choice.background.every((w) => w.entireMonth && w.observations === d.samples.rows.length)
		).toBe(true);
		expect(
			s.reading.editorial!.plan.filter((p) => p.role.startsWith('calendar-day-'))
		).toHaveLength(31);
		expect(s.reading.sections.find((x) => x.title.startsWith('15/01/2026'))!.text).toContain(
			'Marco que você trouxe: Revisão de prioridades com a equipe'
		);
	});
	it('changes the selection with consented context while preserving geometry and reported marks', async () => {
		const c = await sample(),
			changed = input('2026-01-01', 'Quero combinar espaço e reciprocidade em meu relacionamento.'),
			next = await calculateTrial(changed, runId),
			d = c.data as unknown as CalendarData,
			n = next.data as unknown as CalendarData;
		expect(n.samples.rows).toEqual(d.samples.rows);
		expect(n.positions).toEqual(d.positions);
		expect(
			calendarSelection(changed, next).days.flatMap((d) => d.signals.map((s) => s.event.id))
		).not.toEqual(
			calendarSelection(input(), c).days.flatMap((d) => d.signals.map((s) => s.event.id))
		);
		expect(() => assertCalendarProjection(changed, c)).toThrow();
		expect(
			await approveTrialReading(changed, next, composeTrialReading(changed, next))
		).not.toBeNull();
	});
	it('interprets each selected window once and uses its later stages for comparison', async () => {
		const c = await sample(),
			reading = composeTrialReading(input(), c);
		const seen = new Set<string>();
		for (const { day, signals } of calendarSelection(input(), c).days) {
			const section = reading.sections.find((s) =>
				s.title.startsWith(day.date.split('-').reverse().join('/'))
			)!;
			for (const { window } of signals) {
				if (seen.has(window.id))
					expect(section.text).toContain('Retomada do movimento apresentado em');
				seen.add(window.id);
			}
		}
	});
	it('retains zero-signal days as distinct dates without filling them with repeated interpretations', async () => {
		// Deliberately stationary test fixture exercises the absence path; it is not an astronomical month or E2 evidence.
		const c = await sample(),
			d = c.data as unknown as CalendarData,
			stationary = structuredClone(d.samples);
		stationary.rows = stationary.rows.map((row) => [row[0], ...stationary.rows[0].slice(1)]);
		const empty = projectCalendarReading(input(), d.base, d.natal, stationary),
			reading = composeTrialReading(input(), empty);
		expect(calendarSelection(input(), empty).days.every((d) => d.signals.length === 0)).toBe(true);
		expect(new Set(reading.sections.slice(2, 33).map((s) => s.text)).size).toBe(31);
		expect(await approveTrialReading(input(), empty, reading)).not.toBeNull();
	});
	it('rejects moved dates, changed marks, injected facts and unsupported promises', async () => {
		const s = await saved();
		for (const change of [
			(r: typeof s.reading) => {
				r.editorial!.plan[2].factIds = [];
			},
			(r: typeof s.reading) => {
				r.sections[2].factIds.push('invented');
			},
			(r: typeof s.reading) => {
				r.sections[2].text += ' Vai acontecer uma promoção.';
			}
		]) {
			const r = structuredClone(s.reading);
			change(r);
			expect(await approveTrialReading(s.input, s.calculation, r)).toBeNull();
		}
		const changed = input();
		changed.calendarMarks!.entries[0].label = 'Outra situação';
		expect(() => assertCalendarProjection(changed, s.calculation)).toThrow();
	});
	it('renders distinct noon skies from actual longitudes with facts belonging to each selected date', async () => {
		const s = await saved(),
			first = buildChartScene(s, { weekDay: 0 }),
			last = buildChartScene(s, { weekDay: 30 });
		expect(first.title).toContain('calendário');
		expect(first.nodes).not.toEqual(last.nodes);
		expect(first.nodes.some((n) => n.factId === 'calendar-position-2026-01-01-moon')).toBe(true);
		expect(last.nodes.some((n) => n.factId === 'calendar-position-2026-01-31-moon')).toBe(true);
		expect(() => buildChartScene(s, { weekDay: 31 })).toThrow();
	});
	it('exports the same complete monthly reading with the monthly grid and date chapters', async () => {
		const s = await saved(),
			{ trialPdf } = await import('../pdf'),
			{ PDFDocument } = await import('pdf-lib'),
			pdf = await trialPdf(s),
			doc = await PDFDocument.load(pdf),
			txt = trialText(s);
		expect(doc.getPageCount()).toBeGreaterThan(10);
		expect(s.calculation.facts.every((f) => txt.includes(f.display))).toBe(true);
		const dir = process.env.ATV_RECONSTRUCTION_QA_DIR;
		if (dir) {
			await mkdir(dir, { recursive: true });
			await writeFile(join(dir, 'personal-calendar.pdf'), pdf);
			await writeFile(join(dir, 'personal-calendar.json'), JSON.stringify(s, null, 2));
			await writeFile(
				join(dir, 'personal-calendar-review.txt'),
				[
					s.reading.opening,
					...s.reading.sections.map((x) => x.title + '\n' + x.text),
					s.reading.practice,
					...s.reading.limits
				].join('\n\n')
			);
		}
	}, 30000);
});
