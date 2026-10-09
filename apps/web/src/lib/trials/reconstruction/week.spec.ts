import { describe, expect, it } from 'vitest';
import { parseWorkflowInput, type CalculationSnapshot, type WorkflowInput } from '@atv/domain';
import { calculateTrial } from '../../server/trial-calculation';
import { assertWeekProjection, WEEK_VERSION, type WeekContact, type WeekDay } from './week-facts';
import { composeTrialReading, approveTrialReading, type SavedTrial } from '../reading';
import { reviewReconstructedWeek } from './week';
import { buildChartScene } from '../chart-engine-v2';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const runId = '00000000-0000-4000-8000-000000000099';
const input = (
	context = 'Fuso atual declarado: America/Sao_Paulo (não usado para calcular dias locais).\nTema escolhido: Organização e prioridades.\n\nContexto declarado: Quero rever o excesso de tarefas sem abandonar meu projeto.'
): WorkflowInput => ({
	version: 'atv-workflow/1.0.0',
	productId: 'week-reading',
	targetDate: '2026-10-08',
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
async function sample() {
	return (cached ??= await calculateTrial(input(), runId));
}
describe('Semana reconstruída', () => {
	it('preserves the real hourly search, seven dates and observed changes', async () => {
		const c = await sample();
		expect(c.version).toBe(WEEK_VERSION);
		expect(() => assertWeekProjection(input(), c)).not.toThrow();
		const days = c.data.days as WeekDay[],
			contacts = c.data.contacts as WeekContact[];
		expect(days.map((d) => d.date)).toEqual([
			'2026-10-08',
			'2026-10-09',
			'2026-10-10',
			'2026-10-11',
			'2026-10-12',
			'2026-10-13',
			'2026-10-14'
		]);
		expect(
			days.every((d) => d.positions.length === 10 && d.sampleInstant.endsWith('T12:00:00.000Z'))
		).toBe(true);
		expect(contacts.length).toBeGreaterThan(3);
		expect(contacts.some((c) => c.days[0].minOrb !== c.days[6].minOrb)).toBe(true);
	}, 25000);
	it('independently matches each observed contact and noon card to the hourly longitudes', async () => {
		const c = await sample(),
			base = c.data.base as CalculationSnapshot;
		const rows = base.data.rows as [number, number[], string, number][];
		const natal = c.data.positions as { body: string; longitude: number }[];
		const names = [
			'sun',
			'moon',
			'mercury',
			'venus',
			'mars',
			'jupiter',
			'saturn',
			'uranus',
			'neptune',
			'pluto'
		];
		const angles: Record<string, number> = {
			conjunction: 0,
			sextile: 60,
			square: 90,
			trine: 120,
			opposition: 180
		};
		for (const contact of c.data.contacts as WeekContact[]) {
			const n = natal.find((p) => p.body === contact.natal)!;
			const values = Array.from({ length: 169 }, (_, i) => {
				const longitude = rows.find((r) => r[0] === i * 3600000)![1][
					names.indexOf(contact.transit)
				];
				const difference = Math.abs(longitude - n.longitude);
				return Math.abs(Math.min(difference, 360 - difference) - angles[contact.aspect]);
			});
			expect(contact.minOrb).toBe(Math.min(...values));
			expect(contact.observedHours).toBe(values.filter((v) => v <= 2).length);
			contact.days.forEach((d, i) => {
				expect(d.noonOrb).toBe(values[i * 24 + 12]);
				expect(d.observedHours).toBe(
					values.slice(i * 24, (i + 1) * 24).filter((v) => v <= 2).length
				);
			});
		}
		(c.data.days as WeekDay[]).forEach((d, i) =>
			expect(d.positions.map((p) => p.longitude)).toEqual(
				rows.find((r) => r[0] === (i * 24 + 12) * 3600000)![1]
			)
		);
	});
	it('approves a distinct weekly synthesis, deduplicates movements and retains seven real dates and three areas', async () => {
		const c = await sample(),
			r = composeTrialReading(input(), c);
		expect(reviewReconstructedWeek(input(), c, r)).toEqual([]);
		expect(await approveTrialReading(input(), c, r)).not.toBeNull();
		expect(r.editorial!.selection).toHaveLength(5);
		expect(new Set(r.editorial!.selection.map((x) => x.factId)).size).toBe(5);
		expect(r.editorial!.plan.filter((x) => x.role.startsWith('week-day-'))).toHaveLength(7);
		expect(r.editorial!.plan.filter((x) => x.role === 'week-area')).toHaveLength(3);
		expect(new Set(r.sections.filter((s) => /^\d\d\//.test(s.title)).map((s) => s.text)).size).toBe(
			7
		);
		const covered = new Set(r.sections.flatMap((s) => s.factIds));
		expect(c.facts.every((f) => covered.has(f.id))).toBe(true);
	});
	it('changes editorial priorities with context while preserving actual geometry', async () => {
		const c = await sample(),
			v = input(
				'Fuso atual declarado: America/Sao_Paulo (não usado para calcular dias locais).\nTema escolhido: Relações e acordos.\n\nContexto declarado: Quero negociar os acordos com minha parceira.'
			),
			b = await calculateTrial(v, runId);
		expect(b.data.contacts).toEqual(c.data.contacts);
		expect(b.data.days).toEqual(c.data.days);
		const aReading = composeTrialReading(input(), c),
			bReading = composeTrialReading(v, b);
		expect(aReading.editorial!.selection.map((x) => x.factId)).not.toEqual(
			bReading.editorial!.selection.map((x) => x.factId)
		);
		expect(aReading.practice).not.toBe(bReading.practice);
		expect(parseWorkflowInput(v)).not.toBeNull();
		expect(new Set(bReading.sections.map((s) => s.title)).size).toBe(bReading.sections.length);
		expect(new Set(bReading.sections.map((s) => s.text)).size).toBe(bReading.sections.length);
		expect(await approveTrialReading(v, b, bReading)).not.toBeNull();
	}, 25000);
	it('changes contacts with period and natal chart, beyond changing labels', async () => {
		const c = await sample(),
			later = await calculateTrial({ ...input(), targetDate: '2027-02-14' }, runId);
		const other = await calculateTrial(
			{
				...input(),
				birth: {
					...input().birth!,
					localDateTime: '1985-06-19T18:00:00',
					utcInstant: '1985-06-19T18:00:00Z'
				}
			},
			runId
		);
		expect(later.data.contacts).not.toEqual(c.data.contacts);
		expect(other.data.contacts).not.toEqual(c.data.contacts);
		expect(other.data.positions).not.toEqual(c.data.positions);
		expect(composeTrialReading(input(), c).sections[0].text).not.toBe(
			composeTrialReading({ ...input(), targetDate: '2027-02-14' }, later).sections[0].text
		);
	}, 25000);
	it('rejects tampered search, day positions, contact timing, source, context and edited reading', async () => {
		const c = await sample();
		for (const mutate of [
			(v: CalculationSnapshot) => {
				(v.data.contacts as WeekContact[])[0].minOrb += 0.1;
			},
			(v: CalculationSnapshot) => {
				(v.data.days as WeekDay[])[0].positions[0].longitude += 1;
			},
			(v: CalculationSnapshot) => {
				((v.data.base as CalculationSnapshot).data.rows as number[][])[0][0] += 1;
			},
			(v: CalculationSnapshot) => {
				v.facts[0].source = 'invented';
			}
		]) {
			const changed = structuredClone(c);
			mutate(changed);
			expect(() => composeTrialReading(input(), changed)).toThrow();
		}
		expect(() => composeTrialReading(input('Outro contexto não calculado.'), c)).toThrow();
		const r = composeTrialReading(input(), c);
		r.sections[0].text += ' Ganho garantido.';
		expect(await approveTrialReading(input(), c, r)).toBeNull();
	});
	it('draws natal and seven actual noon skies with only saved fact links', async () => {
		const c = await sample(),
			r = composeTrialReading(input(), c),
			approval = await approveTrialReading(input(), c, r);
		const saved: SavedTrial = {
			id: runId,
			product_id: 'week-reading',
			created_at: '2026-10-08T12:00:00Z',
			input: input(),
			calculation: c,
			reading: r,
			approval: approval!
		};
		const known = new Set(c.facts.map((f) => f.id));
		const skies = [];
		for (let weekDay = 0; weekDay < 7; weekDay++) {
			const scene = buildChartScene(saved, { weekDay });
			expect(scene.markers).toHaveLength(20);
			expect(scene.nodes.filter((n) => n.factId).every((n) => known.has(n.factId!))).toBe(true);
			skies.push(scene.markers.filter((m) => m.body.startsWith('sample:')).map((m) => m.longitude));
		}
		expect(skies[0]).not.toEqual(skies[6]);
	});
	it('exports the full approved reading and its calculated map for visual QA', async () => {
		const c = await sample(),
			r = composeTrialReading(input(), c),
			approval = await approveTrialReading(input(), c, r);
		const s: SavedTrial = {
			id: runId,
			product_id: 'week-reading',
			created_at: '2026-10-08T12:00:00Z',
			input: input(),
			calculation: c,
			reading: r,
			approval: approval!
		};
		const { trialPdf } = await import('../pdf'),
			{ PDFDocument } = await import('pdf-lib');
		const pdf = await trialPdf(s),
			document = await PDFDocument.load(pdf);
		expect(document.getPageCount()).toBeGreaterThanOrEqual(6);
		const dir = process.env.ATV_RECONSTRUCTION_QA_DIR;
		if (dir) {
			await mkdir(dir, { recursive: true });
			await writeFile(join(dir, 'week-reading.pdf'), pdf);
			await writeFile(join(dir, 'week-reading.json'), JSON.stringify(s, null, 2));
			await writeFile(
				join(dir, 'week-reading-review.txt'),
				[
					r.title,
					r.opening,
					...r.sections.map((s) => s.title + '\n' + s.text),
					r.practice,
					r.source,
					...r.limits
				].join('\n\n')
			);
		}
	});
	it('reviews twelve contrasting natal, period and context cases without replacing personal acceptance', async () => {
		const cases = [];
		for (let i = 0; i < 12; i++) {
			const value = input(
				[
					'Quero organizar as prioridades de trabalho.',
					'Quero compreender meus acordos de relacionamento.',
					'Quero acompanhar um projeto de estudo.'
				][i % 3]
			);
			value.birth = {
				...value.birth!,
				localDateTime: `${1980 + i * 2}-${String(i + 1).padStart(2, '0')}-15T12:00:00`,
				utcInstant: `${1980 + i * 2}-${String(i + 1).padStart(2, '0')}-15T12:00:00Z`,
				latitude: i % 2 ? -23.55 : 40.71,
				longitude: i % 2 ? -46.63 : -74.01
			};
			value.targetDate = `2026-${String(i + 1).padStart(2, '0')}-08`;
			const calculation = await calculateTrial(value, runId),
				reading = composeTrialReading(value, calculation);
			expect(reviewReconstructedWeek(value, calculation, reading)).toEqual([]);
			expect(parseWorkflowInput(value)).not.toBeNull();
			expect(new Set(reading.sections.map((s) => s.title)).size).toBe(reading.sections.length);
			expect(new Set(reading.sections.map((s) => s.text)).size).toBe(reading.sections.length);
			expect(await approveTrialReading(value, calculation, reading)).not.toBeNull();
			cases.push({
				input: value,
				selection: reading.editorial!.selection,
				sections: reading.sections.filter((s) => s.title !== 'Referências desta leitura')
			});
		}
		expect(
			new Set(cases.map((c) => c.selection.map((x) => x.factId).join(','))).size
		).toBeGreaterThanOrEqual(10);
		if (process.env.ATV_RECONSTRUCTION_QA_DIR)
			await writeFile(
				join(process.env.ATV_RECONSTRUCTION_QA_DIR, 'week-contrasting-cases.json'),
				JSON.stringify(cases, null, 2)
			);
	}, 120000);
});
