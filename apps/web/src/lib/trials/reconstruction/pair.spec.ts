import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { BirthInput, CalculationSnapshot, WorkflowInput } from '@atv/domain';
import { calculateTrial } from '../../server/trial-calculation';
import { approveTrialReading, composeTrialReading, type SavedTrial } from '../reading';
import { latestReadingVersion } from '../versions';
import { assertPairProjection, PAIR_VERSION, type PairPerson } from './pair-facts';
import { reviewReconstructedPair } from './pair';

const runId = '00000000-0000-4000-8000-000000000095';
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
	productId: 'pair-preview',
	birth: birth('2000-01-01T12:00:00'),
	partner: birth('2001-07-12T07:00:00'),
	context,
	consent: { storage: true, partner: true, continuity: false, policyVersion: 'atv-input-consent/1' }
});
const people = (c: CalculationSnapshot) => [c.data.first, c.data.second] as PairPerson[];
const interpretation = (c: CalculationSnapshot, value: WorkflowInput) =>
	composeTrialReading(value, c)
		.sections.filter((s) => !/^Referências/.test(s.title))
		.map((s) => s.text)
		.join('\n\n');

describe('Preview do Par — three factors and a first conversation', () => {
	function duplicates(reading: ReturnType<typeof composeTrialReading>) {
		const seen = new Set<string>();
		return reading.sections
			.filter((s) => !/^Referências/.test(s.title))
			.flatMap((s) => s.text.split(/(?<=[.!?])\s+/))
			.map((s) => s.trim())
			.filter((s) => {
				if (s.length <= 100) return false;
				const old = seen.has(s);
				seen.add(s);
				return old;
			});
	}
	it('projects six exact, role-bound factors from two full natal sources, without scoring the couple', async () => {
		const value = input(),
			c = await calculateTrial(value, runId);
		expect(c.version).toBe(PAIR_VERSION);
		expect(c.facts).toHaveLength(6);
		const sources = c.data.sources as CalculationSnapshot[];
		for (const [i, person] of people(c).entries()) {
			const positions = sources[i].data.positions as { body: string; longitude: number }[];
			for (const point of person.points) {
				const longitude =
					point.factor === 'ascendant'
						? (sources[i].data.angles as { ascendant: number }).ascendant
						: positions.find((p) => p.body === point.factor)!.longitude;
				expect(point.longitude).toBe(longitude);
				expect(point.sign).toBe(Math.floor(longitude / 30));
				expect(point.factId).toBe(`person-${i === 0 ? 'a' : 'b'}-${point.factor}`);
			}
		}
		expect(c.data.aspects).toEqual([]);
		expect(c.data.compatibilityScore).toBeNull();
		expect(c.data.sharing).toBe('not-authorized');
		expect(() => assertPairProjection(value, c)).not.toThrow();
	});
	it('rejects a factor, source input, role or consent altered after calculation', async () => {
		const value = input(),
			c = await calculateTrial(value, runId);
		for (const alter of [
			(x: CalculationSnapshot) => {
				people(x)[0].points[0].longitude += 1;
			},
			(x: CalculationSnapshot) => {
				(x.data.sourceInputs as BirthInput[])[1].latitude = 1;
			},
			(x: CalculationSnapshot) => {
				people(x)[1].role = 'person-a';
			}
		]) {
			const changed = structuredClone(c);
			alter(changed);
			expect(() => assertPairProjection(value, changed)).toThrow();
		}
		expect(() =>
			assertPairProjection({ ...value, consent: { ...value.consent, partner: false } }, c)
		).toThrow();
	});
	it('changes the conclusion and care comparison when only the second birth changes', async () => {
		const a = input(),
			b = { ...a, partner: birth('2001-07-21T07:00:00') };
		const ca = await calculateTrial(a, runId),
			cb = await calculateTrial(b, runId);
		expect(people(ca)[0].points).toEqual(people(cb)[0].points);
		expect(people(ca)[1].points.find((p) => p.factor === 'sun')!.sign).toBe(
			people(cb)[1].points.find((p) => p.factor === 'sun')!.sign
		);
		expect(composeTrialReading(a, ca).sections[2].text).not.toBe(
			composeTrialReading(b, cb).sections[2].text
		);
		expect(composeTrialReading(a, ca).sections[0].text).not.toBe(
			composeTrialReading(b, cb).sections[0].text
		);
	});
	it('preserves geometry while a declared decision or autonomy changes focus and practice', async () => {
		const a = input('Estamos decidindo se vamos morar juntos.'),
			b = input('Preciso de espaço e autonomia dentro da relação.');
		const ca = await calculateTrial(a, runId),
			cb = await calculateTrial(b, runId),
			ra = composeTrialReading(a, ca),
			rb = composeTrialReading(b, cb);
		expect(people(ca).map((p) => p.points)).toEqual(people(cb).map((p) => p.points));
		expect(ra.editorial!.selection[0].factId).toBe('person-a-sun');
		expect(rb.editorial!.selection[0].factId).toBe('person-a-ascendant');
		expect(ra.sections[0].text).not.toBe(rb.sections[0].text);
		expect(ra.practice).not.toBe(rb.practice);
		expect(
			ra.sections.find((s) => s.title === 'Um próximo passo para a situação informada')!.text
		).toContain(a.context);
		expect(await approveTrialReading(a, ca, ra)).not.toBeNull();
	});
	it('handles identical charts without inventing a difference or duplicating long passages', async () => {
		const value = input();
		value.partner = structuredClone(value.birth);
		const c = await calculateTrial(value, runId),
			r = composeTrialReading(value, c);
		expect(duplicates(r)).toEqual([]);
		expect(reviewReconstructedPair(value, c, r)).toEqual([]);
		expect(r.sections[0].text).not.toContain('diferença anterior');
		expect(await approveTrialReading(value, c, r)).not.toBeNull();
	});
	it('keeps the introductory contract and rejects a transplanted or edited reading', async () => {
		const value = input('Nós moramos em cidades distantes.'),
			c = await calculateTrial(value, runId),
			r = composeTrialReading(value, c);
		expect(reviewReconstructedPair(value, c, r)).toEqual([]);
		expect(r.sections).toHaveLength(7);
		expect(r.version).toBe(latestReadingVersion(value.productId));
		expect(r.sections.slice(0, -1).every((s) => s.factIds.length >= 2)).toBe(true);
		expect(interpretation(c, value)).not.toMatch(
			/percentual de compatibilidade|alma gêmea|Vênus em|Marte em|trígono|quadratura/
		);
		const approval = await approveTrialReading(value, c, r);
		expect(approval).not.toBeNull();
		const edited = structuredClone(r);
		edited.sections[0].text += ' Vocês são destinados a ficar juntos.';
		expect(await approveTrialReading(value, c, edited)).toBeNull();
		const other = { ...value, partner: birth('1998-10-08T05:00:00') };
		expect(await approveTrialReading(other, await calculateTrial(other, runId), r)).toBeNull();
		const dir = process.env.ATV_RECONSTRUCTION_QA_DIR;
		if (dir) {
			const saved: SavedTrial = {
				id: runId,
				product_id: value.productId,
				created_at: '2026-10-08T12:00:00Z',
				input: value,
				calculation: c,
				reading: r,
				approval: approval!
			};
			const { trialPdf } = await import('../pdf');
			const { PDFDocument } = await import('pdf-lib');
			const pdf = await trialPdf(saved);
			expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThan(1);
			await mkdir(dir, { recursive: true });
			await writeFile(join(dir, 'pair-reading.pdf'), pdf);
			await writeFile(join(dir, 'pair-reading.json'), JSON.stringify(saved, null, 2));
			await writeFile(
				join(dir, 'pair-reading-review.txt'),
				[
					r.title,
					r.opening,
					...r.sections.map((s) => s.title + '\n' + s.text),
					r.questions.join('\n'),
					r.practice,
					r.source,
					...r.limits
				].join('\n\n')
			);
		}
	});
	it('does not compose an incomplete birth or manufacture an unavailable Ascendant', async () => {
		const value = input();
		value.partner = { ...value.partner!, latitude: 89 };
		await expect(calculateTrial(value, runId)).rejects.toThrow(/Ascendente/);
		const missing = input();
		delete missing.partner;
		await expect(calculateTrial(missing, runId)).rejects.toThrow();
	});
});
