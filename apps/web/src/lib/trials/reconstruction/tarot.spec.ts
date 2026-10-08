import { describe, expect, it } from 'vitest';
import { calculateTarotMethod, tarotMethods, type WorkflowInput } from '@atv/domain';
import { approveTrialReading, composeTrialReading } from '../reading';
import { reviewReconstructedTarot } from './tarot';
import { tarotCanon } from './tarot-canon';

const run = '00000000-0000-4000-8000-000000000001';
const input = (productId: string, focus?: string): WorkflowInput => ({
	version: 'atv-workflow/1.0.0',
	productId,
	...(focus ? { focus } : {}),
	consent: {
		storage: true,
		partner: false,
		continuity: false,
		policyVersion: 'atv-input-consent/1'
	}
});
const calculate = (value: WorkflowInput, id = run) =>
	calculateTarotMethod(value, id, AbortSignal.timeout(10000));

describe('complete reconstructed Tarot methods', () => {
	it('has 78 distinct meanings with original corpus provenance', () => {
		expect(Object.keys(tarotCanon)).toHaveLength(78);
		expect(new Set(Object.values(tarotCanon).map((c) => c.core)).size).toBe(78);
		expect(
			Object.values(tarotCanon).every(
				(c) => c.name && c.resource && c.excess && c.action && c.sourceLine > 0
			)
		).toBe(true);
	});
	for (const method of tarotMethods) {
		it(`${method.name}: complete approved reading without a required focus`, async () => {
			const value = input(method.id),
				calculation = await calculate(value),
				reading = composeTrialReading(value, calculation);
			expect(reading.sections.length).toBeGreaterThanOrEqual(method.positions.length + 3);
			expect(reviewReconstructedTarot(value, calculation, reading)).toEqual([]);
			expect((await approveTrialReading(value, calculation, reading))?.status).toBe('approved');
			expect(reading.sections.filter((s) => /^\d+\. /.test(s.title)).map((s) => s.title)).toEqual(
				method.positions.map((p, i) => expect.stringContaining(`${i + 1}. ${p.name}`))
			);
			expect(composeTrialReading(value, await calculate(value))).toEqual(reading);
		});
	}
	it('changes interpretation, synthesis and application when focus changes, preserving the draw', async () => {
		for (const method of tarotMethods) {
			const work = input(method.id, 'Organizar uma entrega no trabalho em equipe.'),
				love = input(method.id, 'Conversar sobre os acordos do relacionamento.');
			const a = await calculate(work),
				b = await calculate(love);
			expect(a.data.cards).toEqual(b.data.cards);
			const x = composeTrialReading(work, a),
				y = composeTrialReading(love, b);
			expect(x.editorial?.context.key).not.toBe(y.editorial?.context.key);
			expect(x.sections[0]?.text).not.toBe(y.sections[0]?.text);
			expect(x.sections.map((s) => s.text)).not.toEqual(y.sections.map((s) => s.text));
			expect(reviewReconstructedTarot(work, a, x)).toEqual([]);
			expect(reviewReconstructedTarot(love, b, y)).toEqual([]);
		}
	});
	it('does not transplant a synthesis to a different draw or omit a position', async () => {
		for (const method of tarotMethods) {
			const value = input(method.id),
				a = await calculate(value),
				b = await calculate(value, '00000000-0000-4000-8000-000000000002');
			const x = composeTrialReading(value, a),
				y = composeTrialReading(value, b);
			expect(x.sections[0]?.text).not.toBe(y.sections[0]?.text);
			const transplanted = structuredClone(y);
			transplanted.sections[0] = structuredClone(x.sections[0]!);
			expect(await approveTrialReading(value, b, transplanted)).toBeNull();
			const incomplete = structuredClone(a);
			(incomplete.data.cards as unknown[]).pop();
			expect(() => composeTrialReading(value, incomplete)).toThrow();
			const repeated = structuredClone(x);
			repeated.practice = repeated.sections[0]!.text;
			expect(reviewReconstructedTarot(value, a, repeated)).toContain('repeated-sentence');
			const shortRepeated = structuredClone(x);
			const boilerplate = 'A resposta real pode confirmar, alterar ou rejeitar a hipótese.';
			shortRepeated.sections[1]!.text += ` ${boilerplate}`;
			shortRepeated.sections[2]!.text += ` ${boilerplate}`;
			expect(reviewReconstructedTarot(value, a, shortRepeated)).toContain('repeated-sentence');
		}
	});
	it('keeps complete distinct interpretations across varied draws and optional contexts', async () => {
		const focuses = [
			undefined,
			'Conversar sobre os acordos do relacionamento.',
			'Organizar uma entrega no trabalho.',
			'Rever os gastos e os recursos disponíveis.',
			'Escolher um estudo e uma formação.',
			'Mudar uma rotina nesta transição.',
			'Organizar o trabalho independente.',
			'Coordenar uma equipe com responsabilidades claras.'
		];
		for (const method of tarotMethods) {
			const syntheses = new Set<string>();
			for (const [index, focus] of focuses.entries()) {
				const value = input(method.id, focus);
				const calculation = await calculate(
					value,
					`00000000-0000-4000-8000-${String(index + 10).padStart(12, '0')}`
				);
				const reading = composeTrialReading(value, calculation);
				expect(
					reviewReconstructedTarot(value, calculation, reading),
					`${method.id}/${index}`
				).toEqual([]);
				expect(
					(await approveTrialReading(value, calculation, reading))?.status,
					`${method.id}/${index}`
				).toBe('approved');
				syntheses.add(reading.sections[0]!.text);
			}
			expect(syntheses.size).toBe(focuses.length);
		}
	});
	it('reads all twelve symbolic axes and the thirteenth center without claiming a natal chart', async () => {
		const value = input('tarot-astrological-mandala'),
			calculation = await calculate(value),
			reading = composeTrialReading(value, calculation);
		const positions = reading.sections.filter((s) => /^\d+\. /.test(s.title));
		expect(positions).toHaveLength(13);
		expect(positions.slice(0, 12).every((s) => s.factIds.length === 2)).toBe(true);
		expect(reading.sections[0]!.text).toMatch(/centro|central/i);
		expect(reading.limits.join(' ')).toMatch(/simbólic/i);
	});
});
