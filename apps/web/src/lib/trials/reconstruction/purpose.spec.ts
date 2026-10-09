import { describe, expect, it } from 'vitest';
import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import { calculateTrial } from '../../server/trial-calculation';
import { approveTrialReading, composeTrialReading, type SavedTrial } from '../reading';
import {
	PURPOSE_VERSION,
	assertPurposeProjection,
	purposeAngularContacts,
	purposeHouseAt,
	type PurposeData
} from './purpose-facts';
import { reviewReconstructedPurpose } from './purpose';
import { buildChartScene } from '../chart-engine-v2';
import { trialText } from '../exports';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const runId = '00000000-0000-4000-8000-000000000120';
const input = (
	context = 'Quero mudar de trabalho sem perder a estabilidade atual.'
): WorkflowInput => ({
	version: 'atv-workflow/1.0.0',
	productId: 'purpose-career',
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
		calculation = await sample(),
		reading = composeTrialReading(i, calculation),
		approval = await approveTrialReading(i, calculation, reading);
	expect(reviewReconstructedPurpose(i, calculation, reading)).toEqual([]);
	expect(approval).not.toBeNull();
	return {
		id: runId,
		product_id: i.productId,
		created_at: '2026-10-08T12:00:00Z',
		input: i,
		calculation,
		reading,
		approval: approval!
	};
};
describe('Propósito & Carreira reconstruído', () => {
	it('preserves the native birth source, all houses and the MC ruler house with a distinct method', async () => {
		const c = await sample(),
			d = c.data as unknown as PurposeData;
		expect(c.version).toBe(PURPOSE_VERSION);
		expect(d.natal.version).not.toBe(PURPOSE_VERSION);
		expect(d.houses.cusps).toHaveLength(12);
		expect(d.regent.house).toBe(
			purposeHouseAt(d.positions.find((p) => p.body === d.regent.body)!.longitude, d.houses.cusps)
		);
		expect(d.method.angularOrb).toBe(3);
		expect(d.method.houseMembership).toBe('cyclic-half-open-start-inclusive');
		assertPurposeProjection(input(), c);
		const compass = await calculateTrial({ ...input(), productId: 'career-compass' }, runId);
		expect(composeTrialReading(input(), c).sections).not.toEqual(
			composeTrialReading({ ...input(), productId: 'career-compass' }, compass).sections
		);
	});
	it('assigns exact cusps to their starting houses across zero and preserves unavailable houses', () => {
		const cusps = Array.from({ length: 12 }, (_, i) => (350 + i * 30) % 360);
		expect(purposeHouseAt(350, cusps)).toBe(1);
		expect(purposeHouseAt(0, cusps)).toBe(1);
		expect(purposeHouseAt(20, cusps)).toBe(2);
		expect(purposeHouseAt(349.999, cusps)).toBe(12);
		expect(purposeHouseAt(10, [])).toBeNull();
	});
	it('uses only conjunction proximity to all four axes, inclusive at 3°, including zero wrap', () => {
		const axes = { midheaven: 90, ascendant: 359 };
		expect(
			purposeAngularContacts(
				[
					{ body: 'sun', longitude: 2 },
					{ body: 'moon', longitude: 179 },
					{ body: 'mars', longitude: 270 },
					{ body: 'saturn', longitude: 93.001 }
				],
				axes
			).map((a) => [a.body, a.angle, a.orb])
		).toEqual([
			['sun', 'ASC', 3],
			['moon', 'DSC', 0],
			['mars', 'IC', 0]
		]);
		expect(
			purposeAngularContacts([{ body: 'sun', longitude: 359 }], { midheaven: 90, ascendant: null })
		).toEqual([]);
	});
	it.each([
		['Quero mudar de área com uma transição gradual.', 'transition'],
		['Coordeno uma equipe e preciso rever responsabilidades.', 'leadership'],
		['Quero escolher um curso e estudar uma habilidade.', 'study'],
		['Quero trabalhar como autônomo com os recursos disponíveis.', 'independent'],
		['Sinto sobrecarga e cansaço com o trabalho.', 'workload'],
		['Quero entender minha contribuição atual.', 'general']
	])('changes the practical criteria for %s without changing geometry', async (text, key) => {
		const i = input(text),
			c = await calculateTrial(i, runId),
			r = composeTrialReading(i, c);
		expect(c.data.positions).toEqual((await sample()).data.positions);
		expect(r.editorial!.context.key).toBe(key);
		expect(
			r.sections.some((s) => s.text.includes(text) && s.factIds.includes('personal-context'))
		).toBe(true);
		expect(reviewReconstructedPurpose(i, c, r)).toEqual([]);
		expect(await approveTrialReading(i, c, r)).not.toBeNull();
	});
	it('keeps high-latitude house and ASC absence explicit while retaining the independently calculated MC', async () => {
		const i = input();
		i.birth!.latitude = 70;
		const c = await calculateTrial(i, runId),
			r = composeTrialReading(i, c),
			d = c.data as unknown as PurposeData;
		expect(d.houses.cusps).toEqual([]);
		expect(d.regent.house).toBeNull();
		expect(d.angles.ascendant).toBeNull();
		expect(d.angular.every((a) => ['MC', 'IC'].includes(a.angle))).toBe(true);
		expect(
			r.sections.filter((s) => s.text.includes('Não atribuímos signo, regente ou planetas'))
		).toHaveLength(3);
		expect(await approveTrialReading(i, c, r)).not.toBeNull();
	});
	it('rejects tampering in method, ruler, source, geometry, aspect, context and birth binding', async () => {
		const c = await sample();
		for (const mutate of [
			(x: CalculationSnapshot) => {
				(x.data.method as { angularOrb: number }).angularOrb = 5;
			},
			(x: CalculationSnapshot) => {
				(x.data.regent as { house: number }).house = 12;
			},
			(x: CalculationSnapshot) => {
				(x.data.positions as { longitude: number }[])[0].longitude += 1;
			},
			(x: CalculationSnapshot) => {
				x.facts[0].display += ' adulterado';
			},
			(x: CalculationSnapshot) => {
				(x.data.birth as { longitude: number }).longitude = 10;
			},
			(x: CalculationSnapshot) => {
				(x.data.privateAspects as { aspects: { orbDegrees: number }[] }).aspects[0].orbDegrees +=
					0.01;
			},
			(x: CalculationSnapshot) => {
				(
					(x.data.natal as CalculationSnapshot).data.provenance as { providerVersion: string }
				).providerVersion = 'invented';
			}
		]) {
			const x = structuredClone(c);
			mutate(x);
			expect(() => assertPurposeProjection(input(), x)).toThrow();
		}
		const changed = input('Outro contexto');
		expect(() => assertPurposeProjection(changed, c)).toThrow();
		const moved = input();
		moved.birth!.longitude = 20;
		expect(() => assertPurposeProjection(moved, c)).toThrow();
	});
	it('rejects rewritten claims, an altered plan and fabricated references', async () => {
		const s = await saved();
		for (const mutate of [
			(r: typeof s.reading) => {
				r.sections[0].text += ' Você vai enriquecer.';
			},
			(r: typeof s.reading) => {
				r.sections[1].factIds.push('invented');
			},
			(r: typeof s.reading) => {
				r.editorial!.plan[0].role = 'invented';
			}
		]) {
			const r = structuredClone(s.reading);
			mutate(r);
			expect(await approveTrialReading(s.input, s.calculation, r)).toBeNull();
		}
	});
	it('binds every selected aspect and chapter, covers every fact, and includes conditions and counterexamples', async () => {
		const s = await saved(),
			r = s.reading,
			ids = new Set(r.sections.flatMap((s) => s.factIds));
		expect(s.calculation.facts.every((f) => ids.has(f.id))).toBe(true);
		expect(r.editorial!.selection.length).toBeGreaterThan(0);
		expect(
			r.editorial!.selection.every((a) => r.sections.some((s) => s.factIds.includes(a.factId)))
		).toBe(true);
		expect(r.sections.find((s) => s.title === 'Condições que o mapa não mede')!.text).toMatch(
			/Formação, território, classe social, saúde/
		);
		expect(r.sections.some((s) => s.text.includes('evidência contrária'))).toBe(true);
		expect(JSON.stringify(r)).not.toMatch(/undefined|\[object Object\]|\bNaN\b/);
		expect(buildChartScene(s).markers).toHaveLength(10);
		expect(JSON.stringify(s).length).toBeLessThan(200000);
	});
	it('exports the same complete reading and real natal mandala as a recoverable book', async () => {
		const s = await saved(),
			{ trialPdf } = await import('../pdf'),
			{ PDFDocument } = await import('pdf-lib'),
			pdf = await trialPdf(s),
			doc = await PDFDocument.load(pdf);
		expect(doc.getPageCount()).toBeGreaterThan(10);
		expect(s.calculation.facts.every((f) => trialText(s).includes(f.display))).toBe(true);
		const dir = process.env.ATV_RECONSTRUCTION_QA_DIR;
		if (dir) {
			await mkdir(dir, { recursive: true });
			await writeFile(join(dir, 'purpose-career.pdf'), pdf);
			await writeFile(join(dir, 'purpose-career.json'), JSON.stringify(s, null, 2));
			await writeFile(
				join(dir, 'purpose-career-review.txt'),
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
