import { calculateHistoricalNatalV4 } from './historical-v4.test-helper';
import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import { calculateTrial } from '../../server/trial-calculation';
import { executeTrialRuntime } from '../../server/trial-computation';
import { approveTrialReading, composeTrialReading, type SavedTrial } from '../reading';
import { latestReadingVersion } from '../versions';
import { normalizeFactGraph } from './fact-graph';
import {
	composeReconstructedPillars,
	pillarsContext,
	pillarsSelection,
	reviewReconstructedPillars
} from './pillars';
import {
	pillarsIntegrationV51,
	pillarsPairV51,
	pillarsRelationV51,
	reviewReconstructedPillarsV51
} from './pillars-v51';
import {
	assertPillarsProjection,
	pillarsAngularContacts,
	PILLARS_READING_VERSION,
	PILLARS_READING_V5_VERSION,
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
		expect(reviewReconstructedPillarsV51(input(), c, r)).toEqual([]);
		expect(r.sections).toHaveLength(11);
		expect(r.sections.every((s) => s.text.length >= 220)).toBe(true);
		for (const role of ['integrated-trio', 'trio-rhythm', 'sun-moon', 'asc-ruler', 'modifiers'])
			expect(r.editorial!.plan.some((p) => p.role === role)).toBe(true);
		for (const id of ['position-sun', 'position-moon', 'angle-ascendant'])
			expect(r.sections[0].factIds).toContain(id);
		const covered = new Set(r.sections.flatMap((s) => s.factIds));
		for (const f of c.facts) expect(covered.has(f.id), f.id).toBe(true);
		expect(r.sections[2].text).toContain('não são aspectos geométricos');
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
		expect(reviewReconstructedPillarsV51(input(), c, repeated)).toContain('repeated-long-sentence');
		expect(reviewReconstructedPillarsV51(input(), c, repeated)).toContain('repeated-opening');
		expect(await approveTrialReading(input(), c, repeated)).toBeNull();
		const certain = structuredClone(r);
		certain.sections[0].text += ' Seu destino inevitável está decidido.';
		expect(reviewReconstructedPillarsV51(input(), c, certain)).toContain(
			'voice-or-unsupported-claim'
		);
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
		expect(ra.sections[7].text).toContain('o tempo e a energia realmente disponíveis');
		expect(rb.sections[7].text).toContain('o tempo e o apoio que permitem aprender');
		expect(ra.sections[8].text).toContain('reduza uma demanda antes de prometer continuidade');
		expect(rb.sections[8].text).toContain('escolha um exercício acessível');
		expect(ra.sections[7].text).not.toContain('”.');
		expect(ra.sections[7].text).not.toBe(rb.sections[7].text);
		expect(pillarsContext().key).toBe('general');
	});
	it('gives Mercury, Venus and Mars distinct work even in the same sign and aspect', async () => {
		const original = normalizeFactGraph(await sample());
		const g = {
			...original,
			positions: original.positions.map((p) =>
				['mercury', 'venus', 'mars'].includes(p.body) ? { ...p, sign: 9 } : p
			)
		};
		const texts = ['mercury', 'venus', 'mars'].map((body) =>
			pillarsRelationV51(g, {
				first: 'sun',
				second: body,
				kind: 'square',
				orb: 2,
				factId: `editorial-unit-${body}`
			})
		);
		expect(new Set(texts).size).toBe(3);
		expect(texts[0]).toContain('formular, escutar e revisar informação');
		expect(texts[1]).toContain('negociar preferência, valor e reciprocidade');
		expect(texts[2]).toContain('iniciar ação e marcar um limite');
		expect(texts.every((text) => text.includes('Capricórnio'))).toBe(true);
	});
	it('keeps conjunction distinct from facilitation and reads naturally in two captured synthetic profiles', async () => {
		for (const { date, local, context, name } of [
			{
				date: '1998-05-12T12:00:00Z',
				local: '1998-05-12T09:00:00',
				context: 'Estou com sobrecarga e preciso preservar descanso.',
				name: 'Lia Exemplo'
			},
			{
				date: '1992-06-15T08:30:00Z',
				local: '1992-06-15T05:30:00',
				context: 'Quero observar como inicio uma conversa e apresento minhas necessidades.',
				name: 'Caio Exemplo'
			}
		]) {
			const i = input(context);
			i.birth = {
				localDateTime: local,
				utcInstant: date,
				timezone: 'America/Sao_Paulo',
				latitude: -23.55,
				longitude: -46.63,
				locationSource: 'synthetic-review'
			};
			i.presentation = { version: 'atv-reading-identity/1', name, city: 'São Paulo' };
			const c = await calculateTrial(i, runId);
			const g = normalizeFactGraph(c);
			expect(pillarsSelection(g)[0].aspect.kind).toBe('conjunction');
			const r = composeTrialReading(i, c);
			const all = r.sections.map((section) => section.text).join('\n');
			expect(r.sections[0].text).toContain('não comprova por si só');
			expect(r.sections[7].text).toContain('uma função não comprova a outra');
			expect(r.sections[7].text).not.toContain('conjunção oferece uma passagem');
			expect(all).not.toMatch(
				/descreve uma condição|um sinal de a |regente moderno|sem proximidade ao ângulo|os recursos para ampliar pode/
			);
			expect(reviewReconstructedPillarsV51(i, c, r)).toEqual([]);
			expect(await approveTrialReading(i, c, r)).not.toBeNull();
		}
	});
	it('does not turn a calculated Sun–Moon conjunction into guaranteed cooperation', async () => {
		const i = input('Quero decidir quanto trabalho cabe sem perder o descanso.');
		i.birth = {
			localDateTime: '2000-01-06T18:00:00',
			utcInstant: '2000-01-06T18:00:00Z',
			timezone: 'UTC',
			latitude: 0,
			longitude: 0,
			locationSource: 'synthetic-review'
		};
		const c = await calculateTrial(i, runId);
		const g = normalizeFactGraph(c);
		expect(
			g.aspects.find(
				(a) => [a.first, a.second].includes('sun') && [a.first, a.second].includes('moon')
			)?.kind
		).toBe('conjunction');
		const r = composeTrialReading(i, c);
		expect(r.sections[3].text).toContain('não informa sozinha se existe apoio');
		expect(r.sections[3].text).not.toContain('Se a cooperação sugerida aparecer');
		expect(r.sections[7].text).toContain('sem que um comprove o outro');
		expect(reviewReconstructedPillarsV51(i, c, r)).toEqual([]);
	});
	it('changes an integrated hypothesis when a selected aspect is removed from the editorial graph', async () => {
		const g = normalizeFactGraph(await sample()),
			selected = pillarsSelection(g);
		expect(selected.length).toBeGreaterThan(0);
		const before = pillarsIntegrationV51(g, input());
		const after = pillarsIntegrationV51(
			{ ...g, aspects: g.aspects.filter((a) => a.factId !== selected[0].aspect.factId) },
			input()
		);
		expect(before.factIds).toContain(selected[0].aspect.factId);
		expect(after.factIds).not.toContain(selected[0].aspect.factId);
		expect(after.text).not.toBe(before.text);
	});
	it('changes the synthesis and trace when the Ascendant ruler moves house', async () => {
		const g = normalizeFactGraph(await sample());
		const ruler = g.positions.find((p) => p.body === g.asc?.ruler);
		expect(ruler?.house).not.toBeNull();
		const nextHouse = ruler!.house === 1 ? 2 : 1;
		const moved = {
			...g,
			positions: g.positions.map((p) => (p.body === ruler!.body ? { ...p, house: nextHouse } : p))
		};
		const before = pillarsIntegrationV51(g, input());
		const after = pillarsIntegrationV51(moved, input());
		expect(before.text).toContain(`na casa ${ruler!.house}`);
		expect(after.text).toContain(`na casa ${nextHouse}`);
		expect(after.text).not.toBe(before.text);
		expect(before.factIds).toContain(`house-${ruler!.house}`);
		expect(after.factIds).toContain(`house-${nextHouse}`);
		expect(after.factIds).not.toContain(`house-${ruler!.house}`);
	});
	it('keeps an absent aspect absent from the hypothesis and trace', async () => {
		const g = normalizeFactGraph(await sample());
		const empty = { ...g, aspects: [], angleContacts: [] };
		const hypothesis = pillarsIntegrationV51(empty, input());
		expect(hypothesis.text).toContain('Sem aspecto maior Sol–Lua');
		expect(hypothesis.text).toContain('Não há outro vínculo selecionado');
		expect(hypothesis.factIds.some((id) => id.startsWith('aspect-'))).toBe(false);
	});
	it('changes the synthesis and experiment for two real synthetic maps with the same three signs', async () => {
		const a = input('Estou com sobrecarga e preciso de descanso.');
		const b = input('Quero conversar sobre confiança e limites.');
		b.birth = {
			...b.birth!,
			localDateTime: '2000-01-02T12:00:00',
			utcInstant: '2000-01-02T12:00:00Z'
		};
		const ca = await calculateTrial(a, runId),
			cb = await calculateTrial(b, runId);
		const ga = normalizeFactGraph(ca),
			gb = normalizeFactGraph(cb);
		const trio = (g: typeof ga) => [
			g.positions.find((p) => p.body === 'sun')?.sign,
			g.positions.find((p) => p.body === 'moon')?.sign,
			g.asc?.sign
		];
		expect(trio(ga)).toEqual(trio(gb));
		expect(trio(ga)).toEqual([9, 7, 0]);
		expect(pillarsSelection(ga)[0].aspect).toMatchObject({
			first: 'sun',
			second: 'saturn',
			kind: 'trine'
		});
		expect(pillarsSelection(gb)[0].aspect).toMatchObject({
			first: 'moon',
			second: 'mars',
			kind: 'square'
		});
		expect(ca.data.privateAspects).not.toEqual(cb.data.privateAspects);
		const ra = composeTrialReading(a, ca),
			rb = composeTrialReading(b, cb);
		expect(ra.sections[6].text).toContain('Sol em Capricórnio e Saturno em Touro formam trígono');
		expect(rb.sections[6].text).toContain('Lua em Escorpião e Marte em Aquário formam quadratura');
		expect(ra.sections[7].factIds).toContain(pillarsSelection(ga)[0].aspect.factId);
		expect(rb.sections[7].factIds).toContain(pillarsSelection(gb)[0].aspect.factId);
		expect(ra.sections[7].text).not.toBe(rb.sections[7].text);
		expect(ra.sections[8].text).not.toBe(rb.sections[8].text);
		expect(reviewReconstructedPillarsV51(a, ca, ra)).toEqual([]);
		expect(reviewReconstructedPillarsV51(b, cb, rb)).toEqual([]);
		const approvals = await Promise.all([
			approveTrialReading(a, ca, ra),
			approveTrialReading(b, cb, rb)
		]);
		expect(approvals.every(Boolean)).toBe(true);
		await mkdir('.trial-qa', { recursive: true });
		await Promise.all(
			[
				[a, ca, ra, approvals[0]],
				[b, cb, rb, approvals[1]]
			].map(async ([i, c, r, approval], n) =>
				writeFile(
					`.trial-qa/pillars-v51-same-trio-${n + 1}.json`,
					JSON.stringify(
						{
							id: runId,
							product_id: 'three-pillars',
							created_at: '2026-10-15T12:00:00Z',
							input: i,
							calculation: c,
							reading: r,
							approval
						},
						null,
						2
					)
				)
			)
		);
	});
	it('rejects a false pair trace and a same-length generic replacement', async () => {
		const c = await sample(),
			r = composeTrialReading(input(), c),
			g = normalizeFactGraph(c);
		const pair = structuredClone(r);
		pair.editorial!.patterns[0].factIds = ['position-sun', 'angle-ascendant'];
		expect(reviewReconstructedPillarsV51(input(), c, pair)).toContain('pillars-pair-trace');
		const sun = g.positions.find((p) => p.body === 'sun')!;
		const moon = g.positions.find((p) => p.body === 'moon')!;
		const pairReading = pillarsPairV51('sun-moon', sun.sign, moon.sign);
		const genericPair = structuredClone(r);
		genericPair.sections[2].text = genericPair.sections[2].text.replace(
			pairReading,
			'x'.repeat(pairReading.length)
		);
		expect(genericPair.sections[2].text.length).toBe(r.sections[2].text.length);
		expect(reviewReconstructedPillarsV51(input(), c, genericPair)).toContain(
			'pillars-pair-meaning'
		);
		const selected = pillarsSelection(g)[0];
		const relation = pillarsRelationV51(g, selected.aspect);
		const generic = structuredClone(r);
		generic.sections[6].text = generic.sections[6].text.replace(
			relation,
			'x'.repeat(relation.length)
		);
		expect(generic.sections[6].text.length).toBe(r.sections[6].text.length);
		expect(reviewReconstructedPillarsV51(input(), c, generic)).toContain(
			'pillars-function-specificity'
		);
		expect(await approveTrialReading(input(), c, generic)).toBeNull();
	});
	it('changes pair hypothesis by element and modality rather than storing a label only', () => {
		expect(pillarsPairV51('sun-moon', 0, 4)).toContain('sinais parecidos');
		expect(pillarsPairV51('sun-moon', 0, 3)).toContain(
			'o sinal usado para mostrar uma escolha pode não responder'
		);
		expect(pillarsPairV51('sun-moon', 0, 0)).toContain(
			'O modo de sustentar os dois movimentos se aproxima'
		);
		expect(pillarsPairV51('sun-moon', 0, 4)).toContain(
			'Os modos de sustentar os dois movimentos diferem'
		);
		expect(pillarsPairV51('sun-ascendant', 0, 3)).toContain(
			'primeira impressão pode sugerir uma intenção diferente'
		);
		expect(pillarsPairV51('moon-ascendant', 0, 3)).toContain(
			'condição de apoio pode ficar escondida'
		);
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
	it.each([
		{ date: '1992-04-16T09:30:00', context: 'Estou com sobrecarga e preciso de descanso.' },
		{
			date: '1985-08-21T17:20:00',
			context: 'Quero conversar com alguém sobre confiança e limites.'
		},
		{ date: '2004-11-03T02:45:00', context: 'Quero aprender em um curso gratuito.' }
	])('differentiates independently calculated birth $date', async ({ date, context }) => {
		const i = input(context);
		i.birth = { ...i.birth!, localDateTime: date, utcInstant: date + 'Z' };
		const c = await calculateTrial(i, runId),
			r = composeTrialReading(i, c);
		expect(r.sections[0].text).not.toBe(
			composeTrialReading(input(), await sample()).sections[0].text
		);
		expect(reviewReconstructedPillarsV51(i, c, r)).toEqual([]);
		const approval = await approveTrialReading(i, c, r);
		expect(approval).not.toBeNull();
		const g = normalizeFactGraph(c),
			direct = g.aspects.some(
				(a) => [a.first, a.second].includes('sun') && [a.first, a.second].includes('moon')
			);
		if (!direct) expect(r.sections[3].text).toContain('Não há aspecto maior Sol–Lua');
		await mkdir('.trial-qa', { recursive: true });
		await writeFile(
			`.trial-qa/pillars-v51-${date.slice(0, 10)}.json`,
			JSON.stringify(
				{
					id: runId,
					product_id: i.productId,
					created_at: '2026-10-15T12:00:00Z',
					input: i,
					calculation: c,
					reading: r,
					approval
				},
				null,
				2
			)
		);
	});
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
		const historicalReading = composeReconstructedPillars(i, c);
		expect(historicalReading.version).toBe(PILLARS_READING_V5_VERSION);
		expect(reviewReconstructedPillars(i, c, historicalReading)).toEqual([]);
		const historicalApproval = await approveTrialReading(i, c, historicalReading);
		expect(historicalApproval).not.toBeNull();
		expect(
			await executeTrialRuntime({
				operation: 'verify',
				saved: { ...saved, reading: historicalReading, approval: historicalApproval! }
			})
		).toBe(true);
		await mkdir('.trial-qa', { recursive: true });
		await writeFile('.trial-qa/pillars.json', JSON.stringify(saved, null, 2));
	});
});
