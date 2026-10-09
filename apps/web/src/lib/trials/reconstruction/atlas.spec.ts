import { describe, expect, it } from 'vitest';
import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import { calculateTrial } from '../../server/trial-calculation';
import { approveTrialReading, composeTrialReading, type SavedTrial } from '../reading';
import { atlasPriorities, validAtlasChoices } from '../../atlas-priorities';
import { ATLAS_VERSION, assertAtlasProjection, type AtlasData } from './atlas-facts';
import { reviewReconstructedAtlas, selectAtlasCluster } from './atlas';
import { normalizeFactGraph } from './fact-graph';
import { buildChartScene } from '../chart-engine-v2';
import { trialText } from '../exports';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const runId = '00000000-0000-4000-8000-000000000140';
const input = (
	priorities = atlasPriorities.slice(0, 4).map((p) => p.label) as string[],
	context = 'Quero reorganizar a rotina sem transferir minhas responsabilidades.'
): WorkflowInput => ({
	version: 'atv-workflow/1.0.0',
	productId: 'life-atlas',
	atlas: { priorities: priorities as [string, string, string, string] },
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
	expect(reviewReconstructedAtlas(i, calculation, reading)).toEqual([]);
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
describe('Atlas 360 reconstruído', () => {
	it('preserves the complete native projection and the four exact reported priorities', async () => {
		const c = await sample(),
			d = c.data as unknown as AtlasData;
		expect(c.version).toBe(ATLAS_VERSION);
		expect(d.native.version).toBe('atv-life-atlas-calculation/1.0.0');
		expect(d.priorities).toEqual(input().atlas!.priorities);
		expect(d.birth).toEqual(input().birth);
		expect(d.natal.data.positions as unknown[]).toHaveLength(10);
		expect(normalizeFactGraph(c).houses).toHaveLength(12);
		expect(d.method.path).toEqual([7, 14, 21, 30]);
		expect(() => assertAtlasProjection(input(), c)).not.toThrow();
	});
	it('selects distinct factors and experiments for all eight explicit areas', async () => {
		const graph = normalizeFactGraph(await sample());
		const fingerprints = atlasPriorities.map((p) =>
			selectAtlasCluster(graph, p.id).factIds.join('|')
		);
		expect(new Set(fingerprints).size).toBe(8);
		const other = input(atlasPriorities.slice(4).map((p) => p.label)),
			c = await calculateTrial(other, runId),
			r = composeTrialReading(other, c),
			s = await saved();
		expect(c.data.positions).toEqual(s.calculation.data.positions);
		expect(r.editorial!.themes.map((t) => t.id)).toEqual([
			'learning',
			'care',
			'identity',
			'networks'
		]);
		expect(r.editorial!.patterns).not.toEqual(s.reading.editorial!.patterns);
		expect(r.practice).not.toBe(s.reading.practice);
		expect(await approveTrialReading(other, c, r)).not.toBeNull();
	});
	it('changes chapter order, synthesis and the relative path when the same priorities are reordered', async () => {
		const i = input([...input().atlas!.priorities].reverse()),
			c = await calculateTrial(i, runId),
			r = composeTrialReading(i, c),
			s = await saved();
		expect(c.data.positions).toEqual(s.calculation.data.positions);
		expect(r.editorial!.themes.map((t) => t.id)).toEqual(
			[...s.reading.editorial!.themes.map((t) => t.id)].reverse()
		);
		expect(r.sections.map((x) => x.title)).not.toEqual(s.reading.sections.map((x) => x.title));
		expect(r.sections.find((x) => x.title.includes('trinta'))?.text).not.toBe(
			s.reading.sections.find((x) => x.title.includes('trinta'))?.text
		);
		expect(r.practice).not.toBe(s.reading.practice);
	});
	it('validates choices explicitly, including historical aliases and alias duplicates', async () => {
		expect(validAtlasChoices(['trabalho', 'cuidado', 'vínculos', 'aprendizado'])).toBe(true);
		expect(validAtlasChoices(['trabalho', 'Trabalho e contribuição', 'cuidado', 'vínculos'])).toBe(
			false
		);
		expect(validAtlasChoices(['riqueza garantida', 'cuidado', 'vínculos', 'aprendizado'])).toBe(
			false
		);
		await expect(
			calculateTrial(input(['trabalho', 'Trabalho e contribuição', 'cuidado', 'vínculos']), runId)
		).rejects.toThrow();
		await expect(
			calculateTrial(input(['riqueza garantida', 'cuidado', 'vínculos', 'aprendizado']), runId)
		).rejects.toThrow();
		const i = input(['trabalho', 'cuidado', 'vínculos', 'aprendizado']),
			c = await calculateTrial(i, runId);
		expect(await approveTrialReading(i, c, composeTrialReading(i, c))).not.toBeNull();
	});
	it('keeps context literal and changes its practical reading without changing the map', async () => {
		const i = input(undefined, 'Quero mudar de trabalho com apoio consentido.'),
			c = await calculateTrial(i, runId),
			r = composeTrialReading(i, c),
			s = await saved();
		expect(c.data.positions).toEqual(s.calculation.data.positions);
		expect(r.sections.some((x) => x.text.includes(i.context!))).toBe(true);
		expect(r.sections).not.toEqual(s.reading.sections);
	});
	it('does not fabricate houses when Placidus is unavailable at a polar latitude', async () => {
		const i = input();
		i.birth!.latitude = 84;
		const c = await calculateTrial(i, runId),
			r = composeTrialReading(i, c);
		expect(normalizeFactGraph(c).houses).toHaveLength(0);
		expect(r.sections.some((x) => x.text.includes('Sem casas disponíveis'))).toBe(true);
		expect(await approveTrialReading(i, c, r)).not.toBeNull();
	});
	it('rejects changed source, geometry, method and priority order', async () => {
		const c = await sample();
		for (const mutate of [
			(d: Record<string, unknown>) => {
				(d.priorities as string[]).reverse();
			},
			(d: Record<string, unknown>) => {
				(d.birth as Record<string, unknown>).latitude = 1;
			},
			(d: Record<string, unknown>) => {
				(d.method as Record<string, unknown>).selection = 'invented';
			},
			(d: Record<string, unknown>) => {
				(d.positions as { longitude: number }[])[0].longitude += 1;
			}
		]) {
			const changed = structuredClone(c);
			mutate(changed.data);
			expect(() => assertAtlasProjection(input(), changed)).toThrow();
		}
	});
	it('binds fourteen complete chapters and every fact and rejects rewritten editorial claims', async () => {
		const s = await saved(),
			r = s.reading;
		expect(r.sections).toHaveLength(14);
		expect(r.sections.every((x) => x.text.length >= 220)).toBe(true);
		expect(s.calculation.facts.every((f) => r.sections.some((x) => x.factIds.includes(f.id)))).toBe(
			true
		);
		expect(r.editorial!.themes).toHaveLength(4);
		expect(r.editorial!.plan).toHaveLength(14);
		expect(buildChartScene(s).markers).toHaveLength(10);
		expect(JSON.stringify(r)).not.toMatch(/undefined|\[object Object\]|\bNaN\b/);
		const changed = structuredClone(r);
		changed.sections[1].text += ' Você terá sucesso garantido.';
		expect(await approveTrialReading(s.input, s.calculation, changed)).toBeNull();
	});
	it('exports the same full reading and natal mandala in a recoverable PDF', async () => {
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
			await writeFile(join(dir, 'life-atlas.pdf'), pdf);
			await writeFile(join(dir, 'life-atlas.json'), JSON.stringify(s, null, 2));
			await writeFile(
				join(dir, 'life-atlas-review.txt'),
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
