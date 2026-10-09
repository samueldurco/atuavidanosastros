import { calculateHistoricalNatalV4 } from './historical-v4.test-helper';
import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import { calculateTrial } from '../../server/trial-calculation';
import { executeTrialRuntime } from '../../server/trial-computation';
import { approveTrialReading, composeTrialReading, type SavedTrial } from '../reading';
import { latestReadingVersion } from '../versions';
import { normalizeFactGraph } from './fact-graph';
import { pillarsContext, pillarsSelection, reviewReconstructedPillars } from './pillars';
import {
	assertPillarsProjection,
	pillarsAngularContacts,
	PILLARS_READING_VERSION,
	PILLARS_VERSION,
	type PillarsData
} from './pillars-facts';
import { purposeHouseAt } from './purpose-facts';

const runId = '00000000-0000-4000-8000-000000000160';
const input = (
	context = 'Quero observar como inicio uma conversa e apresento minhas necessidades.'
): WorkflowInput => ({
	version: 'atv-workflow/1.0.0',
	productId: 'three-pillars',
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
describe('Três Pilares 5: integração, fonte e contrapontos', () => {
	it('preserves ten native bodies and exact ruler, house and finite aspect policies', async () => {
		const c = await sample(),
			d = c.data as unknown as PillarsData;
		expect(c.version).toBe(PILLARS_VERSION);
		expect(d.positions).toHaveLength(10);
		expect(d.houses.cusps).toHaveLength(12);
		for (const f of d.natal.facts) expect(c.facts).toContainEqual(f);
		expect(d.regent.house).toBe(
			purposeHouseAt(d.positions.find((p) => p.body === d.regent.body)!.longitude, d.houses.cusps)
		);
		expect(d.method.angularOrb).toBe(3);
		expect(d.method.applyingSeparating).toBe(false);
		expect(latestReadingVersion('three-pillars')).toBe(PILLARS_READING_VERSION);
		assertPillarsProjection(input(), c);
	});
	it('distinguishes exact conjunction proximity from other major angle contacts at the boundary', async () => {
		const p = (await sample()).data.positions as PillarsData['positions'];
		expect(pillarsAngularContacts([{ ...p[0], longitude: 2 }], 359)).toMatchObject([
			{ kind: 'conjunction', orb: 3 }
		]);
		expect(pillarsAngularContacts([{ ...p[0], longitude: 2.00001 }], 359)).toEqual([]);
		expect(pillarsAngularContacts([{ ...p[0], longitude: 92 }], 359)).toMatchObject([
			{ kind: 'square', orb: 3 }
		]);
		expect(pillarsAngularContacts([{ ...p[0], longitude: 92.00001 }], 359)).toEqual([]);
	});
	it('integrates the trio in eleven chapters with full fact coverage and distinct symbolic versus geometric links', async () => {
		const c = await sample(),
			r = composeTrialReading(input(), c);
		expect(reviewReconstructedPillars(input(), c, r)).toEqual([]);
		expect(r.sections).toHaveLength(11);
		expect(r.sections.every((s) => s.text.length >= 220)).toBe(true);
		for (const role of ['integrated-trio', 'trio-rhythm', 'sun-moon', 'asc-ruler', 'modifiers'])
			expect(r.editorial!.plan.some((p) => p.role === role)).toBe(true);
		for (const id of ['position-sun', 'position-moon', 'angle-ascendant'])
			expect(r.sections[0].factIds).toContain(id);
		const covered = new Set(r.sections.flatMap((s) => s.factIds));
		for (const f of c.facts) expect(covered.has(f.id), f.id).toBe(true);
		expect(r.sections[2].text).toContain('não é um aspecto geométrico');
		expect(r.questions).toHaveLength(3);
		expect(r.practice).toContain('sem despesa');
		expect(r.sections.map((s) => s.text).join(' ')).toContain('evidência contrária');
		expect(await approveTrialReading(input(), c, r)).not.toBeNull();
	});
	it('selects only luminary/ruler aspects, deterministically and with the declared limit', async () => {
		const g = normalizeFactGraph(await sample()),
			s = pillarsSelection(g),
			r = composeTrialReading(input(), await sample());
		expect(s.length).toBeLessThanOrEqual(3);
		for (const x of s)
			expect(
				[x.aspect.first, x.aspect.second].some((b) => ['sun', 'moon', g.asc!.ruler].includes(b))
			).toBe(true);
		expect(r.editorial!.selection.map((x) => x.factId)).toEqual(s.map((x) => x.aspect.factId));
	});
	it('rejects a copied chapter and unsupported certainty through the editorial gate', async () => {
		const c = await sample(),
			r = composeTrialReading(input(), c);
		const repeated = structuredClone(r);
		repeated.sections[1].text = repeated.sections[0].text;
		expect(reviewReconstructedPillars(input(), c, repeated)).toContain('repeated-long-sentence');
		expect(reviewReconstructedPillars(input(), c, repeated)).toContain('repeated-opening');
		expect(await approveTrialReading(input(), c, repeated)).toBeNull();
		const certain = structuredClone(r);
		certain.sections[0].text += ' Seu destino inevitável está decidido.';
		expect(reviewReconstructedPillars(input(), c, certain)).toContain('voice-or-unsupported-claim');
		expect(await approveTrialReading(input(), c, certain)).toBeNull();
	});
	it('changes the declared use and questions without changing natal geometry', async () => {
		const a = input('Estou com sobrecarga e preciso de descanso.'),
			b = input('Quero aprender com um curso gratuito.');
		const ca = await calculateTrial(a, runId),
			cb = await calculateTrial(b, runId),
			ra = composeTrialReading(a, ca),
			rb = composeTrialReading(b, cb);
		expect(ca.data.positions).toEqual(cb.data.positions);
		expect(ca.data.privateAspects).toEqual(cb.data.privateAspects);
		expect(ra.editorial!.context.key).toBe('workload');
		expect(rb.editorial!.context.key).toBe('study');
		expect(ra.questions[0]).not.toBe(rb.questions[0]);
		expect(ra.practice).not.toBe(rb.practice);
		expect(ra.sections[7].text).toContain(a.context);
		expect(pillarsContext().key).toBe('general');
	});
	it.each(['positions', 'regent', 'angleContacts', 'method'])(
		'rejects altered derived %s',
		async (key) => {
			const c = structuredClone(await sample());
			c.data[key] = { altered: true };
			expect(() => composeTrialReading(input(), c)).toThrow('divergente');
		}
	);
	it('rejects changed native facts, birth, context and substituted prose', async () => {
		const c = await sample(),
			r = composeTrialReading(input(), c),
			i = input();
		i.birth!.longitude = 40;
		expect(() => composeTrialReading(i, c)).toThrow('divergente');
		expect(() => composeTrialReading(input('Outro relato.'), c)).toThrow();
		const bad = structuredClone(c);
		(bad.data.natal as CalculationSnapshot).facts[0].display = 'adulterado';
		expect(() => composeTrialReading(input(), bad)).toThrow();
		const altered = structuredClone(r);
		altered.sections[0].text += ' Seu comportamento é inevitável.';
		expect(await approveTrialReading(input(), c, altered)).toBeNull();
	});
	it('rejects an unavailable polar Ascendant without inventing a third factor', async () => {
		const i = input();
		i.birth!.latitude = 70;
		await expect(calculateTrial(i, runId)).rejects.toThrow('Ascendente indisponível');
	});
	it.each(['1992-04-16T09:30:00', '1985-08-21T17:20:00', '2004-11-03T02:45:00'])(
		'differentiates independently calculated birth %s',
		async (date) => {
			const i = input();
			i.birth = { ...i.birth!, localDateTime: date, utcInstant: date + 'Z' };
			const c = await calculateTrial(i, runId),
				r = composeTrialReading(i, c);
			expect(r.sections[0].text).not.toBe(
				composeTrialReading(input(), await sample()).sections[0].text
			);
			expect(reviewReconstructedPillars(i, c, r)).toEqual([]);
			expect(await approveTrialReading(i, c, r)).not.toBeNull();
			const g = normalizeFactGraph(c),
				direct = g.aspects.some(
					(a) => [a.first, a.second].includes('sun') && [a.first, a.second].includes('moon')
				);
			if (!direct) expect(r.sections[3].text).toContain('Não há aspecto maior Sol–Lua');
		}
	);
	it('keeps the previous natal edition and verifies a saved current edition', async () => {
		const i = input(),
			c = await sample(),
			r = composeTrialReading(i, c),
			approval = await approveTrialReading(i, c, r);
		const old = await calculateHistoricalNatalV4({ ...i, productId: 'midheaven' }, runId);
		old.data.productId = 'three-pillars';
		const previous = composeTrialReading(i, old);
		expect(previous.version).toBe('atv-product-reconstruction/4.0.0');
		expect(previous.sections).not.toEqual(r.sections);
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
		await writeFile('.trial-qa/pillars.json', JSON.stringify(saved, null, 2));
	});
});
