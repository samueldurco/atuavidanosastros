import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CrossAspectCalculation } from '@atv/astrology';
import type { BirthInput, CalculationSnapshot, WorkflowInput } from '@atv/domain';
import { calculateTrial } from '../../server/trial-calculation';
import { approveTrialReading, composeTrialReading, type SavedTrial } from '../reading';
import { buildChartScene, boxesOverlap } from '../chart-engine-v2';
import { latestReadingVersion } from '../versions';
import { normalizeFactGraph } from './fact-graph';
import { reviewReconstructedSynastry } from './synastry';
import { assertSynastryProjection, SYNASTRY_VERSION, type HouseOverlay } from './synastry-facts';

const runId = '00000000-0000-4000-8000-000000000096';
const birth = (date: string): BirthInput => ({
	localDateTime: date,
	utcInstant: date + 'Z',
	timezone: 'UTC',
	latitude: 0,
	longitude: 0,
	locationSource: 'synthetic'
});
const input = (context?: string): WorkflowInput => ({
	version: 'atv-workflow/1.0.0',
	productId: 'synastry',
	birth: birth('2000-01-01T12:00:00'),
	partner: birth('2001-07-12T07:00:00'),
	context,
	consent: { storage: true, partner: true, continuity: false, policyVersion: 'atv-input-consent/1' }
});
const geometry = (c: CalculationSnapshot) => c.data.relationshipGeometry as CrossAspectCalculation;
const saved = async (value: WorkflowInput): Promise<SavedTrial> => {
	const calculation = await calculateTrial(value, runId),
		reading = composeTrialReading(value, calculation);
	const approval = await approveTrialReading(value, calculation, reading);
	expect(approval).not.toBeNull();
	return {
		id: runId,
		product_id: value.productId,
		created_at: '2026-10-08T12:00:00Z',
		input: value,
		calculation,
		reading,
		approval: approval!
	};
};
const duplicates = (r: SavedTrial['reading']) => {
	const sentences = r.sections
		.filter((s) => !/^Referências/.test(s.title))
		.flatMap((s) => s.text.split(/(?<=[.!?])\s+/))
		.map((s) => s.trim())
		.filter((s) => s.length > 100);
	return sentences.filter((s, i) => sentences.indexOf(s) !== i);
};

