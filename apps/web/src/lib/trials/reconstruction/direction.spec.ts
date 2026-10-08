import { describe, expect, it } from 'vitest';
import type { WorkflowInput } from '@atv/domain';
import { calculateTrial } from '../../server/trial-calculation';
import { approveTrialReading, composeTrialReading } from '../reading';
import { assertDirectionProjection, DIRECTION_VERSION } from './direction-facts';
import { reviewReconstructedDirection } from './direction';
import {
	DIRECTION_NOTE_VERSION,
	parseDirectionNote,
	directionSynthesis,
	type DirectionStep
} from './direction-check-ins';
const runId = '00000000-0000-4000-8000-000000000130';
const input = (
	goal = 'Experimentar uma atividade com horário de descanso.',
	context?: string,
	startDate = '2026-10-06'
): WorkflowInput => ({
	version: 'atv-workflow/1.0.0',
	productId: 'direction-journey',
	journey: { goal, startDate },
	...(context ? { context } : {}),
	consent: {
		storage: true,
		partner: false,
		continuity: false,
		policyVersion: 'atv-input-consent/1'
	}
});
const note = (step: DirectionStep) => ({
	version: DIRECTION_NOTE_VERSION,
	step,
	observation:
		step === 0
			? 'Espero conhecer uma tarefa sem perder descanso.'
			: 'Observei interesse, mas tive pouco tempo.',
	conditions: 'Vinte minutos; sem despesa.',
	counterevidence: 'A tarefa inteira exigiu mais tempo que a amostra.',
	next: 'Reduzir a amostra e rever o limite.',
	decision: step === 30 ? 'adjust' : 'undecided'
});
const savedNote = (step: DirectionStep) => ({
	step,
	text: JSON.stringify(note(step)),
	updated_at: '2026-11-10T12:00:00Z'
});
describe('Jornada de Direção reconstruída', () => {
	it('keeps the native civil facts, inclusive dates and declared goal without astrology', async () => {
		const i = input(),
			c = await calculateTrial(i, runId);
		expect(c.version).toBe(DIRECTION_VERSION);
		expect(c.facts.map((f) => f.display)).toEqual([
			i.journey!.goal,
			'2026-10-06',
			'Dia 7: 2026-10-12',
			'Dia 14: 2026-10-19',
			'Dia 30: 2026-11-04'
		]);
		expect(c.data.method).toMatchObject({
			expense: 0,
			maximumMinutesPerExperiment: 45,
			astrology: 'not-used'
		});
		expect(c.data.native).toMatchObject({
			data: { reading: 'not-produced', checkIns: 'not-recorded' }
		});
		expect(() => assertDirectionProjection(i, c)).not.toThrow();
		const reading = composeTrialReading(i, c);
		expect(reading.sections).toHaveLength(11);
		expect(reading.sections.every((s) => s.text.length > 220)).toBe(true);
		expect(reading.sections.flatMap((s) => s.factIds)).toEqual(
			expect.arrayContaining(c.facts.map((f) => f.id))
		);
		expect(reviewReconstructedDirection(i, c, reading)).toEqual([]);
		expect(await approveTrialReading(i, c, reading)).not.toBeNull();
		expect(c.facts.some((f) => /position-|house-|aspect-|midheaven/.test(f.id))).toBe(false);
	});
	it.each([
		['2028-02-27', '2028-03-27'],
		['2026-12-20', '2027-01-18']
	])('handles civil month/year boundaries from %s', async (start, last) => {
		const c = await calculateTrial(input(undefined, undefined, start), runId);
		expect(c.facts.find((f) => f.id === 'civil-check-in-day-30')?.display).toBe(`Dia 30: ${last}`);
	});
	it.each([
		['Quero mudar de área preservando o descanso.', 'transition'],
		['Quero estudar uma habilidade com tempo limitado.', 'study'],
		['Quero coordenar uma equipe com acordos claros.', 'leadership'],
		['Quero experimentar trabalho autônomo em uma amostra.', 'independent'],
		['Quero rever a rotina e preservar descanso.', 'workload'],
		['Quero conhecer uma possibilidade em pequena escala.', 'general']
	])('selects finite experiments for the declared goal %s', async (goal, key) => {
		const i = input(goal, 'Tenho pouco recurso e preciso preservar meus compromissos.'),
			c = await calculateTrial(i, runId),
			r = composeTrialReading(i, c);
		expect(r.editorial?.context.key).toBe(key);
		expect(r.sections.flatMap((s) => s.factIds)).toContain('reported-context');
		expect(await approveTrialReading(i, c, r)).not.toBeNull();
		expect(JSON.stringify(r)).not.toMatch(/undefined|NaN|\[object Object\]/);
	});
	it('selects context only when the goal does not choose a branch and does not assume missing reports', async () => {
		const i = input(
				'Quero conhecer uma possibilidade em pequena escala.',
				'Tenho interesse em estudar antes de decidir.'
			),
			c = await calculateTrial(i, runId),
			r = composeTrialReading(i, c);
		expect(r.editorial?.context.key).toBe('study');
		expect(r.editorial?.selection[0].factId).toBe('reported-context');
		expect(directionSynthesis([])).toMatchObject({
			missing: [0, 7, 14, 30],
			complete: false,
			comparisonReady: false
		});
	});
	it('rejects a vague goal, changed context, milestone or editorial claim', async () => {
		await expect(calculateTrial(input('Testar.'), runId)).rejects.toThrow();
		const i = input(),
			c = await calculateTrial(i, runId),
			r = composeTrialReading(i, c);
		const changed = structuredClone(c);
		changed.facts[2].display = 'Dia 7: 2026-10-13';
		expect(() => assertDirectionProjection(i, changed)).toThrow();
		expect(() =>
			assertDirectionProjection(input(undefined, 'Outro contexto válido.'), c)
		).toThrow();
		r.sections[0].text += ' Você conquistará uma oportunidade.';
		expect(await approveTrialReading(i, c, r)).toBeNull();
	});
});
describe('Registros e comparação da Jornada', () => {
	it.each([0, 7, 14, 30] as DirectionStep[])(
		'round trips a saved stage %s with its original timestamp',
		(step) => {
			const n = savedNote(step);
			expect(parseDirectionNote(n.text, step)).toEqual(note(step));
			expect(directionSynthesis([n]).stages.find((s) => s.step === step)?.saved?.updated_at).toBe(
				n.updated_at
			);
		}
	);
	it('compares only actual saved answers, preserving contrary evidence and a pause/adjust decision', () => {
		const s = directionSynthesis(([0, 7, 14, 30] as DirectionStep[]).map(savedNote));
		expect(s.complete).toBe(true);
		expect(s.comparisonReady).toBe(true);
		expect(s.missing).toEqual([]);
		expect(s.baseline?.observation).toBe(note(0).observation);
		expect(s.final?.observation).toBe(note(30).observation);
		expect(s.final?.decision).toBe('adjust');
		expect(s.final?.counterevidence).toBe(note(30).counterevidence);
		expect(s.intermediate.map((s) => s.step)).toEqual([7, 14]);
	});
	it('never fabricates missing intermediate stages or transforms old prose into completed forms', () => {
		const s = directionSynthesis([
			savedNote(0),
			savedNote(30),
			{ step: 7, text: 'Não pude realizar.', updated_at: '2026-10-15T12:00:00Z' }
		]);
		expect(s.missing).toEqual([7, 14]);
		expect(s.comparisonReady).toBe(true);
		expect(s.complete).toBe(false);
		expect(s.stages[1].saved?.text).toBe('Não pude realizar.');
	});
	it('rejects forged stages, extra fields, empty/oversized fields, missing final decisions and invalid JSON', () => {
		for (const n of [
			{ ...note(0), step: 1 },
			{ ...note(0), observation: ' ' },
			{ ...note(0), next: 'x'.repeat(601) },
			{ ...note(0), score: 100 },
			{ ...note(0), decision: 'continue' },
			{ ...note(30), decision: 'undecided' }
		])
			expect(parseDirectionNote(JSON.stringify(n), n.step)).toBeNull();
		expect(parseDirectionNote('not-json', 0)).toBeNull();
		expect(parseDirectionNote(JSON.stringify(note(7)), 14)).toBeNull();
	});
});
