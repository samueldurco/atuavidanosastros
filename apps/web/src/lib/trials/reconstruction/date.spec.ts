import { describe, expect, it } from 'vitest';
import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { CrossAspectCalculation } from '@atv/astrology';
import { calculateTrial } from '../../server/trial-calculation';
import { approveTrialReading, composeTrialReading, type SavedTrial } from '../reading';
import { buildChartScene, boxesOverlap } from '../chart-engine-v2';
import { reviewReconstructedDate } from './date';
import { assertDateProjection, DATE_VERSION } from './date-facts';

const runId = '00000000-0000-4000-8000-000000000094';
const input = (context = 'Quero rever os acordos do relacionamento.'): WorkflowInput => ({
	version: 'atv-workflow/1.0.0',
	productId: 'date-reading',
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
const geometry = (c: CalculationSnapshot) =>
	c.data.transitGeometry as Omit<CrossAspectCalculation, 'roles'> & { roles: string[] };

describe('Leitura da Data: natal relationships at a declared sample', () => {
	it('retains both source snapshots and independently verified directed geometry', async () => {
		const value = input(),
			c = await calculateTrial(value, runId),
			g = geometry(c);
		expect(c.version).toBe(DATE_VERSION);
		expect(g.roles).toEqual(['date-sample', 'natal']);
		expect(g.pairsEvaluated).toBe(100);
		expect(g.aspects.length).toBeGreaterThan(2);
		const exact = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
		for (const aspect of g.aspects) {
			const a = g.inputPositions.first.find((p) => p.body === aspect.first)!.longitude;
			const b = g.inputPositions.second.find((p) => p.body === aspect.second)!.longitude;
			const delta = Math.abs(a - b),
				separation = Math.min(delta, 360 - delta);
			expect(aspect.separationDegrees).toBeCloseTo(separation, 10);
			expect(aspect.orbDegrees).toBeCloseTo(Math.abs(separation - exact[aspect.kind]), 10);
			expect(aspect.orbDegrees).toBeLessThanOrEqual(2);
		}
		expect(c.data.houses).toEqual((c.data.natal as CalculationSnapshot).data.houses);
		expect(c.data.sampleInstant).toBe('2026-10-08T12:00:00.000Z');
		expect(c.data.events).toEqual([]);
		expect(c.data.compatibilityScore).toBeNull();
		expect(c.facts.some((fact) => fact.display.includes('da candidata'))).toBe(false);
		expect(() => assertDateProjection(value, c)).not.toThrow();
	});
	it('composes relational chapters with factual coverage and server review', async () => {
		const value = input(),
			calculation = await calculateTrial(value, runId);
		const reading = composeTrialReading(value, calculation);
		const sentences = reading.sections
			.filter((s) => !/^Referências/.test(s.title))
			.flatMap((s) =>
				s.text
					.split(/(?<=[.!?])\s+/)
					.map((s) => s.trim())
					.filter((s) => s.length > 100)
			);
		expect(sentences.filter((s, i) => sentences.indexOf(s) !== i)).toEqual([]);
		expect(reviewReconstructedDate(value, calculation, reading)).toEqual([]);
		expect(reading.sections.length).toBeGreaterThanOrEqual(8);
		expect(reading.sections[0].text).toMatch(/Ao mesmo tempo/);
		expect(reading.sections.some((s) => s.title === 'Acordos no vínculo que você trouxe')).toBe(
			true
		);
		const approval = await approveTrialReading(value, calculation, reading);
		expect(approval).not.toBeNull();
		const saved = {
			id: runId,
			product_id: value.productId,
			created_at: '2026-10-08T12:00:00Z',
			input: value,
			calculation,
			reading,
			approval: approval!
		} satisfies SavedTrial;
		const scene = buildChartScene(saved);
		expect(scene.markers).toHaveLength(20);
		for (const [i, marker] of scene.markers.entries()) {
			expect(scene.markers.slice(i + 1).some((other) => boxesOverlap(marker.box, other.box))).toBe(
				false
			);
			const [role, body] = marker.body.split(':');
			const source =
				role === 'sample'
					? geometry(calculation).inputPositions.first
					: geometry(calculation).inputPositions.second;
			expect(marker.longitude).toBe(source.find((p) => p.body === body)!.longitude);
		}
		expect(
			scene.nodes
				.filter((n) => n.layer === 'aspects')
				.every((n) => reading.editorial!.selection.some((s) => s.factId === n.factId))
		).toBe(true);
		expect(
			buildChartScene(saved, { aspects: 'none' }).nodes.some((n) => n.layer === 'aspects')
		).toBe(false);
		expect(
			buildChartScene(saved).nodes.filter((n) => n.layer === 'houses' && n.type === 'line')
		).toHaveLength(12);
	});
	it('reviews diverse dates and contexts without duplicated paragraphs or unsupported selection', async () => {
		for (const date of ['1900-01-01', '2026-04-10', '2026-10-08', '2099-12-31']) {
			for (const context of [
				'',
				'Quero estudar e organizar o aprendizado.',
				'Estou mudando de cidade.',
				'Quero negociar a sobrecarga no trabalho.'
			]) {
				const value = { ...input(context), targetDate: date };
				if (!context) delete value.context;
				const calculation = await calculateTrial(value, runId);
				const reading = composeTrialReading(value, calculation);
				expect(reviewReconstructedDate(value, calculation, reading), `${date}: ${context}`).toEqual(
					[]
				);
				expect(await approveTrialReading(value, calculation, reading)).not.toBeNull();
			}
		}
	});
	it('context changes the reading and priorities without changing geometry', async () => {
		const a = input(),
			b = input('Quero negociar as prioridades de trabalho na equipe.');
		const ca = await calculateTrial(a, runId),
			cb = await calculateTrial(b, runId);
		const ra = composeTrialReading(a, ca),
			rb = composeTrialReading(b, cb);
		expect(geometry(ca)).toEqual(geometry(cb));
		expect(ra.editorial?.context.key).toBe('relationships');
		expect(rb.editorial?.context.key).toBe('workload');
		expect(ra.practice).not.toBe(rb.practice);
		expect(ra.editorial?.selection).not.toEqual(rb.editorial?.selection);
		expect(reviewReconstructedDate(b, cb, rb)).toEqual([]);
	});
	it('a different date or birth changes the actual relationship and conclusion', async () => {
		const a = input(),
			b = { ...input(), targetDate: '2026-11-08' },
			d = input();
		d.birth = {
			...d.birth!,
			localDateTime: '1986-07-19T04:30:00',
			utcInstant: '1986-07-19T04:30:00Z',
			latitude: -23.55,
			longitude: -46.63
		};
		const ca = await calculateTrial(a, runId),
			cb = await calculateTrial(b, runId),
			cd = await calculateTrial(d, runId);
		expect(geometry(ca).aspects).not.toEqual(geometry(cb).aspects);
		expect(geometry(ca).aspects).not.toEqual(geometry(cd).aspects);
		expect(composeTrialReading(a, ca).sections[0].text).not.toBe(
			composeTrialReading(b, cb).sections[0].text
		);
		expect(reviewReconstructedDate(d, cd, composeTrialReading(d, cd))).toEqual([]);
	});
	it('rejects edited orb, input date, source position or substituted context', async () => {
		const value = input(),
			c = await calculateTrial(value, runId);
		const orb = structuredClone(c);
		(geometry(orb).aspects[0] as { orbDegrees: number }).orbDegrees += 0.1;
		const source = structuredClone(c);
		(
			(source.data.natal as CalculationSnapshot).data.positions as { longitude: number }[]
		)[0].longitude += 0.1;
		for (const changed of [orb, source])
			expect(() => composeTrialReading(value, changed)).toThrow();
		expect(() => composeTrialReading({ ...value, targetDate: '2026-10-09' }, c)).toThrow();
		expect(() => composeTrialReading({ ...value, context: 'Outro assunto' }, c)).toThrow();
	});
});
