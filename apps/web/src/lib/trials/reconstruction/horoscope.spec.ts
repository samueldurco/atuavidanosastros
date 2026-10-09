import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { CrossAspectCalculation } from '@atv/astrology';
import { calculateTrial } from '../../server/trial-calculation';
import { approveTrialReading, composeTrialReading, type SavedTrial } from '../reading';
import { buildChartScene } from '../chart-engine-v2';
import { trialGeometry } from '../cartography';
import { reviewReconstructedHoroscope } from './horoscope';
import { assertHoroscopeProjection, HOROSCOPE_VERSION } from './horoscope-facts';

const runId = '00000000-0000-4000-8000-000000000098';
const input = (context = 'Quero rever os acordos do relacionamento.'): WorkflowInput => ({
	version: 'atv-workflow/1.0.0',
	productId: 'horoscope',
	targetDate: '2026-10-08',
	context,
	birth: {
		localDateTime: '2000-01-01T12:00:00',
		utcInstant: '2000-01-01T12:00:00Z',
		timezone: 'UTC',
		latitude: 0,
		longitude: 0,
		locationSource: 'synthetic'
	},
	consent: {
		storage: true,
		partner: false,
		continuity: false,
		policyVersion: 'atv-input-consent/1'
	}
});
const geometry = (c: CalculationSnapshot) => c.data.transitGeometry as CrossAspectCalculation;

