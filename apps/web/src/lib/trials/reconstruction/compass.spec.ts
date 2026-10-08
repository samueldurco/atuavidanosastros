import { describe, expect, it } from 'vitest';
import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import { mkdir, writeFile } from 'node:fs/promises';
import { calculateTrial } from '../../server/trial-calculation';
import { executeTrialRuntime } from '../../server/trial-computation';
import { approveTrialReading, composeTrialReading, type SavedTrial } from '../reading';
import { latestReadingVersion } from '../versions';
import {
	assertCompassProjection,
	compassAngularContacts,
	COMPASS_VERSION,
	COMPASS_READING_VERSION,
	type CompassData
} from './compass-facts';
import { compassContext, compassSelection, reviewReconstructedCompass } from './compass';
import { normalizeFactGraph } from './fact-graph';
import { purposeHouseAt } from './purpose-facts';

const runId = '00000000-0000-4000-8000-000000000150';
const input = (
	context = 'Quero comparar a atividade atual com uma alternativa de trabalho.'
): WorkflowInput => ({
	version: 'atv-workflow/1.0.0',
	productId: 'career-compass',
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
describe('Bússola de Carreira 5: fonte íntegra, contexto e hipóteses verificáveis', () => {
	it('preserves the full native source, houses, MC ruler and the finite method', async () => {
		const c = await sample(),
			d = c.data as unknown as CompassData;
		expect(c.version).toBe(COMPASS_VERSION);
		expect(d.positions).toHaveLength(10);
		expect(d.houses.cusps).toHaveLength(12);
		for (const f of d.natal.facts) expect(c.facts).toContainEqual(f);
		expect(d.regent.house).toBe(
			purposeHouseAt(d.positions.find((p) => p.body === d.regent.body)!.longitude, d.houses.cusps)
		);
		expect(d.method.selection).toMatchObject({
			personalWeight: 5,
			rulerWeight: 6,
			themeWeight: 4,
			contextWeight: 8,
			maximumAspects: 3
		});
		expect(d.method.applyingSeparating).toBe(false);
		expect(latestReadingVersion('career-compass')).toBe(COMPASS_READING_VERSION);
		assertCompassProjection(input(), c);
	});
	it('includes exact angular limits and wrap-around without widening the policy', async () => {
		const p = (await sample()).data.positions as CompassData['positions'];
		expect(compassAngularContacts([{ ...p[0], longitude: 2 }], 359)).toHaveLength(1);
		expect(compassAngularContacts([{ ...p[0], longitude: 2.00001 }], 359)).toHaveLength(0);
		expect(compassAngularContacts([{ ...p[0], longitude: 356 }], 359)).toHaveLength(1);
	});
	it('covers every source fact and all five themes in eleven substantial chapters', async () => {
		const c = await sample(),
			r = composeTrialReading(input(), c);
		expect(reviewReconstructedCompass(input(), c, r)).toEqual([]);
		expect(r.sections).toHaveLength(11);
		expect(r.sections.every((s) => s.text.length >= 220)).toBe(true);
		expect(r.editorial!.themes.map((t) => t.id)).toEqual([
			'contribution',
			'motivation',
			'environment',
			'working-style',
			'sustainability'
		]);
		expect(new Set(r.sections.flatMap((s) => s.factIds))).toEqual(
			new Set(c.facts.map((f) => f.id))
		);
		expect(r.questions).toHaveLength(3);
		expect(r.sections.find((s) => s.title.includes('vinte minutos'))!.text).toContain(
			'evidência contrária'
		);
		expect(await approveTrialReading(input(), c, r)).not.toBeNull();
	});
	it('changes priority, selection, opening, questions and experiment for declared workload versus study', async () => {
		const a = input('Estou com sobrecarga e preciso preservar descanso.'),
			b = input('Quero avaliar um curso de formação antes de me inscrever.');
		const ca = await calculateTrial(a, runId),
			cb = await calculateTrial(b, runId),
			ra = composeTrialReading(a, ca),
			rb = composeTrialReading(b, cb);
		expect(ca.data.positions).toEqual(cb.data.positions);
		expect(ca.data.angles).toEqual(cb.data.angles);
		expect(ra.editorial!.plan[2].role).toBe('sustainability');
		expect(rb.editorial!.plan[2].role).toBe('motivation');
		expect(ra.editorial!.selection).not.toEqual(rb.editorial!.selection);
		expect(ra.opening).not.toBe(rb.opening);
		expect(ra.practice).toContain('reduzida');
		expect(rb.practice).toContain('dois exercícios');
		expect(ra.questions[0]).not.toBe(rb.questions[0]);
		expect(ra.sections.find((s) => s.title.startsWith('Seu contexto'))!.text).toContain(a.context);
		expect(rb.sections.find((s) => s.title.startsWith('Seu contexto'))!.text).toContain(b.context);
		expect(compassSelection(normalizeFactGraph(ca)).map((s) => s.aspect.factId)).toEqual(
			ra.editorial!.selection.map((s) => s.factId)
		);
	});
	it('binds explicit team and independent contexts without changing natal geometry', () => {
		expect(compassContext('Preciso organizar a equipe.')).toMatchObject({
			key: 'leadership',
			priority: ['environment', 'contribution']
		});
		expect(compassContext('Quero avaliar um projeto próprio.').task).toContain(
			'sem assumir compromisso financeiro'
		);
		expect(compassContext().key).toBe('general');
	});
	it.each(['positions', 'regent', 'angular', 'method'])(
		'rejects tampered derived %s rather than interpreting altered geometry',
		async (key) => {
			const c = structuredClone(await sample());
			c.data[key] = { altered: true };
			expect(() => composeTrialReading(input(), c)).toThrow('divergente');
		}
	);
	it('rejects a changed birth, context, native source or editorial claim', async () => {
		const c = await sample(),
			i = input(),
			r = composeTrialReading(i, c);
		const changedInput = structuredClone(i);
		changedInput.birth!.longitude = 40;
		expect(() => composeTrialReading(changedInput, c)).toThrow('divergente');
		expect(() => composeTrialReading(input('Outra pergunta.'), c)).toThrow();
		const changed = structuredClone(c);
		(changed.data.natal as CalculationSnapshot).facts[0].display = 'alterado';
		expect(() => composeTrialReading(i, changed)).toThrow();
		const adulterated = structuredClone(r);
		adulterated.opening = 'Você nasceu para uma profissão ideal e terá sucesso.';
		expect(await approveTrialReading(i, c, adulterated)).toBeNull();
	});
	it('preserves unavailable polar houses instead of inventing the ruler house', async () => {
		const i = input();
		i.birth!.latitude = 70;
		const c = await calculateTrial(i, runId),
			d = c.data as unknown as CompassData,
			r = composeTrialReading(i, c);
		expect(d.regent.house).toBeNull();
		expect(d.houses.cusps).toEqual([]);
		expect(r.sections.find((s) => s.title.startsWith('Contribuição'))!.text).toContain(
			'casa do regente está indisponível'
		);
		expect(await approveTrialReading(i, c, r)).not.toBeNull();
	});
	it.each(['1992-04-16T09:30:00', '1985-08-21T17:20:00', '2004-11-03T02:45:00'])(
		'changes the synthesis for independently calculated births: %s',
		async (date) => {
			const i = input();
			i.birth = { ...i.birth!, localDateTime: date, utcInstant: date + 'Z' };
			const c = await calculateTrial(i, runId),
				r = composeTrialReading(i, c),
				baseline = composeTrialReading(input(), await sample());
			expect(r.sections[0].text).not.toBe(baseline.sections[0].text);
			expect(await approveTrialReading(i, c, r)).not.toBeNull();
		}
	);
	it('keeps a distinct scope from Purpose and verifies the saved synthetic edition', async () => {
		const i = input(),
			c = await sample(),
			r = composeTrialReading(i, c),
			approval = await approveTrialReading(i, c, r);
		const pi = { ...i, productId: 'purpose-career' },
			pc = await calculateTrial(pi, runId),
			pr = composeTrialReading(pi, pc);
		expect(r.sections).not.toEqual(pr.sections);
		expect(pr.sections.length).toBeGreaterThan(r.sections.length);
		const saved: SavedTrial = {
			id: runId,
			product_id: i.productId,
			created_at: '2026-10-08T12:00:00Z',
			input: i,
			calculation: c,
			reading: r,
			approval: approval!
		};
		expect(await executeTrialRuntime({ operation: 'verify', saved })).toBe(true);
		await mkdir('.trial-qa', { recursive: true });
		await writeFile('.trial-qa/compass.json', JSON.stringify(saved, null, 2));
	});
});
