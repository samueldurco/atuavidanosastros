import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
	parseWorkflowInput,
	type BirthInput,
	type CalculationSnapshot,
	type WorkflowInput
} from '@atv/domain';
import { calculateTrial } from '../../server/trial-calculation';
import { approveTrialReading, composeTrialReading, type SavedTrial } from '../reading';
import { latestReadingVersion } from '../versions';
import { buildChartScene } from '../chart-engine-v2';
import { trialGeometry } from '../cartography';
import { assertDossierProjection, DOSSIER_VERSION } from './dossier-facts';
import { reviewReconstructedDossier } from './dossier';

const id = '00000000-0000-4000-8000-000000000097';
const birth = (date: string): BirthInput => ({
	localDateTime: date,
	utcInstant: date + 'Z',
	timezone: 'UTC',
	latitude: 0,
	longitude: 0,
	locationSource: 'synthetic'
});
const input = (): WorkflowInput => ({
	version: 'atv-workflow/1.0.0',
	productId: 'couple-dossier',
	birth: birth('2000-01-01T12:00:00'),
	partner: birth('2001-07-12T07:00:00'),
	context: 'Estamos em cidades diferentes e queremos combinar presença e espaço individual.',
	questions: [
		'Como manter presença à distância?',
		'Como conversar quando discordamos?',
		'Como combinar espaço individual?'
	],
	consent: { storage: true, partner: true, continuity: false, policyVersion: 'atv-input-consent/1' }
});
async function saved(value: WorkflowInput = input()): Promise<SavedTrial> {
	const calculation = await calculateTrial(value, id),
		reading = composeTrialReading(value, calculation);
	const failures = reviewReconstructedDossier(value, calculation, reading);
	const sentences = reading.sections
		.filter((s) => !s.title.startsWith('Referências'))
		.flatMap((s) => s.text.split(/(?<=[.!?])\s+/))
		.map((s) => s.trim())
		.filter((s) => s.length > 100);
	expect(failures, sentences.filter((s, i) => sentences.indexOf(s) !== i).join('\n')).toEqual([]);
	const approval = await approveTrialReading(value, calculation, reading);
	expect(approval).not.toBeNull();
	return {
		id,
		product_id: value.productId,
		created_at: '2026-10-08T12:00:00Z',
		input: value,
		calculation,
		reading,
		approval: approval!
	};
}

