import { calculateHistoricalNatalV4 } from './historical-v4.test-helper';
import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import { calculateTrial } from '../../server/trial-calculation';
import { executeTrialRuntime } from '../../server/trial-computation';
import { approveTrialReading, composeTrialReading, type SavedTrial } from '../reading';
import { trialText } from '../exports';
import { latestReadingVersion } from '../versions';
import { normalizeFactGraph } from './fact-graph';
import { birthContext, birthSignatures, reviewReconstructedBirth } from './birth';
import {
	assertBirthProjection,
	birthAngularContacts,
	BIRTH_VERSION,
	BIRTH_READING_VERSION,
	type BirthData
} from './birth-facts';
import { purposeHouseAt } from './purpose-facts';

const runId = '00000000-0000-4000-8000-000000000170';
const input = (context = 'Quero estudar e explicar melhor o que aprendo.'): WorkflowInput => ({
	version: 'atv-workflow/1.0.0',
	productId: 'birth-chart',
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
let cached: CalculationSnapshot;
const sample = async () => (cached ??= await calculateTrial(input(), runId));
const saved = async (): Promise<SavedTrial> => {
	const i = input(),
		c = await sample(),
		r = composeTrialReading(i, c),
		approval = await approveTrialReading(i, c, r);
	expect(approval).not.toBeNull();
	return {
		id: runId,
		product_id: i.productId,
		created_at: '2026-10-08T12:00:00Z',
		input: i,
		calculation: c,
		reading: r,
		approval: approval!
	};
};
describe('Mapa Astral 5: seis assinaturas, temas e síntese', () => {
	it('preserves the complete native source and computes each axis and house ruler from geometry', async () => {
		const c = await sample(),
			d = c.data as unknown as BirthData,
			g = normalizeFactGraph(c);
		expect(c.version).toBe(BIRTH_VERSION);
		expect(latestReadingVersion('birth-chart')).toBe(BIRTH_READING_VERSION);
		expect(g.positions).toHaveLength(10);
		expect(g.houses).toHaveLength(12);
		expect(d.houseRegents).toHaveLength(12);
		for (const f of d.natal.facts) expect(c.facts).toContainEqual(f);
		for (const r of [...d.regents, ...d.houseRegents]) {
			const actual = purposeHouseAt(
				d.positions.find((p) => p.body === r.body)!.longitude,
				d.houses.cusps
			);
			expect('rulerHouse' in r ? r.rulerHouse : r.house).toBe(actual);
		}
		expect(d.method.applyingSeparating).toBe(false);
		assertBirthProjection(input(), c);
	});
	it('keeps wraparound contacts at three degrees and excludes values outside the declared orb', async () => {
		const p = (await sample()).data.positions as BirthData['positions'];
		const contacts = birthAngularContacts([{ ...p[0], longitude: 2 }], {
			ascendant: 359,
			midheaven: 92
		});
		expect(contacts).toEqual(
			expect.arrayContaining([
				{ body: p[0].body, angle: 'ascendant', kind: 'conjunction', orb: 3 },
				{ body: p[0].body, angle: 'midheaven', kind: 'square', orb: 0 }
			])
		);
		expect(
			birthAngularContacts([{ ...p[0], longitude: 2.001 }], { ascendant: 359, midheaven: 92 }).some(
				(a) => a.angle === 'ascendant' && a.kind === 'conjunction'
			)
		).toBe(false);
	});
	it('selects six integrated signatures with three stable core relations and three distinct resources', async () => {
		const g = normalizeFactGraph(await sample()),
			s = birthSignatures(g, 'study');
		expect(s).toHaveLength(6);
		expect(s.slice(0, 3).map((x) => x.id)).toEqual(['sun-moon', 'asc-ruler', 'mc-ruler']);
		expect(new Set(s.slice(3).map((x) => x.body)).size).toBe(3);
		for (const signature of s) {
			expect(signature.factIds.length).toBeGreaterThan(1);
			expect(signature.factIds.every((id) => g.facts.some((f) => f.id === id))).toBe(true);
		}
		for (const signature of s.filter((x) => x.aspect))
			expect(signature.aspect!.orb).toBeLessThanOrEqual(3);
		expect(s).toEqual(birthSignatures(g, 'study'));
	});
	it('adapts priorities to consented context without changing astronomical data', async () => {
		const first = await sample(),
			i = input('Estou com sobrecarga e preciso preservar descanso.'),
			second = await calculateTrial(i, runId);
		for (const key of [
			'positions',
			'angles',
			'houses',
			'privateAspects',
			'angleContacts',
			'regents',
			'houseRegents'
		])
			expect(first.data[key]).toEqual(second.data[key]);
		expect(birthContext(i.context).key).toBe('workload');
		expect(
			birthSignatures(normalizeFactGraph(first), 'study')
				.slice(3)
				.map((s) => s.body)
		).not.toEqual(
			birthSignatures(normalizeFactGraph(second), 'workload')
				.slice(3)
				.map((s) => s.body)
		);
		const r = composeTrialReading(i, second);
		expect(
			r.sections.find((s) => s.title === 'A leitura encontra o tema que você trouxe')?.text
		).toContain(i.context);
		expect(await approveTrialReading(i, second, r)).not.toBeNull();
	});
	it('covers every native position and cusp through life themes and a whole-chart synthesis', async () => {
		const c = await sample(),
			r = composeTrialReading(input(), c),
			g = normalizeFactGraph(c),
			narrative = r.sections.filter((s) => s.title !== 'Posições, casas e método para conferência');
		expect(r.sections).toHaveLength(15);
		expect(r.editorial?.patterns).toHaveLength(6);
		expect(r.questions).toHaveLength(3);
		for (const f of [...g.positions, ...g.houses])
			expect(narrative.some((s) => s.factIds.includes(f.factId))).toBe(true);
		expect(
			r.sections.find((s) => s.title === 'Uma síntese que cabe numa situação real')?.factIds.length
		).toBeGreaterThan(5);
		expect(reviewReconstructedBirth(input(), c, r)).toEqual([]);
	});
	it.each(['repeat', 'opening', 'claim', 'signature', 'context'] as const)(
		'rejects a broken editorial candidate: %s',
		async (kind) => {
			const c = await sample(),
				r = structuredClone(composeTrialReading(input(), c));
			if (kind === 'repeat')
				r.sections[2].text +=
					' ' + r.sections[1].text.split(/(?<=[.!?])\s+/).find((s) => s.length > 100);
			if (kind === 'opening') r.sections[2].text = r.sections[1].text;
			if (kind === 'claim') r.sections[3].text += ' Você nasceu para liderar.';
			if (kind === 'signature') r.editorial!.patterns.pop();
			if (kind === 'context')
				r.sections[12].text = 'Uma explicação sem o contexto declarado. '.repeat(10);
			expect(reviewReconstructedBirth(input(), c, r).length).toBeGreaterThan(0);
			expect(await approveTrialReading(input(), c, r)).toBeNull();
		}
	);
	it('rejects a changed source, birth instant, private aspect or house ruler', async () => {
		const c = await sample();
		for (const change of ['source', 'aspect', 'ruler'] as const) {
			const copy = structuredClone(c),
				d = copy.data as unknown as BirthData;
			if (change === 'source') d.natal.facts[0].display += ' adulterado';
			if (change === 'aspect')
				(copy.data.privateAspects as { aspects: { orbDegrees: number }[] }).aspects[0].orbDegrees +=
					0.1;
			if (change === 'ruler') d.houseRegents[0].body = 'moon';
			expect(() => assertBirthProjection(input(), copy)).toThrow();
		}
		const different = input();
		different.birth!.utcInstant = '2000-01-01T13:00:00Z';
		expect(() => assertBirthProjection(different, c)).toThrow();
	});
	it('does not fabricate complete houses for a polar birth', async () => {
		const i = input();
		i.birth!.latitude = 80;
		await expect(calculateTrial(i, runId)).rejects.toThrow();
	});
	it.each(['1991-07-15T08:30:00Z', '1984-03-22T22:10:00Z'])(
		'reads another birth in full without repeated sentences: %s',
		async (utc) => {
			const i = input('Quero compreender meus vínculos e acordos.');
			i.birth = {
				...i.birth!,
				localDateTime: utc.slice(0, 19),
				utcInstant: utc,
				latitude: -23.55,
				longitude: -46.63
			};
			const c = await calculateTrial(i, runId),
				r = composeTrialReading(i, c);
			expect(reviewReconstructedBirth(i, c, r)).toEqual([]);
			expect(await approveTrialReading(i, c, r)).not.toBeNull();
			expect(r.sections[1].text).not.toEqual(
				composeTrialReading(input(), await sample()).sections[1].text
			);
		}
	);
	it('preserves the historical fourth edition and verifies a saved current reading', async () => {
		const i = input(),
			old = await calculateHistoricalNatalV4({ ...i, productId: 'midheaven' }, runId);
		old.data.productId = 'birth-chart';
		const previous = composeTrialReading(i, old);
		expect(previous.version).toBe('atv-product-reconstruction/4.0.0');
		expect(previous.sections).not.toEqual(composeTrialReading(i, await sample()).sections);
		const s = await saved();
		expect(await executeTrialRuntime({ operation: 'verify', saved: s })).toBe(true);
	});
	it('exports the complete reading and all factual references in a recoverable PDF and text', async () => {
		const s = await saved(),
			{ trialPdf } = await import('../pdf'),
			{ PDFDocument } = await import('pdf-lib'),
			pdf = await trialPdf(s),
			doc = await PDFDocument.load(pdf);
		expect(doc.getPageCount()).toBeGreaterThan(10);
		for (const f of s.calculation.facts) expect(trialText(s)).toContain(f.display);
		const dir = 'E:/ATVNA/tmp/reconstruction-qa/birth';
		await mkdir(dir, { recursive: true });
		await writeFile(`${dir}/birth-chart.pdf`, pdf);
		await writeFile(`${dir}/birth-chart.json`, JSON.stringify(s, null, 2));
		await writeFile(
			`${dir}/birth-chart-review.txt`,
			[
				s.reading.opening,
				...s.reading.sections.map((x) => x.title + '\n' + x.text),
				s.reading.practice,
				...s.reading.limits
			].join('\n\n')
		);
	}, 30000);
});
