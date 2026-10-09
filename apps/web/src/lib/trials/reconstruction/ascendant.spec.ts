import { calculateHistoricalNatalV4 } from './historical-v4.test-helper';
import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import { calculateTrial } from '../../server/trial-calculation';
import { approveTrialReading, composeTrialReading, type SavedTrial } from '../reading';
import { executeTrialRuntime } from '../../server/trial-computation';
import { latestReadingVersion } from '../versions';
import { experienceFor } from '../experience';
import { buildChartScene } from '../chart-engine-v2';
import { normalizeFactGraph } from './fact-graph';
import { modernRulers } from './canon';
import { ascendantModifiers, reviewReconstructedAscendant } from './ascendant';
import {
	assertAscendantProjection,
	ascendantAngularContacts,
	ASCENDANT_VERSION,
	ASCENDANT_READING_VERSION,
	type AscendantData
} from './ascendant-facts';

const runId = '00000000-0000-4000-8000-000000000180';
const input = (
	context = 'Quero abrir uma conversa e explicar minhas necessidades.'
): WorkflowInput => ({
	version: 'atv-workflow/1.0.0',
	productId: 'ascendant',
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
const repeated = (r: ReturnType<typeof composeTrialReading>) => {
	const sentences = [...r.sections.slice(0, -1).map((s) => s.text), r.practice].flatMap((t) =>
		t
			.split(/(?<=[.!?])\s+/)
			.map((s) => s.trim())
			.filter((s) => s.length > 100)
	);
	return sentences.filter((s, i) => sentences.indexOf(s) !== i).join('\n');
};
describe('Ascendente 5: regente, modificadores e integração', () => {
	it('preserves its native source, ruler position and house and all calculated relations', async () => {
		const i = input(),
			c = await sample(),
			d = c.data as unknown as AscendantData,
			g = normalizeFactGraph(c);
		expect(c.version).toBe(ASCENDANT_VERSION);
		expect(latestReadingVersion('ascendant')).toBe(ASCENDANT_READING_VERSION);
		expect(g.positions).toHaveLength(10);
		expect(g.houses).toHaveLength(12);
		expect(d.regent.body).toBe(modernRulers[g.asc!.sign]);
		expect(d.regent.house).toBe(g.positions.find((p) => p.body === d.regent.body)!.house);
		for (const f of d.natal.facts) expect(c.facts).toContainEqual(f);
		expect(d.method.applyingSeparating).toBe(false);
		assertAscendantProjection(i, c);
	});
	it('keeps wraparound conjunctions at three degrees and excludes contacts outside the orb', async () => {
		const p = (await sample()).data.positions as AscendantData['positions'];
		expect(ascendantAngularContacts([{ ...p[0], longitude: 2 }], 359)).toContainEqual({
			body: p[0].body,
			angle: 'ascendant',
			kind: 'conjunction',
			orb: 3
		});
		expect(ascendantAngularContacts([{ ...p[0], longitude: 2.001 }], 359)).toEqual([]);
		expect(ascendantAngularContacts([{ ...p[0], longitude: 89 }], 359)).toContainEqual({
			body: p[0].body,
			angle: 'ascendant',
			kind: 'square',
			orb: 0
		});
	});
	it('covers the complete product in a distinct book with three questions and a reversible practice', async () => {
		const i = input(),
			c = await sample(),
			r = composeTrialReading(i, c);
		expect(reviewReconstructedAscendant(i, c, r), repeated(r)).toEqual([]);
		expect(await approveTrialReading(i, c, r)).not.toBeNull();
		expect(r.sections).toHaveLength(12);
		expect(r.editorial?.themes).toHaveLength(10);
		expect(r.questions).toHaveLength(3);
		expect(r.sections[10].text).toContain('vinte minutos');
		expect(r.sections[10].text).toContain('evidência contrária');
		expect(experienceFor('ascendant')).toMatchObject({ format: 'book', pdf: false });
	});
	it('lists all ruler aspects and ASC contacts even when only the closest three receive priority', async () => {
		const c = await sample(),
			g = normalizeFactGraph(c),
			r = composeTrialReading(input(), c),
			m = ascendantModifiers(g);
		const ids = new Set(r.sections.at(-1)!.factIds);
		for (const a of [...m.rulerAspects, ...m.contacts]) expect(ids.has(a.factId)).toBe(true);
		expect(m.rulerAspects).toEqual(
			[...m.rulerAspects].sort((a, b) => a.orb - b.orb || a.factId.localeCompare(b.factId))
		);
		for (const s of r.sections)
			for (const id of s.factIds) expect(g.facts.some((f) => f.id === id)).toBe(true);
	});
	it('changes the contextual application and practice without changing geometry', async () => {
		const a = input(),
			b = input('Estou com sobrecarga e preciso preservar descanso.'),
			ca = await sample(),
			cb = await calculateTrial(b, runId);
		const ra = composeTrialReading(a, ca),
			rb = composeTrialReading(b, cb);
		for (const key of ['positions', 'angles', 'houses', 'privateAspects', 'angleContacts'])
			expect(ca.data[key]).toEqual(cb.data[key]);
		expect(ra.editorial?.context.key).toBe('relationships');
		expect(rb.editorial?.context.key).toBe('workload');
		expect(ra.sections[9].text).not.toBe(rb.sections[9].text);
		expect(ra.practice).not.toBe(rb.practice);
		expect(ra.questions).not.toEqual(rb.questions);
		expect(reviewReconstructedAscendant(b, cb, rb), repeated(rb)).toEqual([]);
		expect(await approveTrialReading(b, cb, rb)).not.toBeNull();
	});
	it('uses genuinely different ascendants and handles luminary rulership without inventing a second planet', async () => {
		const signs = new Set<number>();
		let luminaryRulers = 0;
		for (let hour = 0; hour < 24; hour += 2) {
			const i = input();
			const h = String(hour).padStart(2, '0');
			i.birth = {
				...i.birth!,
				localDateTime: `2000-01-01T${h}:00:00`,
				utcInstant: `2000-01-01T${h}:00:00Z`
			};
			const c = await calculateTrial(i, runId),
				g = normalizeFactGraph(c),
				r = composeTrialReading(i, c);
			signs.add(g.asc!.sign);
			expect(reviewReconstructedAscendant(i, c, r), `hour=${hour}\n${repeated(r)}`).toEqual([]);
			expect(await approveTrialReading(i, c, r), `hour=${hour}`).not.toBeNull();
			if (['sun', 'moon'].includes(g.asc!.ruler)) {
				luminaryRulers++;
				expect(r.sections.map((s) => s.text).join('\n')).toContain('também rege este Ascendente');
			}
		}
		expect(signs.size).toBeGreaterThanOrEqual(10);
		expect(luminaryRulers).toBeGreaterThan(0);
	}, 60000);
	it.each(['positions', 'regent', 'angleContacts', 'method', 'birth'])(
		'rejects mutation of %s after projection',
		async (key) => {
			const c = structuredClone(await sample());
			c.data[key] = null;
			expect(() => assertAscendantProjection(input(), c)).toThrow();
			await expect(
				approveTrialReading(input(), c, composeTrialReading(input(), await sample()))
			).rejects.toThrow();
		}
	);
	it('rejects source edits, forged displays and mismatched birth/context', async () => {
		const c = await sample(),
			changed = structuredClone(c);
		(changed.data.natal as CalculationSnapshot).facts[0].display += ' alterado';
		expect(() => assertAscendantProjection(input(), changed)).toThrow();
		const forged = structuredClone(c);
		forged.facts.find((f) => f.id === 'angle-ascendant')!.display += ' alterado';
		expect(() => assertAscendantProjection(input(), forged)).toThrow();
		expect(() => assertAscendantProjection(input('Outro contexto.'), c)).toThrow();
		const otherBirth = input();
		otherBirth.birth!.utcInstant = '2000-01-01T13:00:00Z';
		expect(() => assertAscendantProjection(otherBirth, c)).toThrow();
	});
	it('rejects incomplete themes, factual omissions, repeated prose and unsupported additions', async () => {
		const i = input(),
			c = await sample(),
			r = composeTrialReading(i, c);
		const missing = structuredClone(r);
		missing.sections.splice(6, 1);
		expect(await approveTrialReading(i, c, missing)).toBeNull();
		const duplicate = structuredClone(r);
		duplicate.sections[2].text = duplicate.sections[1].text;
		expect(reviewReconstructedAscendant(i, c, duplicate)).toContain('repeated-opening');
		const deterministic = structuredClone(r);
		deterministic.sections[0].text += ' Seu sucesso garantido está escrito no mapa.';
		expect(await approveTrialReading(i, c, deterministic)).toBeNull();
	});
	it('keeps historical ascendant edition 4 and verifies the current saved content and chart', async () => {
		const i = input(),
			c = await sample(),
			r = composeTrialReading(i, c),
			approval = await approveTrialReading(i, c, r);
		const old = await calculateHistoricalNatalV4({ ...i, productId: 'midheaven' }, runId);
		old.data.productId = 'ascendant';
		const previous = composeTrialReading(i, old);
		expect(previous.version).toBe('atv-product-reconstruction/4.0.0');
		expect(previous.sections).not.toEqual(r.sections);
		const saved: SavedTrial = {
			id: runId,
			product_id: 'ascendant',
			created_at: '2026-10-08T12:00:00Z',
			input: i,
			calculation: c,
			reading: r,
			approval: approval!
		};
		expect(await executeTrialRuntime({ operation: 'verify', saved })).toBe(true);
		expect(buildChartScene(saved).markers).toHaveLength(10);
		const dir = 'E:/ATVNA/tmp/reconstruction-qa/ascendant';
		await mkdir(dir, { recursive: true });
		await writeFile(`${dir}/ascendant.json`, JSON.stringify(saved, null, 2));
		await writeFile(
			`${dir}/reading.txt`,
			[
				r.title,
				r.opening,
				...r.sections.map((s) => `${s.title}\n${s.text}`),
				...r.questions,
				r.practice
			].join('\n\n')
		);
	});
});