describe('Horóscopo diário personalizado', () => {
	it('retains sources, complete natal chart and one declared daily sample', async () => {
		const value = input(),
			c = await calculateTrial(value, runId),
			g = geometry(c);
		expect(c.version).toBe(HOROSCOPE_VERSION);
		expect(c.data.period).toEqual({
			kind: 'daily',
			date: value.targetDate,
			sampleInstant: '2026-10-08T12:00:00.000Z'
		});
		expect(g.pairsEvaluated).toBe(100);
		expect(g.inputPositions.first).toHaveLength(10);
		expect(g.inputPositions.second).toHaveLength(10);
		expect(c.data.houses).toEqual((c.data.natal as CalculationSnapshot).data.houses);
		expect(c.data.events).toEqual([]);
		const angles = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
		for (const a of g.aspects) {
			const x = g.inputPositions.first.find((p) => p.body === a.first)!.longitude;
			const y = g.inputPositions.second.find((p) => p.body === a.second)!.longitude;
			const separation = Math.min(Math.abs(x - y), 360 - Math.abs(x - y));
			expect(a.orbDegrees).toBeCloseTo(Math.abs(separation - angles[a.kind]), 10);
			expect(a.orbDegrees).toBeLessThanOrEqual(2);
		}
		expect(() => assertHoroscopeProjection(value, c)).not.toThrow();
	});
	it('selects three to six contacts and uses them in a central synthesis and individual chapters', async () => {
		const value = input(),
			c = await calculateTrial(value, runId),
			r = composeTrialReading(value, c);
		expect(r.editorial!.selection.length).toBeGreaterThanOrEqual(3);
		expect(r.editorial!.selection.length).toBeLessThanOrEqual(6);
		expect(r.sections.filter((s) => /^Movimento \d/.test(s.title))).toHaveLength(
			r.editorial!.selection.length
		);
		expect(r.sections[0].title).toBe('O tema central do seu dia');
		expect(r.sections[0].text).toContain('natal');
		expect(r.sections.some((s) => s.title === 'Estímulos rápidos e pano de fundo')).toBe(true);
		expect(reviewReconstructedHoroscope(value, c, r)).toEqual([]);
		const directory = process.env.ATV_HOROSCOPE_QA_DIR;
		if (directory) {
			await mkdir(directory, { recursive: true });
			await writeFile(
				join(directory, 'horoscope.json'),
				JSON.stringify({ input: value, calculation: c, reading: r }, null, 2)
			);
			await writeFile(
				join(directory, 'horoscope.md'),
				[
					r.title,
					r.opening,
					...r.sections
						.filter((s) => s.title !== 'Referências desta leitura')
						.map((s) => `## ${s.title}\n\n${s.text}`),
					r.source
				].join('\n\n')
			);
		}
		expect(await approveTrialReading(value, c, r)).not.toBeNull();
		const covered = new Set(r.sections.flatMap((s) => s.factIds));
		expect(c.facts.every((f) => covered.has(f.id))).toBe(true);
	});
	it('context changes priorities and practical guidance while geometry remains identical', async () => {
		const a = input(),
			b = input('Quero negociar as prioridades de trabalho na equipe.');
		const ca = await calculateTrial(a, runId),
			cb = await calculateTrial(b, runId);
		const ra = composeTrialReading(a, ca),
			rb = composeTrialReading(b, cb);
		expect(geometry(ca)).toEqual(geometry(cb));
		expect(ra.editorial!.context.key).toBe('relationships');
		expect(rb.editorial!.context.key).toBe('workload');
		expect(ra.editorial!.selection.map((s) => s.factId)).not.toEqual(
			rb.editorial!.selection.map((s) => s.factId)
		);
		expect(ra.sections[0].text).not.toBe(rb.sections[0].text);
		expect(ra.practice).not.toBe(rb.practice);
	});
	it('changing date or natal chart changes actual contacts rather than only a date label', async () => {
		const a = input(),
			b = { ...a, targetDate: '2027-02-14' },
			d = {
				...a,
				birth: {
					...a.birth!,
					localDateTime: '1985-06-19T18:00:00',
					utcInstant: '1985-06-19T18:00:00Z'
				}
			};
		const ca = await calculateTrial(a, runId),
			cb = await calculateTrial(b, runId),
			cd = await calculateTrial(d, runId);
		expect(geometry(ca).aspects).not.toEqual(geometry(cb).aspects);
		expect(geometry(ca).inputPositions.second).not.toEqual(geometry(cd).inputPositions.second);
		expect(composeTrialReading(a, ca).sections[0].text).not.toEqual(
			composeTrialReading(d, cd).sections[0].text
		);
	});
	it('rejects changes to geometry, source, period and factual reading', async () => {
		const value = input(),
			c = await calculateTrial(value, runId),
			r = composeTrialReading(value, c);
		for (const mutate of [
			(v: CalculationSnapshot) => {
				const g = geometry(v);
				v.data.transitGeometry = {
					...g,
					aspects: g.aspects.map((a, i) => (i === 0 ? { ...a, orbDegrees: a.orbDegrees + 0.1 } : a))
				};
			},
			(v: CalculationSnapshot) => {
				v.data.period = { kind: 'monthly' };
			},
			(v: CalculationSnapshot) => {
				v.facts[0].display += ' adulterado';
			},
			(v: CalculationSnapshot) => {
				v.data.events = [{ exact: true }];
			}
		]) {
			const changed = structuredClone(c);
			mutate(changed);
			expect(() => assertHoroscopeProjection(value, changed)).toThrow();
		}
		const changed = structuredClone(r);
		changed.sections[0].text += ' Sucesso garantido.';
		expect(await approveTrialReading(value, c, changed)).toBeNull();
	});
	it('maps all twenty positions and only selected directed contacts to their real facts', async () => {
		const value = input(),
			calculation = await calculateTrial(value, runId),
			reading = composeTrialReading(value, calculation);
		const saved = { product_id: 'horoscope', input: value, calculation, reading } as SavedTrial;
		expect(trialGeometry(saved).positions).toHaveLength(10);
		const scene = buildChartScene(saved);
		expect(scene.title).toContain('horóscopo');
		expect(scene.markers).toHaveLength(20);
		const allIds = new Set(calculation.facts.map((f) => f.id));
		expect(scene.nodes.filter((n) => n.factId).every((n) => allIds.has(n.factId!))).toBe(true);
		expect(
			scene.nodes
				.filter((n) => n.layer === 'aspects')
				.every((n) => reading.editorial!.selection.some((s) => s.factId === n.factId))
		).toBe(true);
		expect(
			buildChartScene(saved, { aspects: 'none' }).nodes.some((n) => n.layer === 'aspects')
		).toBe(false);
	});
	it('reviews diverse dates, charts and contexts with supported finite selections', async () => {
		for (const date of ['1900-01-01', '2026-04-10', '2099-12-31'])
			for (const context of [
				'',
				'Quero estudar e organizar o aprendizado.',
				'Quero rever os acordos do relacionamento.',
				'Quero negociar a sobrecarga no trabalho.'
			]) {
				const value = { ...input(context), targetDate: date };
				if (!context) delete value.context;
				const c = await calculateTrial(value, runId),
					r = composeTrialReading(value, c);
				expect(reviewReconstructedHoroscope(value, c, r), `${date}:${context}`).toEqual([]);
				expect(await approveTrialReading(value, c, r)).not.toBeNull();
			}
	});
});
