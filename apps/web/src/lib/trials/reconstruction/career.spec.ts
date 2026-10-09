import { describe, expect, it } from 'vitest';
import { calculateAspects, type AspectPosition } from '@atv/astrology';
import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import {
	calculateTrial as calculateCurrentTrial,
	calculateTrialAngleContacts,
	trialAspectPolicy
} from '../../server/trial-calculation';
import { executeTrialRuntime } from '../../server/trial-computation';
import { approveTrialReading, composeTrialReading, type TrialReading } from '../reading';
import { composeTrialReading as composeV3 } from '../experience-reading';
import { modernRulers, signs } from './canon';
import { composeReconstructedCareer, reviewReconstructedCareer } from './career';
import { normalizeFactGraph } from './fact-graph';

const runId = '00000000-0000-4000-8000-000000000084';
// Preserve the historical 4.0 calculation contract while new revisions use Compass 5.0.
async function calculateTrial(value: WorkflowInput, id: string): Promise<CalculationSnapshot> {
	const natal = await calculateCurrentTrial({ ...value, productId: 'midheaven' }, id);
	return {
		...natal,
		version: 'atv-private-career-synthesis/4.0.0',
		kind: 'purpose',
		data: { ...natal.data, productId: 'career-compass' }
	};
}
const input = (
	context = 'Estou comparando a função atual com uma mudança de área.'
): WorkflowInput => ({
	version: 'atv-workflow/1.0.0',
	productId: 'career-compass',
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
const narrative = (reading: TrialReading) =>
	reading.sections
		.filter((s) => !/^Referências/.test(s.title))
		.map((s) => s.text)
		.join('\n');

describe('reconstructed career: semantic dependence and durable editions', () => {
	it('binds a multi-factor synthesis and independently passes the quality review', async () => {
		const value = input(),
			calculation = await calculateTrial(value, runId);
		const reading = composeTrialReading(value, calculation),
			graph = normalizeFactGraph(calculation);
		expect(reading.version).toBe('atv-product-reconstruction/4.0.0');
		expect(graph.positions).toHaveLength(10);
		expect(graph.houses).toHaveLength(12);
		expect(graph.mc?.ruler).toBe(modernRulers[graph.mc!.sign]);
		expect(reading.sections[0].factIds).toEqual(
			expect.arrayContaining(['angle-midheaven', 'career-mc-ruler', 'position-sun'])
		);
		expect(reviewReconstructedCareer(value, calculation, reading)).toEqual([]);
		expect(await approveTrialReading(value, calculation, reading)).not.toBeNull();
		expect(Object.isFrozen(graph.positions[0])).toBe(true);
	});
	it('changes the actual decision and experiment when only reported context changes', async () => {
		const a = input('Estou comparando minha função atual com uma mudança de área.');
		const b = input('Quero estudar e avaliar um curso de formação.');
		const ca = await calculateTrial(a, runId),
			cb = await calculateTrial(b, runId);
		const ra = composeTrialReading(a, ca),
			rb = composeTrialReading(b, cb);
		expect(ca.data.positions).toEqual(cb.data.positions);
		expect(ra.sections[0]).toEqual(rb.sections[0]);
		expect(ra.editorial?.context.key).toBe('transition');
		expect(rb.editorial?.context.key).toBe('study');
		expect(ra.practice).not.toBe(rb.practice);
		expect(narrative(ra)).not.toContain(a.context); // no substitution of the input for interpretation
		expect(narrative(rb)).toContain('formação');
		expect(ra.questions[0]).not.toBe(rb.questions[0]);
	});
	it('counterfactual Sun changes the integrated conclusion, beyond names and references', async () => {
		const value = input(),
			original = await calculateTrial(value, runId),
			changed = structuredClone(original);
		const positions = changed.data.positions as {
			body: AspectPosition['body'];
			longitude: number;
		}[];
		const sun = positions.find((p) => p.body === 'sun')!;
		sun.longitude = (sun.longitude + 120) % 360;
		changed.facts.find((f) => f.id === 'position-sun')!.display =
			`Sol: ${(sun.longitude % 30).toFixed(6)}° de ${signs[Math.floor(sun.longitude / 30)]}`;
		const aspects = calculateAspects(positions, trialAspectPolicy);
		changed.data.privateAspects = aspects;
		const contacts = calculateTrialAngleContacts(
			positions,
			changed.data.angles as { ascendant: number; midheaven: number }
		);
		changed.data.angleContacts = contacts;
		changed.facts = changed.facts.filter((f) => !f.id.startsWith('private-angle-contact-'));
		changed.facts.push(
			...contacts.map((a, i) => ({
				id: `private-angle-contact-${i}`,
				kind: 'calculated' as const,
				display: `${a.body} / ${a.angle}: ${a.kind}; ${a.orb}°`,
				source: 'counterfactual-recalculated-geometry'
			}))
		);
		changed.facts = changed.facts.filter((f) => !f.id.startsWith('private-natal-aspect-'));
		changed.facts.push(
			...aspects.aspects.map((a, i) => ({
				id: `private-natal-aspect-${i}`,
				kind: 'calculated' as const,
				display: `${a.first} / ${a.second}: ${a.kind}; ${a.orbDegrees}°`,
				source: 'counterfactual-recalculated-geometry'
			}))
		);
		const before = composeReconstructedCareer(value, original),
			after = composeReconstructedCareer(value, changed);
		expect(before.opening).not.toBe(after.opening);
		expect(before.sections[0].text).not.toBe(after.sections[0].text);
		expect(before.sections.find((s) => s.title === 'Entre compreender e agir')).toEqual(
			after.sections.find((s) => s.title === 'Entre compreender e agir')
		);
	});
	it('rejects altered aspect geometry, an altered MC fact and unsupported house cusps', async () => {
		const calculation = await calculateTrial(input(), runId);
		const aspect = structuredClone(calculation);
		(aspect.data.privateAspects as { aspects: { orbDegrees: number }[] }).aspects[0].orbDegrees +=
			0.1;
		expect(() => normalizeFactGraph(aspect)).toThrow('Aspecto e geometria discordam');
		const mc = structuredClone(calculation);
		mc.facts.find((f) => f.id === 'angle-midheaven')!.display = 'Meio do Céu: 0.000000° de Áries';
		expect(() => normalizeFactGraph(mc)).toThrow('Fato e posição discordam');
		const houses = structuredClone(calculation);
		houses.facts = houses.facts.filter((f) => f.id !== 'house-2');
		expect(() => normalizeFactGraph(houses)).toThrow('Casas sem fatos correspondentes');
	});
	it('ablation removes aspect interpretation and never invents absent houses', async () => {
		const value = input(),
			original = await calculateTrial(value, runId),
			changed = structuredClone(original);
		changed.data.privateAspects = { aspects: [] };
		changed.facts = changed.facts.filter((f) => !f.id.startsWith('private-natal-aspect-'));
		changed.data.houses = { status: 'not-applicable', cusps: [] };
		changed.facts = changed.facts.filter((f) => !f.id.startsWith('house-'));
		const after = composeReconstructedCareer(value, changed);
		expect(after.editorial?.selection).toEqual([]);
		expect(after.sections.some((s) => s.title === 'Uma tensão ou recurso que muda a leitura')).toBe(
			false
		);
		expect(normalizeFactGraph(changed).positions.every((p) => p.house === null)).toBe(true);
		const deep = composeReconstructedCareer({ ...value, productId: 'purpose-career' }, changed);
		expect(deep.sections.some((s) => /^Casa \d/.test(s.title))).toBe(false);
	});
	it('the deeper contract adds house rulers and selected interactions, rather than renaming the compass', async () => {
		const value = input(),
			calculation = await calculateTrial(value, runId);
		const brief = composeTrialReading(value, calculation);
		const deep = composeTrialReading({ ...value, productId: 'purpose-career' }, calculation);
		expect(deep.sections.filter((s) => /^Casa [261]0?:/.test(s.title))).toHaveLength(3);
		expect(narrative(deep).length).toBeGreaterThan(narrative(brief).length + 1000);
		expect(
			await approveTrialReading({ ...value, productId: 'purpose-career' }, calculation, deep)
		).not.toBeNull();
	});
	it('quality review rejects unbound chapters, duplicated prose and deterministic career claims', async () => {
		const value = input(),
			calculation = await calculateTrial(value, runId),
			good = composeTrialReading(value, calculation);
		const unbound = structuredClone(good);
		unbound.sections[0].factIds = [];
		expect(reviewReconstructedCareer(value, calculation, unbound)).toContain(
			'synthesis-missing-independent-factors'
		);
		const duplicated = structuredClone(good);
		duplicated.sections[1].text = duplicated.sections[0].text;
		expect(reviewReconstructedCareer(value, calculation, duplicated)).toContain(
			'repeated-long-sentence'
		);
		const deterministic = structuredClone(good);
		deterministic.opening = 'Você nasceu para essa profissão ideal.';
		expect(reviewReconstructedCareer(value, calculation, deterministic)).toContain(
			'voice-or-unsupported-claim'
		);
		expect(await approveTrialReading(value, calculation, deterministic)).toBeNull();
	});
	it('rejects disagreement between calculator geometry and the associated fact', async () => {
		const calculation = await calculateTrial(input(), runId);
		calculation.facts.find((f) => f.id === 'position-sun')!.display = 'Sol: 12° de Gêmeos';
		expect(() => normalizeFactGraph(calculation)).toThrow('Fato e posição discordam');
	});
	it('keeps old editions reproducible and upgrades calculations only for an explicit new revision', async () => {
		const value = input(),
			calculation = await calculateTrial(value, runId);
		calculation.version = 'atv-private-career-synthesis/3.0.0';
		(calculation.data.career as Record<string, unknown>).version = '3.0.0';
		const reading = composeV3(value, calculation),
			approval = await approveTrialReading(value, calculation, reading);
		expect(approval).not.toBeNull();
		const saved = { input: value, calculation, reading, approval: approval! };
		expect(await executeTrialRuntime({ operation: 'verify', saved })).toBe(true);
		const revised = await executeTrialRuntime({ operation: 'revise', saved });
		expect(revised && typeof revised === 'object' && revised.reading.version).toBe(
			'atv-career-compass-editorial/5.0.0'
		);
		expect(saved.reading.version).toBe('atv-ai-editorial-trials/3.0.0');
		expect(saved.calculation.version).toBe('atv-private-career-synthesis/3.0.0');
	});
	it.each(['1992-04-16T09:30:00', '1985-08-21T17:20:00', '2004-11-03T02:45:00'])(
		'reviews distinct actual calculator charts: %s',
		async (date) => {
			const value = input('Preciso organizar a rotina e a carga de trabalho.');
			value.birth = { ...value.birth!, localDateTime: date, utcInstant: date + 'Z' };
			const calculation: CalculationSnapshot = await calculateTrial(value, runId),
				reading = composeTrialReading(value, calculation);
			expect(reviewReconstructedCareer(value, calculation, reading)).toEqual([]);
			expect(await approveTrialReading(value, calculation, reading)).not.toBeNull();
		}
	);
});