describe('Sinastria — calculated relationships and eleven human chapters', () => {
	it('retains two full sources, all hundred directed pairs and nominal aspect geometry', async () => {
		const value = input(),
			c = await calculateTrial(value, runId);
		expect(c.version).toBe(SYNASTRY_VERSION);
		expect(() => assertSynastryProjection(value, c)).not.toThrow();
		expect(c.facts.filter((f) => f.id.startsWith('cross-'))).toHaveLength(100);
		expect(c.data.compatibilityScore).toBeNull();
		expect(c.data.sharing).toBe('not-authorized');
		const g = geometry(c),
			sources = c.data.sources as CalculationSnapshot[];
		for (const [role, i] of [
			['first', 0],
			['second', 1]
		] as const)
			expect(g.inputPositions[role]).toEqual(
				(sources[i].data.positions as { body: string; longitude: number }[]).map((p) => ({
					body: p.body,
					longitude: p.longitude
				}))
			);
		const exact: Record<string, number> = {
			conjunction: 0,
			sextile: 60,
			square: 90,
			trine: 120,
			opposition: 180
		};
		for (const a of g.aspects) {
			const pa = g.inputPositions.first.find((p) => p.body === a.first)!,
				pb = g.inputPositions.second.find((p) => p.body === a.second)!;
			const delta = Math.abs(pa.longitude - pb.longitude),
				separation = Math.min(delta, 360 - delta);
			expect(a.orbDegrees).toBeCloseTo(Math.abs(separation - exact[a.kind]), 8);
			expect(a.orbDegrees).toBeLessThanOrEqual(a.kind === 'sextile' ? 4 : 6);
		}
	});
	it('binds each overlay to the actual receiver cusp and sender position', async () => {
		const c = await calculateTrial(input(), runId),
			graphs = (c.data.sources as CalculationSnapshot[]).map(normalizeFactGraph);
		const overlays = c.data.houseOverlays as HouseOverlay[];
		expect(overlays).toHaveLength(20);
		for (const o of overlays) {
			const i = o.from === 'person-a' ? 0 : 1,
				p = graphs[i].positions.find((p) => p.body === o.body)!,
				receiver = graphs[1 - i];
			const cusp = receiver.houses[o.house - 1],
				next = receiver.houses[o.house % 12];
			expect((p.longitude - cusp.longitude + 360) % 360).toBeLessThan(
				(next.longitude - cusp.longitude + 360) % 360
			);
			expect(o.cuspFactId).toBe(`person-${i === 0 ? 'b' : 'a'}-${cusp.factId}`);
		}
	});
	it('selects real evidence for eleven chapters and rejects changed readings or facts', async () => {
		const s = await saved(input('Queremos melhorar as conversas e os acordos.'));
		expect(s.reading.version).toBe(latestReadingVersion('synastry'));
		expect(s.reading.sections).toHaveLength(12);
		expect(duplicates(s.reading)).toEqual([]);
		expect(reviewReconstructedSynastry(s.input, s.calculation, s.reading)).toEqual([]);
		expect(
			s.reading.editorial!.selection.every((item) =>
				geometry(s.calculation).aspects.some((a) => item.factId === `cross-${a.first}-${a.second}`)
			)
		).toBe(true);
		const edited = structuredClone(s.reading);
		edited.sections[0].text += ' Vocês são destinados a ficar juntos.';
		expect(await approveTrialReading(s.input, s.calculation, edited)).toBeNull();
		const repeated = structuredClone(s.reading);
		repeated.sections[1].text += '\n\n' + repeated.sections[0].text;
		expect(reviewReconstructedSynastry(s.input, s.calculation, repeated)).toContain(
			'repeated-synastry-prose'
		);
		for (const mutate of [
			(c: CalculationSnapshot) => {
				(geometry(c).aspects[0] as { orbDegrees: number }).orbDegrees += 0.1;
			},
			(c: CalculationSnapshot) => {
				(c.data.houseOverlays as HouseOverlay[])[0].house = 12;
			},
			(c: CalculationSnapshot) => {
				c.facts[0].display += ' adulterado';
			}
		]) {
			const c = structuredClone(s.calculation);
			mutate(c);
			expect(() => composeTrialReading(s.input, c)).toThrow();
		}
	});
	it('uses context for priorities without changing any cross longitude or overlay', async () => {
		const a = await saved(input('Moramos em cidades distantes.')),
			b = await saved(input('Quero preservar minha autonomia e liberdade.'));
		expect(geometry(a.calculation)).toEqual(geometry(b.calculation));
		expect(a.calculation.data.houseOverlays).toEqual(b.calculation.data.houseOverlays);
		expect(a.reading.editorial!.selection).not.toEqual(b.reading.editorial!.selection);
		expect(a.reading.sections[0].text).not.toBe(b.reading.sections[0].text);
		expect(a.reading.practice).not.toBe(b.reading.practice);
		expect(() => composeTrialReading(b.input, a.calculation)).toThrow();
	});
	it('changes interpretation when partner or roles change and refuses transplantation', async () => {
		const a = await saved(input()),
			value = input();
		value.partner = birth('1986-07-19T04:30:00');
		const b = await saved(value);
		expect(geometry(a.calculation).aspects).not.toEqual(geometry(b.calculation).aspects);
		expect(a.reading.sections[0].text).not.toBe(b.reading.sections[0].text);
		expect(await approveTrialReading(b.input, b.calculation, a.reading)).toBeNull();
		const swap = input();
		[swap.birth, swap.partner] = [swap.partner, swap.birth];
		const c = await saved(swap);
		expect(a.reading.sections[0].text).not.toBe(c.reading.sections[0].text);
	});
	it('keeps coincident and high-latitude maps legible without manufacturing houses', async () => {
		for (const latitude of [0, 89]) {
			const value = input();
			value.birth!.latitude = latitude;
			value.partner = structuredClone(value.birth);
			const s = await saved(value);
			expect(duplicates(s.reading)).toEqual([]);
			expect(reviewReconstructedSynastry(s.input, s.calculation, s.reading)).toEqual([]);
			expect(s.calculation.data.houseOverlays).toHaveLength(latitude ? 0 : 20);
			if (latitude) expect(s.reading.sections[9].text).toContain('não estão disponíveis');
			const scene = buildChartScene(s);
			expect(scene.markers).toHaveLength(20);
			for (const [i, m] of scene.markers.entries())
				expect(scene.markers.slice(i + 1).some((n) => boxesOverlap(m.box, n.box))).toBe(false);
		}
	});
	it('renders a comparison plus two complete individual charts and preserves selected geometry', async () => {
		const s = await saved(input()),
			scene = buildChartScene(s);
		expect(scene.markers).toHaveLength(20);
		for (const [i, m] of scene.markers.entries()) {
			expect(scene.markers.slice(i + 1).some((n) => boxesOverlap(m.box, n.box))).toBe(false);
			const [role, body] = m.body.split(':'),
				source = geometry(s.calculation).inputPositions[role === 'sample' ? 'first' : 'second'];
			expect(m.longitude).toBe(source.find((p) => p.body === body)!.longitude);
		}
		expect(
			scene.nodes
				.filter((n) => n.layer === 'aspects')
				.every((n) => s.reading.editorial!.selection.some((x) => x.factId === n.factId))
		).toBe(true);
		expect(buildChartScene(s, { aspects: 'none' }).nodes.some((n) => n.layer === 'aspects')).toBe(
			false
		);
		for (const person of ['first', 'second'] as const) {
			const individual = buildChartScene(s, { person });
			expect(individual.markers).toHaveLength(10);
			expect(
				individual.nodes.filter((n) => n.type === 'line' && n.layer === 'houses')
			).toHaveLength(12);
			expect(individual.title).toContain(person === 'first' ? 'A' : 'B');
		}
	});
	it('requires both real inputs and partner consent', async () => {
		const noPartner = input();
		delete noPartner.partner;
		const noConsent = input();
		noConsent.consent.partner = false;
		for (const v of [noPartner, noConsent])
			await expect(calculateTrial(v, runId)).rejects.toThrow();
	});
	it('exports the saved reading with its three chart pages for complete visual QA', async () => {
		const s = await saved(input('Queremos melhorar as conversas e os acordos.'));
		const { trialPdf } = await import('../pdf'),
			{ PDFDocument } = await import('pdf-lib');
		const pdf = await trialPdf(s),
			document = await PDFDocument.load(pdf);
		expect(document.getPageCount()).toBeGreaterThanOrEqual(6);
		const dir = process.env.ATV_RECONSTRUCTION_QA_DIR;
		if (dir) {
			await mkdir(dir, { recursive: true });
			await writeFile(join(dir, 'synastry-reading.pdf'), pdf);
			await writeFile(join(dir, 'synastry-reading.json'), JSON.stringify(s, null, 2));
			await writeFile(
				join(dir, 'synastry-reading-review.txt'),
				[
					s.reading.title,
					s.reading.opening,
					...s.reading.sections.map((x) => x.title + '\n' + x.text),
					s.reading.questions.join('\n'),
					s.reading.practice,
					s.reading.source,
					...s.reading.limits
				].join('\n\n')
			);
		}
	});
});
