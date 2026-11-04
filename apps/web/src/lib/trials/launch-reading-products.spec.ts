import { beforeAll, describe, expect, it } from 'vitest';
import type { LaunchInput } from '@atv/domain';
import { calculateLaunchFacts, type LaunchFactCalculation } from '../server/launch-calculation';
import { composeLaunchReading, evaluateLaunchReading, type LaunchReading } from './launch-reading';
import {
	launchExampleBirth,
	launchExampleExecutionId,
	launchExampleInputs
} from './launch-reading.fixtures';

describe('P02 distinct additional editorial methods', () => {
	const examples = launchExampleInputs.slice(3);
	const artifacts = new Map<
		string,
		{ input: LaunchInput; facts: LaunchFactCalculation; reading: LaunchReading }
	>();
	beforeAll(async () => {
		for (const [index, input] of examples.entries()) {
			const facts = await calculateLaunchFacts(input, launchExampleExecutionId(index + 3));
			artifacts.set(input.productId, {
				input,
				facts,
				reading: await composeLaunchReading(input, facts)
			});
		}
	});
	it('conversation displays Brazilian dates while rejecting a changed displayed day', async () => {
		const original = artifacts.get('conversation-timing')!;
		const first = original.reading.sections.find((section) => section.id === 'conversation-day-1')!;
		expect(first.title).toBe('01/11/2026: falar ou esperar depende das condições');
		expect(first.paragraphs[0]).toContain('01/11/2026: quatro amostras');
		expect(
			original.reading.sections.flatMap((section) => section.paragraphs).join(' ')
		).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
		const mutated = structuredClone(original.reading);
		const changed = mutated.sections.find((section) => section.id === 'conversation-day-1')!;
		changed.title = changed.title.replace('01/11/2026', '02/11/2026');
		changed.paragraphs = changed.paragraphs.map((paragraph) =>
			paragraph.replaceAll('01/11/2026', '02/11/2026')
		);
		const review = await evaluateLaunchReading(original.input, original.facts, mutated);
		expect(review.status).toBe('REJECTED');
		expect(review.checks.find((check) => check.id === 'daily-conversation-meaning')?.passed).toBe(
			false
		);
	});

	for (const input of examples)
		it(`${input.productId} has a complete private candidate, own method and actual semantic support`, async () => {
			const artifact = artifacts.get(input.productId)!;
			const review = await evaluateLaunchReading(input, artifact.facts, artifact.reading);
			expect(review.status, JSON.stringify(review.reasons)).toBe('APPROVED_FOR_PRIVATE_TEST');
			expect(review.provenance.commercialPrecisionApproved).toBe(false);
			expect(review.provenance.commercialReleaseApproved).toBe(false);
			expect(artifact.reading.provenance.externalModelCalled).toBe(false);
			expect(new Set(artifact.reading.sections.flatMap((s) => s.paragraphs)).size).toBe(
				artifact.reading.sections.flatMap((s) => s.paragraphs).length
			);
		});

	it('changes actual hypotheses under a valid different natal chart and rejects a transplant', async () => {
		const original = artifacts.get('sexuality-map')!;
		const changed: LaunchInput = {
			...original.input,
			birth: {
				...launchExampleBirth,
				localDateTime: '1992-01-20T10:30:00',
				utcInstant: '1992-01-20T12:30:00Z'
			}
		};
		const facts = await calculateLaunchFacts(changed, original.facts.executionId),
			reading = await composeLaunchReading(changed, facts);
		expect(reading.claims.find((c) => c.id === 'claim-function-venus')?.interpretation).not.toBe(
			original.reading.claims.find((c) => c.id === 'claim-function-venus')?.interpretation
		);
		expect((await evaluateLaunchReading(changed, facts, reading)).status).toBe(
			'APPROVED_FOR_PRIVATE_TEST'
		);
		const transplant = structuredClone(original.reading);
		transplant.inputDigest = facts.inputDigest;
		const rejected = await evaluateLaunchReading(changed, facts, transplant);
		expect(rejected.checks.find((c) => c.id === 'function-specific-semantics')?.passed).toBe(false);
	});

	it('rejects a wrong natal function despite preserved longitude, IDs and visible claim', async () => {
		const original = artifacts.get('intimacy-map')!,
			mutated = structuredClone(original.reading),
			c = mutated.claims.find((c) => c.id === 'claim-function-venus')!;
		const previous = c.interpretation;
		c.interpretation =
			'Vênus representa somente disciplina e obrigação; o desejo declarado deve ser ignorado para manter a rotina.';
		const section = mutated.sections.find((s) => s.id === c.sectionId)!;
		section.paragraphs[section.paragraphs.indexOf(previous)] = c.interpretation;
		const review = await evaluateLaunchReading(original.input, original.facts, mutated);
		expect(review.status).toBe('REJECTED');
		expect(review.checks.find((c) => c.id === 'function-specific-semantics')?.passed).toBe(false);
	});

	it('changes the intimacy decision when wish and boundary change without changing geometry', async () => {
		const original = artifacts.get('intimacy-map')!,
			changed: LaunchInput = {
				...original.input,
				answers: {
					...original.input.answers,
					wish: 'Adiar a aproximação e conversar em outro encontro.',
					boundaries: 'Não quero proximidade física agora.'
				}
			};
		const facts = await calculateLaunchFacts(changed, original.facts.executionId),
			reading = await composeLaunchReading(changed, facts);
		expect((facts.data.natal as { positions: unknown }).positions).toEqual(
			(original.facts.data.natal as { positions: unknown }).positions
		);
		expect(reading.practicalAction).not.toBe(original.reading.practicalAction);
		expect(reading.practicalAction).toContain('Não quero proximidade física agora.');
		expect((await evaluateLaunchReading(changed, facts, reading)).status).toBe(
			'APPROVED_FOR_PRIVATE_TEST'
		);
	});

	it('does not invent a shared talent or clothing absent from the inventory', async () => {
		for (const [id, answers, explanation] of [
			[
				'hidden-talent-map',
				{ favors: ['Pedem que eu conserte uma torneira.', 'Pedem que eu cuide de uma planta.'] },
				'padrão comum'
			],
			[
				'ascendant-style',
				{ wardrobe: ['Lenço verde', 'Anel prateado', 'Bolsa azul'] },
				'três combinações'
			]
		] as const) {
			const original = artifacts.get(id)!,
				changed: LaunchInput = {
					...original.input,
					answers: {
						...original.input.answers,
						...('wardrobe' in answers
							? { wardrobe: [...answers.wardrobe] }
							: { favors: [...answers.favors] })
					}
				};
			const facts = await calculateLaunchFacts(changed, original.facts.executionId),
				reading = await composeLaunchReading(changed, facts),
				review = await evaluateLaunchReading(changed, facts, reading);
			expect(review.status).toBe('REJECTED');
			expect(review.reasons.join(' ')).toContain(explanation);
			if (id === 'ascendant-style')
				expect(reading.sections.some((s) => s.id.startsWith('outfit-'))).toBe(false);
		}
	});

	it('financial roles depend on the actual draw and contextual experiment', async () => {
		const original = artifacts.get('financial-blocks-tarot')!,
			changed: LaunchInput = {
				...original.input,
				answers: {
					...original.input.answers,
					impasse: 'Não sei esclarecer o escopo antes de combinar um preço.'
				}
			};
		const facts = await calculateLaunchFacts(changed, original.facts.executionId),
			reading = await composeLaunchReading(changed, facts);
		expect(facts.data.cards).toEqual(original.facts.data.cards);
		expect(reading.practicalAction).toContain('frase de escopo');
		expect(reading.practicalAction).not.toBe(original.reading.practicalAction);
		const mutated = structuredClone(reading),
			c = mutated.claims.find((c) => c.id === 'claim-financial-2')!,
			previous = c.interpretation;
		c.interpretation = 'Esta carta prova que a causa do impasse é um defeito interno seu.';
		const s = mutated.sections.find((s) => s.id === c.sectionId)!;
		s.paragraphs[s.paragraphs.indexOf(previous)] = c.interpretation;
		const review = await evaluateLaunchReading(changed, facts, mutated);
		expect(review.status).toBe('REJECTED');
		expect(review.checks.find((c) => c.id === 'financial-positional-meaning')?.passed).toBe(false);
	});

	it('conversation rejects contact ablation and an invented favorable hour', async () => {
		const original = artifacts.get('conversation-timing')!;
		const facts = structuredClone(original.facts),
			rows = facts.data.observations as { contacts: unknown[] }[];
		rows.find((row) => row.contacts.length)!.contacts.pop();
		expect(
			(await evaluateLaunchReading(original.input, facts, original.reading)).checks.find(
				(c) => c.id === 'seven-day-geometry'
			)?.passed
		).toBe(false);
		const mutated = structuredClone(original.reading);
		mutated.sections[0]!.paragraphs.push('O melhor horário é 18h e a resposta será favorável.');
		const review = await evaluateLaunchReading(original.input, original.facts, mutated);
		expect(review.status).toBe('REJECTED');
		expect(review.checks.find((c) => c.id === 'finite-editorial-surface')?.passed).toBe(false);
	});
});