describe('Dossiê do Casal — maps, situated answers and voluntary priorities', () => {
	it('keeps the exact two natal sources and changes no geometry when context or questions change', async () => {
		const a = await saved(),
			v = input();
		v.context = 'Precisamos dividir despesas e responsabilidades.';
		v.questions = ['Como organizar as despesas?'];
		const b = await saved(v);
		expect(a.calculation.version).toBe(DOSSIER_VERSION);
		expect(latestReadingVersion('couple-dossier')).toBe(a.reading.version);
		for (const key of ['relationshipGeometry', 'houseOverlays', 'crossAspectStability'])
			expect(a.calculation.data[key]).toEqual(b.calculation.data[key]);
		expect(a.calculation.data.compatibilityScore).toBeNull();
		expect(a.calculation.data.sharing).toBe('not-authorized');
		expect(a.reading.practice).not.toBe(b.reading.practice);
		expect(b.reading.sections.find((s) => s.title.startsWith('Resposta à'))!.text).toContain(
			'responsabilidades'
		);
		expect(
			b.reading.sections.find((s) => s.title === 'O que vem primeiro e por quê')!.text
		).toContain('Recursos e responsabilidades');
	});
	it('answers each question before priorities and binds every answer to reported and calculated facts', async () => {
		const s = await saved(),
			sections = s.reading.sections,
			priority = sections.findIndex((x) => x.title === 'O que vem primeiro e por quê');
		expect(sections).toHaveLength(18);
		s.input.questions!.forEach((q, i) => {
			const index = sections.findIndex((x) => x.title.startsWith(`Resposta à pergunta ${i + 1}:`)),
				a = sections[index];
			expect(index).toBeLessThan(priority);
			expect(a.text).toContain(q);
			expect(a.factIds).toContain(`couple-question-${i + 1}`);
			expect(a.factIds).toContain('personal-context');
			expect(a.factIds.some((x) => x.startsWith('cross-'))).toBe(true);
		});
		expect(sections.find((s) => s.title === 'Um acordo em experiência')!.text).toContain(
			'quem aceita fazer'
		);
		expect(s.reading.editorial!.context.key).toBe('relationships');
	});
	it('requires real context and one to three distinct questions for new runs while parsing historical input', async () => {
		const historical = input();
		delete historical.questions;
		delete historical.context;
		expect(parseWorkflowInput(historical)).not.toBeNull();
		await expect(calculateTrial(historical, id)).rejects.toThrow('contexto');
		for (const questions of [
			[],
			[''],
			['Como conversar?', 'Como conversar?'],
			['1', '2', '3', '4'],
			['x'.repeat(401)]
		]) {
			const v = input();
			v.questions = questions;
			expect(parseWorkflowInput(v)).toBeNull();
			await expect(calculateTrial(v, id)).rejects.toThrow();
		}
	});
	it('binds questions, partner and nested geometry against tampering, without carrying consent into sharing', async () => {
		const s = await saved(),
			other = input();
		other.questions![0] = 'Como lidar com despesas?';
		expect(() => assertDossierProjection(other, s.calculation)).toThrow();
		const bad = structuredClone(s.calculation);
		(bad.data.sources as CalculationSnapshot[])[1].facts[0].display = 'adulterado';
		expect(() => assertDossierProjection(s.input, bad)).toThrow();
		const wrongPartner = input();
		wrongPartner.partner = birth('1990-06-04T04:00:00');
		const c = await calculateTrial(wrongPartner, id);
		expect(c.data.relationshipGeometry).not.toEqual(s.calculation.data.relationshipGeometry);
		const altered = structuredClone(s.reading);
		altered.sections.find((x) => x.title.startsWith('Resposta à'))!.text =
			'A outra pessoa vai voltar.';
		expect(await approveTrialReading(s.input, s.calculation, altered)).toBeNull();
	});
	it('handles repeated themes, unknown feelings and a context containing coercion without enforcing an agreement', async () => {
		const repeated = input();
		repeated.questions = [
			'Como conversar melhor?',
			'Como falar quando discordamos?',
			'Como retomar uma conversa?'
		];
		await saved(repeated);
		const hidden = input();
		hidden.questions = ['Ele me ama e vai voltar?'];
		const h = await saved(hidden);
		expect(h.reading.sections.find((x) => x.title.startsWith('Resposta à'))!.text).toContain(
			'não permite saber'
		);
		const danger = input();
		danger.context = 'Tenho medo de ameaças e não posso recusar.';
		const d = await saved(danger);
		expect(d.reading.practice).toContain('apoio');
		expect(d.reading.sections.map((section) => section.text).join(' ')).not.toMatch(
			/Escolham|Conversem|Procurem uma alternativa|separem necessidade|comparem a proposta/
		);
		expect(d.reading.sections.find((x) => x.title === 'Um acordo em experiência')!.text).toContain(
			'individual'
		);
	});
	it('rejects duplicated prose, unanswered questions and a priority placed before answers', async () => {
		const s = await saved();
		const duplicate = structuredClone(s.reading);
		duplicate.sections[2].text += '\n' + duplicate.sections[1].text;
		expect(reviewReconstructedDossier(s.input, s.calculation, duplicate)).toContain(
			'repeated-dossier-prose'
		);
		const missing = structuredClone(s.reading);
		missing.sections = missing.sections.filter((x) => !x.title.startsWith('Resposta à pergunta 2'));
		expect(reviewReconstructedDossier(s.input, s.calculation, missing)).toContain(
			'unanswered-dossier-question'
		);
		const before = structuredClone(s.reading),
			p = before.sections.findIndex((x) => x.title === 'O que vem primeiro e por quê');
		before.sections.splice(1, 0, ...before.sections.splice(p, 1));
		expect(reviewReconstructedDossier(s.input, s.calculation, before)).toContain(
			'dossier-priority-before-answers'
		);
	});
	it('keeps three charts and exports the exact saved reading for complete PDF inspection', async () => {
		const s = await saved();
		expect(buildChartScene(s).markers).toHaveLength(20);
		expect(buildChartScene(s).title).toContain('Dossiê');
		for (const person of ['first', 'second'] as const) {
			expect(buildChartScene(s, { person }).markers).toHaveLength(10);
			expect(trialGeometry(s, person).positions).toHaveLength(10);
		}
		const { trialPdf } = await import('../pdf'),
			{ PDFDocument } = await import('pdf-lib');
		const pdf = await trialPdf(s),
			doc = await PDFDocument.load(pdf);
		expect(doc.getPageCount()).toBeGreaterThan(15);
		const dir = process.env.ATV_RECONSTRUCTION_QA_DIR;
		if (dir) {
			await mkdir(dir, { recursive: true });
			await writeFile(join(dir, 'dossier-reading.pdf'), pdf);
			await writeFile(join(dir, 'dossier-reading.json'), JSON.stringify(s, null, 2));
			await writeFile(
				join(dir, 'dossier-reading-review.txt'),
				[
					s.reading.title,
					s.reading.opening,
					...s.reading.sections.map((x) => x.title + '\n' + x.text),
					...s.reading.questions,
					s.reading.practice,
					...s.reading.limits
				].join('\n\n')
			);
		}
	}, 30000);
});
