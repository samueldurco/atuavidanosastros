import { describe, expect, it } from 'vitest';
import type { WorkflowInput } from '@atv/domain';
import { calculateTrial, calculateTrialAngleContacts } from '../../server/trial-calculation';
import { approveTrialReading, composeTrialReading, type SavedTrial } from '../reading';
import { buildChartScene } from '../chart-engine-v2';
import { normalizeFactGraph } from './fact-graph';
import { reviewReconstructedNatal } from './natal';

const runId = '00000000-0000-4000-8000-000000000084';
const duplicates = (reading: ReturnType<typeof composeTrialReading>) => {
	const sentences = reading.sections
		.filter((s) => !/^Referências/.test(s.title))
		.flatMap((s) =>
			s.text
				.split(/(?<=[.!?])\s+/)
				.map((s) => s.trim())
				.filter((s) => s.length > 100)
		);
	return sentences.filter((s, i) => sentences.indexOf(s) !== i).join('\n');
};
const input = (
	productId = 'birth-chart',
	context = 'Quero compreender meus acordos no relacionamento.'
): WorkflowInput => ({
	version: 'atv-workflow/1.0.0',
	productId,
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
	},
	context
});
describe('integrated natal editions', () => {
	for (const productId of ['birth-chart', 'ascendant', 'midheaven']) {
		it(`${productId} binds its own plan, genuine geometry and complete reading`, async () => {
			const value = input(productId),
				calculation = await calculateTrial(value, runId),
				reading = composeTrialReading(value, calculation);
			expect(calculation.version).toBe('atv-private-natal-synthesis/4.0.0');
			expect(normalizeFactGraph(calculation).positions).toHaveLength(10);
			expect(reviewReconstructedNatal(value, calculation, reading), duplicates(reading)).toEqual(
				[]
			);
			const approval = await approveTrialReading(value, calculation, reading);
			expect(approval).not.toBeNull();
			expect(reading.sections[0].factIds).toContain(
				productId === 'midheaven' ? 'angle-midheaven' : 'angle-ascendant'
			);
			const saved = {
				id: runId,
				product_id: productId,
				created_at: '2026-10-08T12:00:00Z',
				input: value,
				calculation,
				reading,
				approval: approval!
			} satisfies SavedTrial;
			expect(buildChartScene(saved).markers).toHaveLength(10);
		});
	}
	it('context changes chapter priority, observation and experiment without changing geometry', async () => {
		const a = input('birth-chart'),
			b = input('birth-chart', 'Quero escolher uma formação e estudar com continuidade.');
		const ca = await calculateTrial(a, runId),
			cb = await calculateTrial(b, runId);
		const ra = composeTrialReading(a, ca),
			rb = composeTrialReading(b, cb);
		expect(ca.data.positions).toEqual(cb.data.positions);
		expect(ra.opening).toBe(rb.opening);
		expect(ra.editorial?.context.key).toBe('relationships');
		expect(rb.editorial?.context.key).toBe('study');
		expect(ra.sections.map((s) => s.title)).not.toEqual(rb.sections.map((s) => s.title));
		expect(ra.practice).not.toBe(rb.practice);
		expect(ra.sections.find((s) => /Uma situação/.test(s.title))?.text).not.toBe(
			rb.sections.find((s) => /Uma situação/.test(s.title))?.text
		);
	});
	it('a different real natal chart changes the integrated conclusion and selected dynamics', async () => {
		const a = input(),
			b = input();
		b.birth = {
			...b.birth!,
			localDateTime: '1986-07-19T04:30:00',
			utcInstant: '1986-07-19T04:30:00Z',
			latitude: -23.55,
			longitude: -46.63
		};
		const ca = await calculateTrial(a, runId),
			cb = await calculateTrial(b, runId);
		const ra = composeTrialReading(a, ca),
			rb = composeTrialReading(b, cb);
		expect(ra.opening).not.toBe(rb.opening);
		expect(ra.sections[0].text).not.toBe(rb.sections[0].text);
		expect(ra.editorial?.selection).not.toEqual(rb.editorial?.selection);
		expect(reviewReconstructedNatal(b, cb, rb), duplicates(rb)).toEqual([]);
	});
	it('does not approve unsupported luminary ablation or an invented angular contact', async () => {
		const value = input(),
			calculation = await calculateTrial(value, runId);
		const missing = structuredClone(calculation);
		missing.facts = missing.facts.filter((f) => f.id !== 'position-moon');
		expect(() => composeTrialReading(value, missing)).toThrow();
		const tampered = structuredClone(calculation);
		(tampered.data.angleContacts as { orb: number }[])[0].orb += 0.1;
		expect(() => normalizeFactGraph(tampered)).toThrow('Contato angular e geometria discordam');
		const reading = composeTrialReading(value, calculation);
		reading.sections[0].text = reading.sections[1].text;
		expect(reviewReconstructedNatal(value, calculation, reading)).toContain(
			'repeated-long-sentence'
		);
		expect(await approveTrialReading(value, calculation, reading)).toBeNull();
		const repeatedExercise = composeTrialReading(value, calculation);
		repeatedExercise.practice = repeatedExercise.sections[0].text;
		expect(reviewReconstructedNatal(value, calculation, repeatedExercise)).toContain(
			'repeated-long-sentence'
		);
	});
	it('null angles never generate geometric contacts', () => {
		expect(
			calculateTrialAngleContacts([{ body: 'sun', longitude: 0 }], {
				ascendant: null,
				midheaven: null
			})
		).toEqual([]);
	});
});
