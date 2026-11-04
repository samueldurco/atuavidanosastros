import { beforeAll, describe, expect, it } from 'vitest';
import { LAUNCH_INPUT_VERSION, type LaunchInput, type MethodCard } from '@atv/domain';
import { calculateLaunchFacts, type LaunchFactCalculation } from '../server/launch-calculation';
import {
	canComposeLaunchReading,
	composeLaunchReading,
	evaluateLaunchReading,
	launchReadingDigest,
	LAUNCH_EDITORIAL_POLICY_VERSION,
	type LaunchReading
} from './launch-reading';

const consent = { storage: true, policyVersion: 'atv-launch-consent/1' } as const;
const base = { version: LAUNCH_INPUT_VERSION, consent };
const birth = {
	localDateTime: '1990-05-10T10:30:00',
	utcInstant: '1990-05-10T13:30:00Z',
	timezone: 'America/Sao_Paulo',
	latitude: -23.55,
	longitude: -46.63,
	locationSource: 'synthetic'
};
const executionId = '8c6d9da2-d296-4b63-a30c-42ec8762f48f';
const ex: LaunchInput = {
	...base,
	productId: 'ex-tarot',
	answers: {
		episode: 'Recebi uma mensagem depois de meses sem contato.',
		observedActions: 'Perguntou como estou.',
		question: 'Vale responder a esta mensagem?',
		boundaries: 'Não quero insistência nem conversa madrugada adentro.'
	}
};
const restart: LaunchInput = {
	...base,
	productId: 'love-restart-map',
	birth,
	answers: {
		startDate: '2026-11-01',
		situation: 'Quero conhecer novas pessoas depois de uma separação.',
		desiredChange: 'Experimentar um encontro sem apressar compromisso.',
		boundaries: 'Preservar minhas noites de descanso.'
	}
};
const option = (label: string, date: string) => ({
	...birth,
	label,
	city: 'Cidade fictícia',
	localDateTime: `${date}T10:30:00`,
	utcInstant: `${date}T13:30:00Z`
});
const wedding: LaunchInput = {
	...base,
	productId: 'wedding-date-map',
	answers: {
		ceremonies: [option('Opção A', '2027-03-20'), option('Opção B', '2027-04-17')],
		priorities: 'Cerimônia diurna com tempo para receber familiares.'
	}
};

