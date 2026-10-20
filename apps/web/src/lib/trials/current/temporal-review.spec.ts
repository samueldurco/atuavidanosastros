import { describe, expect, it } from 'vitest';
import type { WorkflowInput } from '@atv/domain';
import { calculateTrial } from '../../server/trial-calculation';
import { approveTrialReading, composeTrialReading } from '../reading';
import { reviewCurrentReading } from './index';
import { temporalNatalModifier, temporalNarrative, temporalSharedTarget } from './temporal-canon';
import { careerAspectNuance } from './temporal-career';

describe('current periods without an optional personal context', () => {
	it('approves a calculated date with no contacts without inventing significance', async () => {
		const input: WorkflowInput = {
			version: 'atv-workflow/1.0.0',
			productId: 'date-reading',
			birth: {
				localDateTime: '1953-09-06T12:00:00',
				utcInstant: '1953-09-06T12:00:00Z',
				timezone: 'UTC',
				latitude: 0,
				longitude: 0,
				locationSource: 'synthetic'
			},
			targetDate: '2026-08-20',
			consent: {
				storage: true,
				partner: false,
				continuity: false,
				policyVersion: 'atv-input-consent/1'
			}
		};
		const calculation = await calculateTrial(input, '00000000-0000-4000-8000-000000004204');
		expect((calculation.data.transitGeometry as { aspects: unknown[] }).aspects).toEqual([]);
		const reading = composeTrialReading(input, calculation);
		expect(reading.sections[0].text).toContain('orbe de 2° dos cinco aspectos considerados');
		expect(reading.sections[0].text).toContain('não descreve como será a data');
		expect(reading.interpretation!.conclusions).toHaveLength(1);
		const conclusion = reading.interpretation!.conclusions[0];
		expect(reading.sections[conclusion.section].text).toContain(conclusion.claim);
		expect(conclusion.factIds).toHaveLength(21);
		expect(conclusion.factIds).toEqual(
			expect.arrayContaining([
				'sample-instant',
				'sample-sun',
				'sample-moon',
				'position-sun',
				'position-moon'
			])
		);
		expect(reviewCurrentReading(calculation, reading)).toEqual([]);
		expect(await approveTrialReading(input, calculation, reading)).not.toBeNull();

		const inventedMeaning = structuredClone(reading);
		inventedMeaning.sections[0].text = 'A ausência de contatos garante uma data tranquila.';
		inventedMeaning.interpretation!.conclusions[0].claim = inventedMeaning.sections[0].text;
		expect(await approveTrialReading(input, calculation, inventedMeaning)).toBeNull();

		const unsupported = structuredClone(reading);
		unsupported.interpretation!.conclusions = [];
		expect(await approveTrialReading(input, calculation, unsupported)).toBeNull();

		const inventedContact = structuredClone(calculation);
		(inventedContact.data.transitGeometry as { aspects: unknown[] }).aspects.push({
			first: 'sun',
			second: 'sun',
			kind: 'conjunction',
			orbDegrees: 0
		});
		expect(() => composeTrialReading(input, inventedContact)).toThrow(
			'Relações da data sem correspondência'
		);
		expect(await approveTrialReading(input, inventedContact, reading)).toBeNull();
	});
	it('does not label a conjunction and a sextile as two easy openings', () => {
		const meaning = temporalSharedTarget(
			{ id: 'pluto-neptune', transit: 'pluto', natal: 'neptune', aspect: 'conjunction', orb: 1 },
			{ id: 'neptune-neptune', transit: 'neptune', natal: 'neptune', aspect: 'sextile', orb: 1 },
			{ body: 'neptune', longitude: 303, sign: 10, house: 10, retrograde: false, factId: 'neptune' }
		);
		expect(meaning!.claim).toContain('conjunção de Plutão concentra');
		expect(meaning!.claim).toContain('intensidade precisa ser distinguida');
		expect(meaning!.claim).not.toContain('duas aberturas');
	});
	it('develops each contact without repeating an already explained natal response', () => {
		const narrate = temporalNarrative();
		const sun = {
			body: 'sun' as const,
			longitude: 280,
			sign: 9,
			house: 10,
			retrograde: false,
			factId: 'planet-sun'
		};
		const saturn = narrate(
			{ id: 'saturn-sun', transit: 'saturn', natal: 'sun', aspect: 'square', orb: 1 },
			sun
		);
		const mars = narrate(
			{ id: 'mars-sun', transit: 'mars', natal: 'sun', aspect: 'opposition', orb: 1 },
			sun
		);
		const venus = narrate(
			{ id: 'venus-sun', transit: 'venus', natal: 'sun', aspect: 'trine', orb: 1 },
			sun
		);
		expect(saturn.text).toContain('Sol natal em Capricórnio');
		expect(mars.text).not.toContain('Sol natal em Capricórnio');
		expect(mars.claim).not.toBe(saturn.claim);
		expect(mars.factIds).toEqual(['mars-sun', 'planet-sun']);
		expect(venus.text).toContain('Sol natal em Capricórnio');
		expect(
			temporalNarrative()(
				{ id: 'saturn-sun', transit: 'saturn', natal: 'sun', aspect: 'square', orb: 1 },
				sun
			).text
		).toBe(saturn.text);
	});
	it('house areas retain grammatical articles without invalid concatenations', () => {
		for (let house = 1; house <= 12; house++) {
			const text = temporalNatalModifier(
				{ body: 'moon', longitude: 0, sign: 0, house, retrograde: false, factId: 'moon' },
				'square'
			);
			expect(text).toContain(`Na casa ${house}`);
			expect(text).not.toMatch(/(?:^|\s)(?:a a|a os|em a|em as|em os|de a|de as)(?=\s|[.,;:!?]|$)/);
		}
	});
	it.each(['personal-calendar', 'career-forecast-30d', 'solar-return'] as const)(
		'%s retains supported, distinct sections',
		async (productId) => {
			const input: WorkflowInput = {
				version: 'atv-workflow/1.0.0',
				productId,
				targetDate: productId === 'solar-return' ? '2026-01-01' : '2026-10-15',
				...(productId === 'solar-return'
					? {
							returnYear: 2026,
							returnLocation: {
								city: 'São Paulo',
								timezone: 'America/Sao_Paulo',
								latitude: -23.55,
								longitude: -46.63,
								locationSource: 'synthetic-return'
							}
						}
					: { forecastPeriod: 'rolling-30-days' as const }),
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
			};
			const calculation = await calculateTrial(input, '00000000-0000-4000-8000-000000000195');
			const reading = composeTrialReading(input, calculation);
			const completeText = reading.sections.map((section) => section.text).join('\n\n');
			if (productId === 'career-forecast-30d') {
				for (const aspect of ['conjunction', 'opposition', 'square', 'trine', 'sextile'] as const) {
					const occurrences = completeText.split(careerAspectNuance(aspect)).length - 1;
					expect(occurrences, aspect).toBeLessThanOrEqual(1);
				}
				expect(completeText).toContain(careerAspectNuance('sextile'));
				expect(completeText).toContain(careerAspectNuance('trine'));
			}
			if (productId === 'solar-return') {
				expect(completeText.split('A intimidade não exige exposição total').length - 1).toBe(1);
			}
			expect(reading.limits.join(' ')).not.toMatch(/Gauntlet|brackets|bisseção|candidata/);
			const report = {
				review: reviewCurrentReading(calculation, reading),
				sections: reading.sections.length,
				withoutFacts: reading.sections.filter((s) => !s.factIds.length).map((s) => s.title),
				duplicateTitles: reading.sections
					.filter((s, i, ss) => ss.findIndex((t) => t.title === s.title) !== i)
					.map((s) => s.title),
				duplicateTexts: reading.sections
					.filter((s, i, ss) => ss.findIndex((t) => t.text === s.text) !== i)
					.map((s) => s.title),
				payloadLength: JSON.stringify({ input, calculation, reading }).length
			};
			expect(
				await approveTrialReading(input, calculation, reading),
				JSON.stringify(report)
			).not.toBeNull();
		},
		60000
	);
});
