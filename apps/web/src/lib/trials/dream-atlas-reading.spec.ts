import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import type { DreamAtlasFactSource, WorkflowInput } from '@atv/domain';
import {
	calculateDreamAtlasSnapshot,
	composeDreamAtlas,
	reviewDreamAtlas,
	DREAM_ATLAS_CALCULATION,
	DREAM_ATLAS_READING
} from './dream-atlas-reading';
import { approveTrialReading, composeTrialReading, type SavedTrial } from './reading';
import { latestReadingVersion } from './versions';
import { trialPdf } from './pdf';
import { trialText } from './exports';

// Deliberately synthetic: elapsed dates are calculation fixtures, never a saved or backdated user cycle.
const input: WorkflowInput = {
	version: 'atv-workflow/1.0.0',
	productId: 'dream-atlas',
	dreamAtlas: { startDate: '2026-09-01' },
	consent: {
		storage: true,
		partner: false,
		continuity: false,
		policyVersion: 'atv-input-consent/1'
	}
};
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const entry = (n: number, day: number, include = true): DreamAtlasFactSource => ({
	version: 'atv-dream-atlas-entry/1',
	id: id(n),
	revision: 1,
	dreamDate: `2026-09-${String(day).padStart(2, '0')}`,
	narrative: `Relato sintético ${n}: atravessei uma ponte e reconheci uma janela da casa onde vivi.`,
	emotions: [day < 15 ? 'curiosidade' : 'tranquilidade'],
	associations: ['mudança de casa'],
	includeInSynthesis: include
});
const sources = () => [
	entry(1, 1),
	entry(2, 8),
	entry(3, 22),
	entry(4, 30),
	{
		...entry(5, 4, false),
		narrative: 'SEGREDO_EXCLUIDO: este relato não foi autorizado para a análise.'
	}
];
async function saved(entries = sources()): Promise<SavedTrial> {
	const calculation = calculateDreamAtlasSnapshot(input.dreamAtlas!.startDate, entries);
	const reading = composeTrialReading(input, calculation);
	const approval = await approveTrialReading(input, calculation, reading);
	expect(reviewDreamAtlas(input, calculation, composeDreamAtlas(input, calculation))).toEqual([]);
	expect(approval).not.toBeNull();
	return {
		id: id(99),
		product_id: 'dream-atlas',
		created_at: '2026-10-01T12:00:00Z',
		input,
		calculation,
		reading,
		approval: approval!
	};
}

describe('Diário de Sonhos — synthesis from a real 30-day source contract', () => {
	it('covers dates, five windows, literal recurrence and situated differences without including excluded data', async () => {
		const s = await saved();
		expect(s.calculation.version).toBe(DREAM_ATLAS_CALCULATION);
		expect(s.reading.version).toBe(DREAM_ATLAS_READING);
		expect(latestReadingVersion('dream-atlas')).toBe(s.reading.version);
		expect(JSON.stringify(s)).not.toContain('SEGREDO_EXCLUIDO');
		expect(s.calculation.data.sourceIds).toEqual([id(1), id(2), id(3), id(4)]);
		expect(s.calculation.data.sourceRevisions).toEqual({
			[id(1)]: 1,
			[id(2)]: 1,
			[id(3)]: 1,
			[id(4)]: 1
		});
		expect(s.reading.sections.find((s) => s.title === 'Uma leitura do percurso')!.text).toContain(
			'tranquilidade'
		);
		expect(
			s.reading.sections.find((s) => s.title === 'O que reaparece nos seus relatos')!.text
		).toContain('mudança de casa');
		expect(s.reading.sections.some((s) => s.text.includes('lacuna'))).toBe(true);
		const used = new Set(s.reading.sections.flatMap((s) => s.factIds));
		expect(s.calculation.facts.every((f) => used.has(f.id))).toBe(true);
	});
	it('approves a sparse diary and states the limitation instead of inventing a 30-day evolution', async () => {
		const s = await saved([entry(1, 1)]);
		expect(s.reading.sections.find((s) => s.title === 'Uma leitura do percurso')!.text).toContain(
			'não sustenta descrever uma evolução'
		);
		expect(new Set(s.reading.sections.map((s) => s.text)).size).toBe(s.reading.sections.length);
	});
	it('changes interpretation with declared context and rejects adulterated dates, revisions, facts and delivery', async () => {
		const s = await saved();
		const changed = sources().map((e) => ({ ...e, associations: ['viagem recente'] }));
		const other = await saved(changed);
		expect(other.reading.sections[1].text).not.toBe(s.reading.sections[1].text);
		for (const mutate of [
			(v: SavedTrial) => {
				(v.calculation.data.entries as unknown as DreamAtlasFactSource[])[0].revision += 1;
			},
			(v: SavedTrial) => {
				(v.calculation.data.entries as unknown as DreamAtlasFactSource[])[0].dreamDate =
					'2026-08-31';
			},
			(v: SavedTrial) => {
				v.calculation.facts[0].display = 'Um período que não foi registrado';
			},
			(v: SavedTrial) => {
				v.reading.sections[1].text = 'Este sonho prevê com certeza uma mudança de casa.';
			}
		]) {
			const tampered = structuredClone(s);
			mutate(tampered);
			expect(await approveTrialReading(input, tampered.calculation, tampered.reading)).toBeNull();
		}
	});
	it('requires explicit inclusion and refuses oversized sources before composing a delivery', () => {
		expect(() => calculateDreamAtlasSnapshot('2026-09-01', [entry(1, 1, false)])).toThrow(
			'Autorize'
		);
		const large = Array.from({ length: 20 }, (_, i) => ({
			...entry(i + 1, i + 1),
			narrative: 'a'.repeat(6000)
		}));
		expect(() => calculateDreamAtlasSnapshot('2026-09-01', large)).toThrow('limite de texto');
	});
	it('fits the signed payload near the accepted diary ceiling, including many distinct recurrences', async () => {
		const large = Array.from({ length: 14 }, (_, i) => ({
			...entry(i + 1, i + 1),
			narrative: 'a'.repeat(5000),
			emotions: Array.from({ length: 8 }, (_, j) => `emoção ${Math.floor(i / 2)} ${j}`),
			associations: Array.from({ length: 8 }, (_, j) => `contexto ${Math.floor(i / 2)} ${j}`)
		}));
		const s = await saved(large);
		expect(s.reading.sections[1].text).toContain('oito das repetições');
		expect(JSON.stringify(s).length).toBeLessThan(750000);
	});
	it('exports the integrated analysis and every authorized narrative to the existing private PDF contract', async () => {
		const s = await saved();
		expect(trialText(s)).toContain('Uma leitura do percurso');
		expect(trialText(s)).toContain(sources()[3].narrative);
		const bytes = await trialPdf(s);
		const pdf = await PDFDocument.load(bytes);
		expect(pdf.getPageCount()).toBeGreaterThan(2);
		await mkdir('../../test-results/dream-atlas', { recursive: true });
		await writeFile('../../test-results/dream-atlas/synthetic-complete-period.pdf', bytes);
		await writeFile('../../test-results/dream-atlas/synthetic-complete-period.txt', trialText(s));
	});
});