describe('P02 E2 private editorial consistency', () => {
	let exFacts: LaunchFactCalculation, restartFacts: LaunchFactCalculation;
	let exReading: LaunchReading, restartReading: LaunchReading;
	beforeAll(async () => {
		exFacts = await calculateLaunchFacts(ex, executionId);
		restartFacts = await calculateLaunchFacts(restart, executionId);
		exReading = await composeLaunchReading(ex, exFacts);
		restartReading = await composeLaunchReading(restart, restartFacts);
	});

	it('binds canonical digests independently of key insertion order', async () => {
		expect(await launchReadingDigest({ z: 2, a: { b: 3, a: 4 } })).toBe(
			await launchReadingDigest({ a: { a: 4, b: 3 }, z: 2 })
		);
		expect(await launchReadingDigest([1, 2])).not.toBe(await launchReadingDigest([2, 1]));
	});

	it('approves the Ex positional and joint meanings with a concrete contextual response', async () => {
		const review = await evaluateLaunchReading(ex, exFacts, exReading);
		expect(review.status, JSON.stringify(review.reasons)).toBe('APPROVED_FOR_PRIVATE_TEST');
		expect(review.digest).toBe(await launchReadingDigest(exReading));
		expect(review.policyVersion).toBe(LAUNCH_EDITORIAL_POLICY_VERSION);
		expect(review.provenance).toMatchObject({
			scope: 'private-editorial-consistency',
			commercialPrecisionApproved: false,
			commercialReleaseApproved: false
		});
		expect(
			review.checks.find((check) => check.id === 'positional-semantic-dependency')?.passed
		).toBe(true);
		expect(exReading.practicalAction).toContain('pergunta curta sobre o motivo');
		expect(exFacts.data.drawStatus).toBe('UNPERSISTED'); // The API proves storage, never rewrites immutable facts.
	});

	it('changes the actual decision for pressure, keeping the same draw', async () => {
		const changed: LaunchInput = {
			...ex,
			answers: {
				...ex.answers,
				observedActions: 'Insistiu em receber uma resposta e desrespeitou minha pausa.'
			}
		};
		const facts = await calculateLaunchFacts(changed, executionId);
		const reading = await composeLaunchReading(changed, facts);
		expect(facts.data.cards).toEqual(exFacts.data.cards);
		expect(reading.practicalAction).toContain('Pause a resposta');
		expect(reading.practicalAction).not.toEqual(exReading.practicalAction);
		expect(reading.sections.find((part) => part.id === 'joint-reading')?.paragraphs).not.toEqual(
			exReading.sections.find((part) => part.id === 'joint-reading')?.paragraphs
		);
		expect((await evaluateLaunchReading(changed, facts, reading)).status).toBe(
			'APPROVED_FOR_PRIVATE_TEST'
		);
		const transplanted = structuredClone(exReading);
		transplanted.inputDigest = facts.inputDigest;
		const review = await evaluateLaunchReading(changed, facts, transplanted);
		expect(review.status).toBe('REJECTED');
		expect(review.checks.find((check) => check.id === 'context-changes-decision')?.passed).toBe(
			false
		);
	});

	it('changes position and combined hypotheses with an actual counterfactual draw', async () => {
		const facts = await calculateLaunchFacts(ex, '41d671a6-3287-4e65-aaed-57c66f471b4e');
		const reading = await composeLaunchReading(ex, facts);
		const original = exFacts.data.cards as MethodCard[],
			changed = facts.data.cards as MethodCard[];
		expect(changed.map((card) => card.cardId)).not.toEqual(original.map((card) => card.cardId));
		for (let index = 0; index < 3; index++)
			if (changed[index]!.cardId !== original[index]!.cardId)
				expect(reading.claims[index]!.interpretation).not.toBe(
					exReading.claims[index]!.interpretation
				);
		expect(reading.claims.find((claim) => claim.id === 'claim-joint')?.interpretation).not.toEqual(
			exReading.claims.find((claim) => claim.id === 'claim-joint')?.interpretation
		);
		expect((await evaluateLaunchReading(ex, facts, reading)).status).toBe(
			'APPROVED_FOR_PRIVATE_TEST'
		);
	});

	it('rejects wrong card meaning even with a freshly rebound digest and visible text', async () => {
		const altered = structuredClone(exReading);
		const claim = altered.claims.find((candidate) => candidate.id === 'claim-card-1')!;
		const old = claim.interpretation;
		claim.interpretation =
			'Esta carta significa que esperar em silêncio é sempre a melhor atitude para qualquer episódio.';
		altered.sections[0]!.paragraphs[altered.sections[0]!.paragraphs.indexOf(old)] =
			claim.interpretation;
		expect(await launchReadingDigest(altered)).not.toBe(await launchReadingDigest(exReading));
		const review = await evaluateLaunchReading(ex, exFacts, altered);
		expect(review.status).toBe('REJECTED');
		expect(
			review.checks.find((check) => check.id === 'positional-semantic-dependency')?.passed
		).toBe(false);
	});

	it('rejects missing factors, invented sources, swapped positions, missing chapters and mind-reading', async () => {
		const noCard = structuredClone(exFacts);
		(noCard.data.cards as MethodCard[]).pop();
		await expect(composeLaunchReading(ex, noCard)).rejects.toThrow('launch_ex_method_invalid');
		const swapped = structuredClone(exFacts);
		const cards = swapped.data.cards as MethodCard[];
		[cards[0], cards[1]] = [cards[1]!, cards[0]!];
		expect((await evaluateLaunchReading(ex, swapped, exReading)).status).toBe('REJECTED');
		for (const mutate of [
			(reading: LaunchReading) => reading.sections[0]!.sourceIds.push('invented-source'),
			(reading: LaunchReading) => {
				reading.sections = reading.sections.filter((part) => part.id !== 'card-position-2');
			},
			(reading: LaunchReading) => {
				reading.sections[0]!.paragraphs.push('Ele te ama e vai voltar para você.');
			},
			(reading: LaunchReading) => {
				reading.provenance.policyVersion = 'wrong-policy' as never;
			}
		]) {
			const altered = structuredClone(exReading);
			mutate(altered);
			expect((await evaluateLaunchReading(ex, exFacts, altered)).status).toBe('REJECTED');
		}
	});

	it('approves the actual 30-day calendar and three conditional scenarios without approving precision', async () => {
		const review = await evaluateLaunchReading(restart, restartFacts, restartReading);
		expect(review.status, JSON.stringify(review.reasons)).toBe('APPROVED_FOR_PRIVATE_TEST');
		expect(
			restartReading.sections.find((part) => part.id === 'thirty-day-calendar')?.paragraphs
		).toHaveLength(30);
		expect(restartReading.sections.filter((part) => part.id.startsWith('scenario-'))).toHaveLength(
			3
		);
		expect(
			new Set(
				restartReading.claims
					.filter((claim) => claim.rule === 'observed-transit-natal-relation')
					.map((claim) => claim.factors.natal)
			).size
		).toBe(3);
		expect(restartReading.limits.join(' ')).toContain(
			'bateria independente de precisão continua pendente'
		);
		expect(restartReading.practicalAction).toContain('ambiente ou convite de baixo compromisso');
		expect(restartReading.summary).toContain(
			'De 01/11/2026 às 00h00 até 01/12/2026 às 00h00 (UTC; o horário final não está incluído)'
		);
		expect(
			restartReading.sections.find((part) => part.id === 'thirty-day-calendar')!.paragraphs[0]
		).toMatch(/^01\/11\/2026 —/);
		const claim = restartReading.claims.find((item) => item.id === 'claim-movement-1')!;
		expect(claim.factors.instant).toMatch(/^2026-\d{2}-\d{2}T/);
		expect(claim.interpretation).toMatch(/\d{2}\/\d{2}\/2026 às \d{2}h\d{2} \(UTC\)/);
	});

	it('rejects changed displayed dates while the original UTC factors are preserved', async () => {
		const altered = structuredClone(restartReading);
		altered.summary = altered.summary.replace('01/12/2026', '02/12/2026');
		const claim = altered.claims.find((item) => item.id === 'claim-movement-1')!;
		const original = claim.interpretation;
		claim.interpretation = original.replace(/\d{2}\/\d{2}\/2026/, '31/12/2026');
		const part = altered.sections.find((item) => item.id === claim.sectionId)!;
		part.paragraphs[part.paragraphs.indexOf(original)] = claim.interpretation;
		const calendar = altered.sections.find((item) => item.id === 'thirty-day-calendar')!;
		calendar.paragraphs[0] = calendar.paragraphs[0]!.replace('01/11/2026', '02/11/2026');
		const review = await evaluateLaunchReading(restart, restartFacts, altered);
		expect(review.status).toBe('REJECTED');
		for (const id of [
			'exact-utc-observation-period',
			'transit-semantic-dependency',
			'complete-thirty-day-calendar'
		])
			expect(review.checks.find((item) => item.id === id)?.passed, id).toBe(false);
	});

	it('changes focus, selected functions and experiment for a different relationship situation', async () => {
		const changed: LaunchInput = {
			...restart,
			answers: {
				...restart.answers,
				situation: 'Desejo reaproximação com meu ex, sem repetir o passado.',
				desiredChange: 'Conversar sobre o que teria de mudar para retomar.'
			}
		};
		const facts = await calculateLaunchFacts(changed, executionId),
			reading = await composeLaunchReading(changed, facts);
		expect(facts.data.observations).toEqual(restartFacts.data.observations);
		expect(reading.practicalAction).toContain('pergunta sobre o que precisaria ser diferente');
		expect(
			reading.claims
				.filter((claim) => claim.rule === 'observed-transit-natal-relation')
				.map((claim) => claim.factors.natal)
		).not.toEqual(
			restartReading.claims
				.filter((claim) => claim.rule === 'observed-transit-natal-relation')
				.map((claim) => claim.factors.natal)
		);
		expect((await evaluateLaunchReading(changed, facts, reading)).status).toBe(
			'APPROVED_FOR_PRIVATE_TEST'
		);
	});

	it('removes the dependent conclusion when the source contact is absent', async () => {
		const removed = structuredClone(restartFacts);
		const observations = removed.data.observations as {
			contacts: { natal: string; transit: string; kind: string }[];
		}[];
		const factor = restartReading.claims.find((claim) => claim.id === 'claim-movement-1')!;
		for (const observation of observations)
			observation.contacts = observation.contacts.filter(
				(contact) =>
					!(
						contact.natal === factor.factors.natal &&
						contact.transit === factor.factors.transit &&
						contact.kind === factor.factors.aspect
					)
			);
		expect((await evaluateLaunchReading(restart, removed, restartReading)).status).toBe('REJECTED');
		expect(
			(await evaluateLaunchReading(restart, removed, restartReading)).checks.find(
				(check) => check.id === 'normalized-temporal-geometry'
			)?.passed
		).toBe(false);
	});

	it('rejects a semantic transit mutation even when ids, citation and factual numbers are preserved', async () => {
		const altered = structuredClone(restartReading),
			claim = altered.claims.find((candidate) => candidate.id === 'claim-movement-1')!;
		const old = claim.interpretation;
		claim.interpretation =
			old.split('. ').slice(0, 1).join('. ') +
			'. Esta combinação exige que você aceite qualquer convite e deixe a outra pessoa decidir seu ritmo.';
		const part = altered.sections.find((candidate) => candidate.id === claim.sectionId)!;
		part.paragraphs[part.paragraphs.indexOf(old)] = claim.interpretation;
		const review = await evaluateLaunchReading(restart, restartFacts, altered);
		expect(review.status).toBe('REJECTED');
		expect(review.checks.find((check) => check.id === 'transit-semantic-dependency')?.passed).toBe(
			false
		);
	});

	it('compares ceremony starts with an explicit restricted profile without claiming a full election', async () => {
		const facts = await calculateLaunchFacts(wedding, executionId),
			reading = await composeLaunchReading(wedding, facts);
		expect(reading.sections.filter((part) => part.id.startsWith('option-'))).toHaveLength(2);
		expect(
			reading.sections.find((part) => part.id === 'declared-comparison')?.paragraphs[0]
		).toBeTruthy();
		const review = await evaluateLaunchReading(wedding, facts, reading);
		expect(review.status).toBe('APPROVED_FOR_PRIVATE_TEST');
		expect(review.reasons).toEqual([]);
		expect(review.provenance.commercialPrecisionApproved).toBe(false);
		const paragraph = reading.sections.find((part) => part.id === 'option-1')!.paragraphs[0]!;
		expect(paragraph).toContain('20/03/2027 às 10h30 (horário de Cidade fictícia)');
		expect(paragraph).not.toContain('2027-03-20T');
		expect(paragraph).not.toContain('America/Sao_Paulo');
		expect(reading.claims.find((item) => item.id === 'claim-option-1')!.factors.utcInstant).toBe(
			'2027-03-20T13:30:00Z'
		);
		const altered = structuredClone(reading),
			part = altered.sections.find((item) => item.id === 'option-1')!,
			claim = altered.claims.find((item) => item.id === 'claim-option-1')!;
		part.paragraphs[0] = part.paragraphs[0]!.replace('20/03/2027', '21/03/2027');
		claim.interpretation = part.paragraphs[0];
		expect(
			(await evaluateLaunchReading(wedding, facts, altered)).checks.find(
				(item) => item.id === 'wedding-candidate-semantic-dependency'
			)?.passed
		).toBe(false);
	});

	it('rejects a fabricated wedding interpretation and an unsupported preference independently of its digest', async () => {
		const facts = await calculateLaunchFacts(wedding, executionId),
			reading = await composeLaunchReading(wedding, facts);
		const altered = structuredClone(reading),
			candidate = altered.sections.find((part) => part.id === 'option-1')!;
		candidate.paragraphs[0] =
			'A primeira opção traz conflito inevitável e comprova que os noivos terão dificuldades.';
		const claim = altered.claims.find((item) => item.id === 'claim-option-1')!;
		claim.interpretation = candidate.paragraphs[0];
		const review = await evaluateLaunchReading(wedding, facts, altered);
		expect(review.status).toBe('REJECTED');
		expect(
			review.checks.find((item) => item.id === 'wedding-candidate-semantic-dependency')?.passed
		).toBe(false);
		const invented = structuredClone(reading),
			comparison = invented.sections.find((part) => part.id === 'declared-comparison')!;
		comparison.paragraphs[0] =
			'A primeira opção deve ser escolhida porque a soma de aspectos é maior.';
		invented.claims.find((item) => item.id === 'claim-comparison')!.interpretation =
			comparison.paragraphs[0];
		expect(
			(await evaluateLaunchReading(wedding, facts, invented)).checks.find(
				(item) => item.id === 'wedding-partial-order-decision'
			)?.passed
		).toBe(false);
	});

	it('rejects incomplete ceremony geometry and stale readings after a real option changes', async () => {
		const facts = await calculateLaunchFacts(wedding, executionId),
			reading = await composeLaunchReading(wedding, facts);
		const incomplete = structuredClone(facts);
		const events = incomplete.data.events as { chart: { houses: { status: string } } }[];
		events[0]!.chart.houses.status = 'unavailable';
		expect((await evaluateLaunchReading(wedding, incomplete, reading)).status).toBe('REJECTED');
		const changed: LaunchInput = {
			...wedding,
			answers: {
				...wedding.answers,
				ceremonies: [option('Opção A', '2027-03-21'), option('Opção B', '2027-04-17')]
			}
		};
		const newFacts = await calculateLaunchFacts(changed, executionId);
		expect((await evaluateLaunchReading(changed, newFacts, reading)).status).toBe('REJECTED');
	});

	it('rejects malformed documents and input/identity substitution without crashing', async () => {
		expect(
			(await evaluateLaunchReading(ex, exFacts, { ...exReading, sections: [{}] } as LaunchReading))
				.status
		).toBe('REJECTED');
		expect(
			(await evaluateLaunchReading(ex, exFacts, { ...exReading, inputDigest: 'f'.repeat(64) }))
				.status
		).toBe('REJECTED');
		expect((await evaluateLaunchReading(restart, exFacts, exReading)).status).toBe('REJECTED');
		expect(canComposeLaunchReading('unknown')).toBe(false);
	});

	it('rejects an extra declared source, an extra assertion and a contradictory summary', async () => {
		const source = structuredClone(exReading);
		source.provenance.sources.push({
			id: 'invented-but-declared',
			version: '1',
			origin: 'No actual corpus.'
		});
		source.sections[0]!.sourceIds.push('invented-but-declared');
		const sourceReview = await evaluateLaunchReading(ex, exFacts, source);
		expect(sourceReview.status).toBe('REJECTED');
		expect(
			sourceReview.checks.find((check) => check.id === 'finite-source-allowlist')?.passed
		).toBe(false);
		const extra = structuredClone(exReading);
		extra.sections[0]!.paragraphs.push(
			'O contato confirma um compromisso afetivo que ainda não foi declarado pela outra pessoa.'
		);
		const extraReview = await evaluateLaunchReading(ex, exFacts, extra);
		expect(
			extraReview.checks.find((check) => check.id === 'finite-editorial-surface')?.passed
		).toBe(false);
		const contradiction = structuredClone(exReading);
		contradiction.summary += ' A conclusão final é que a reconciliação já está decidida.';
		const review = await evaluateLaunchReading(ex, exFacts, contradiction);
		expect(review.status).toBe('REJECTED');
		expect(review.checks.find((check) => check.id === 'authorized-content-integrity')?.passed).toBe(
			false
		);
	});
});
