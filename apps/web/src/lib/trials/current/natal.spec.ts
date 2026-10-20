import { describe, expect, it } from 'vitest';
import { calculateAspects } from '@atv/astrology';
import type { WorkflowInput } from '@atv/domain';
import { calculateTrial } from '../../server/trial-calculation';
import { composeCurrentNatal, CURRENT_NATAL_VERSION } from './natal';
import { interpretAngle, interpretNatalPair } from './natal-language';
import {
	interpretRelationship,
	relationshipMechanism,
	relationshipOverlayMeaning
} from './natal-relationships';
import { normalizeFactGraph, type FactGraph } from '../reconstruction/fact-graph';
import { purposeAspectPolicy } from '../reconstruction/purpose-facts';
import { careerContactMeaning, interpretCareerField } from './natal-career';
import { angleContactMeaning, planetParticipation } from './natal-roles';

const runId = '00000000-0000-4000-8000-000000000670';
const birth = (date = '2000-01-01T12:00:00') => ({
	localDateTime: date,
	utcInstant: `${date}Z`,
	timezone: 'UTC',
	latitude: 0,
	longitude: 0,
	locationSource: 'synthetic' as const
});
export const currentNatalTestInput = (productId: string): WorkflowInput =>
	({
		version: 'atv-workflow/1.0.0',
		productId,
		birth: birth(),
		...(['synastry', 'couple-dossier'].includes(productId)
			? { partner: birth('2001-07-12T07:00:00') }
			: {}),
		...(productId === 'couple-dossier'
			? {
					context: 'Queremos conversar sobre a distância e a divisão das responsabilidades.',
					questions: [
						'Como podemos conversar sem transformar diferenças em discussão?',
						'Como conciliar nossos projetos futuros?'
					]
				}
			: {}),
		...(productId === 'life-atlas'
			? {
					atlas: {
						priorities: [
							'Trabalho e contribuição',
							'Autocuidado e rotina',
							'Vínculos e acordos',
							'Aprendizado e expressão'
						]
					}
				}
			: {}),
		consent: {
			storage: true,
			partner: ['synastry', 'couple-dossier'].includes(productId),
			continuity: false,
			policyVersion: 'atv-input-consent/1'
		}
	}) as WorkflowInput;

/** Synthetic geometry is recalculated, not relabelled to force an editorial branch. */
function learningGraph(jupiterLongitude: number): FactGraph {
	const positions = [
		{ body: 'mercury' as const, longitude: 52 },
		{ body: 'jupiter' as const, longitude: jupiterLongitude }
	];
	const calculated = calculateAspects(positions, purposeAspectPolicy);
	const aspects = calculated.aspects.map((a, i) => ({
		first: a.first,
		second: a.second,
		kind: a.kind,
		orb: a.orbDegrees,
		factId: `test-aspect-${i}`
	}));
	return {
		version: 'test-geometry/1',
		positions: positions.map((p) => ({
			...p,
			sign: Math.floor(p.longitude / 30),
			house: Math.floor(p.longitude / 30) + 1,
			retrograde: false,
			factId: `position-${p.body}`
		})),
		aspects,
		angleContacts: [],
		asc: null,
		mc: null,
		houses: [],
		contextFactId: null,
		facts: [
			...positions.map((p) => ({
				id: `position-${p.body}`,
				kind: 'calculated' as const,
				display: `${p.body} ${p.longitude}`,
				source: 'synthetic-geometry',
				availability: 'available' as const,
				confidence: 'calculated-candidate' as const,
				sourceScope: 'private-free-test' as const
			})),
			...aspects.map((a) => ({
				id: a.factId,
				kind: 'calculated' as const,
				display: a.kind,
				source: 'synthetic-geometry',
				availability: 'available' as const,
				confidence: 'calculated-candidate' as const,
				sourceScope: 'private-free-test' as const
			}))
		],
		provenance: { sourceVersion: 'synthetic-geometry', precision: 'test', scope: 'test' }
	};
}

describe('current natal interpretation: semantic dependence and historical isolation', () => {
	it('integrates Mercury/Jupiter square inside learning and explains the Taurus/Aquarius difference', () => {
		const p = interpretNatalPair(learningGraph(322), 'learning')!;
		expect(p.text).toContain('a promessa cresce mais depressa que a verificação');
		expect(p.text).toContain('Mercúrio em Touro precisa tornar a ideia palpável');
		expect(p.text).toContain('Júpiter em Aquário amplia a pergunta para sistemas, grupos');
		expect(p.factIds).toContain('test-aspect-0');
		expect(p.relation).toContain('square');
	});
	it('removing the real contact within the same signs removes the square conclusion', () => {
		const square = interpretNatalPair(learningGraph(322), 'learning')!,
			outside = interpretNatalPair(learningGraph(309), 'learning')!;
		expect(outside.relation).toContain('sem aspecto maior');
		expect(outside.text).not.toContain('em quadratura');
		expect(outside.text).not.toContain('a promessa cresce mais depressa que a verificação');
		expect(outside.claim).not.toEqual(square.claim);
		expect(outside.factIds).not.toContain('test-aspect-0');
		expect(outside.text).toContain('Mercúrio em Touro precisa tornar a ideia palpável');
	});
	it('a trine changes the learning mechanism rather than only its aspect name', () => {
		const p = interpretNatalPair(learningGraph(172), 'learning')!;
		expect(p.text).toContain('Detalhes e visão de conjunto encontram passagem');
		expect(p.text).toContain('uma explicação convincente antes de ela ser suficiente');
		expect(p.text).not.toContain('Júpiter em Aquário');
		expect(p.text).not.toContain('a promessa cresce mais depressa que a verificação');
	});
	it('ablation of aspect evidence cannot retain its interpretive claim', () => {
		const graph = learningGraph(322),
			p = interpretNatalPair(
				{
					...graph,
					aspects: [],
					facts: graph.facts.filter((f) => !f.id.startsWith('test-aspect'))
				},
				'learning'
			)!;
		expect(p.text).not.toContain('a promessa cresce mais depressa que a verificação');
		expect(p.relation).toContain('sem aspecto maior');
		expect(p.factIds.every((id) => graph.facts.some((f) => f.id === id))).toBe(true);
	});
	it('Moon A × Moon B develops an emotional mismatch distinct from Mercury dialogue or Saturn responsibility', () => {
		const moon = relationshipMechanism('moon', 'moon', 'square'),
			mercury = relationshipMechanism('mercury', 'mercury', 'square'),
			saturn = relationshipMechanism('moon', 'saturn', 'square');
		expect(moon).toContain('cada uma oferece o cuidado que gostaria de receber');
		expect(moon).toContain('dedicação dos dois lados e ainda assim sensação de desencontro');
		expect(mercury).toContain('compreender o caminho usado');
		expect(saturn).toContain('acolhimento justamente onde a outra oferece responsabilidade');
		expect(relationshipMechanism('moon', 'moon', 'trine')).not.toContain('sensação de desencontro');
		expect(relationshipMechanism('moon', 'moon', undefined)).toContain(
			'sem afirmar uma ligação especialmente forte ou um conflito'
		);
	});

	it.each([
		'birth-chart',
		'three-pillars',
		'life-atlas',
		'purpose-career',
		'synastry',
		'couple-dossier'
	])(
		'composes %s from verified source with traceable claims',
		async (product) => {
			const input = currentNatalTestInput(product),
				c = await calculateTrial(input, runId),
				original = structuredClone(c);
			const r = composeCurrentNatal(input, c)!;
			expect(r.version).toBe(CURRENT_NATAL_VERSION);
			expect(r.productId).toBe(product);
			expect(r.sections.length).toBeGreaterThanOrEqual(3);
			expect(c).toEqual(original);
			const evidence = (
				r as typeof r & {
					interpretation: {
						conclusions: { section: number; claim: string; factIds: string[]; relation: string }[];
					};
				}
			).interpretation;
			expect(evidence.conclusions).toHaveLength(r.sections.length);
			for (const item of evidence.conclusions) {
				expect(r.sections[item.section].text).toContain(item.claim);
				expect(item.factIds.length).toBeGreaterThan(1);
				expect(item.factIds.every((id) => c.facts.some((f) => f.id === id))).toBe(true);
			}
			expect(r.sections.map((s) => s.text).join('\n')).not.toMatch(
				/tema declarado|síntese se completa quando|segurança e pertencimento de/
			);
			expect(r.sections.map((s) => s.text).join('\n')).not.toMatch(
				/(?:^|\s)(?:em a|em as|em o|em os|de o|de os|a a|a os)(?=\s|[.,;:!?]|$)/
			);
		},
		30000
	);
	it('context absence creates no artificial context chapter, while learning concern changes relevance', async () => {
		const i = currentNatalTestInput('birth-chart'),
			c = await calculateTrial(i, runId),
			r = composeCurrentNatal(i, c)!;
		expect(r.sections.some((s) => s.factIds.includes('personal-context'))).toBe(false);
		const withContext = {
				...i,
				context: 'Quero entender por que meu interesse nos estudos se dispersa.'
			},
			cc = await calculateTrial(withContext, runId),
			rr = composeCurrentNatal(withContext, cc)!;
		const section = rr.sections.find((s) => s.factIds.includes('personal-context'))!;
		expect(section.text).toContain('distinguir falta de interesse de falta de ligação');
		expect(section.factIds).toContain('position-mercury');
		expect(section.factIds).toContain('position-jupiter');
	});
	it('Três Pilares uses a declared workload concern without inventing it for an absent context', async () => {
		const input = currentNatalTestInput('three-pillars');
		const plain = composeCurrentNatal(input, await calculateTrial(input, runId))!;
		expect(plain.sections.some((s) => s.factIds.includes('personal-context'))).toBe(false);
		const contextual = { ...input, context: 'Estou em uma fase de sobrecarga no trabalho.' };
		const reading = composeCurrentNatal(contextual, await calculateTrial(contextual, runId))!;
		const passage = reading.sections.find((s) => s.factIds.includes('personal-context'))!;
		expect(passage.text).toContain('preocupação com cansaço ou sobrecarga');
		expect(passage.text).toContain('iniciativa se encontra com a exigência');
		expect(passage.factIds).toContain('position-mars');
		expect(passage.factIds).toContain('position-saturn');
		expect(reading.sections).toHaveLength(plain.sections.length + 1);
	});
	it('career transition remains the main concern when the declared context also asks for rest', async () => {
		const input = {
			...currentNatalTestInput('purpose-career'),
			context: 'Quero mudar de área com mais espaço para descanso.'
		};
		const reading = composeCurrentNatal(input, await calculateTrial(input, runId))!;
		const passage = reading.sections.find((s) => s.factIds.includes('personal-context'))!;
		expect(passage.title).toBe('Mudar de direção sem transformar a escolha numa prova de valor');
		expect(passage.text).toContain('ritmo que permite sustentar');
		expect(passage.factIds).toContain('position-sun');
		expect(passage.factIds).toContain('position-saturn');
		expect(
			reading.sections.some((s) => s.title === 'Quando continuar exige rever o tamanho do esforço')
		).toBe(false);
	});
	it('Atlas priority order changes the cross-area conclusion without changing natal facts', async () => {
		const i = currentNatalTestInput('life-atlas'),
			reordered = {
				...i,
				atlas: {
					priorities: [
						'Autocuidado e rotina',
						'Trabalho e contribuição',
						'Vínculos e acordos',
						'Aprendizado e expressão'
					]
				}
			} as WorkflowInput;
		const a = await calculateTrial(i, runId),
			b = await calculateTrial(reordered, runId);
		const x = composeCurrentNatal(i, a)!,
			y = composeCurrentNatal(reordered, b)!;
		expect(x.sections[4].text).toContain('trabalho e contribuição antes de autocuidado e rotina');
		expect(y.sections[4].text).toContain('autocuidado e rotina antes de trabalho e contribuição');
		expect(a.facts.filter((f) => f.id.startsWith('position-'))).toEqual(
			b.facts.filter((f) => f.id.startsWith('position-'))
		);
	});
	it('dossier question content selects care versus dialogue without inventing an answer from the question', async () => {
		const i = {
			...currentNatalTestInput('couple-dossier'),
			questions: ['Como podemos cuidar melhor um do outro?']
		};
		const c = await calculateTrial(i, runId),
			r = composeCurrentNatal(i, c)!;
		expect(r.sections[0].text).toContain('seja recebido como cuidado');
		expect(r.sections[0].factIds).toContain('couple-question-1');
		expect(r.sections[0].text).not.toContain('compreender o caminho usado');
	});
	it('relationship section cites a selected contact and directional overlay rather than inventing reciprocity', async () => {
		const i = currentNatalTestInput('synastry'),
			c = await calculateTrial(i, runId),
			p = interpretRelationship(c, 'care');
		expect(p.text).toContain('num campo da vida de B');
		expect(p.text).toContain('o modo como A demonstra apreço');
		expect(p.text).not.toContain('o modo como B demonstra apreço');
		expect(p.factIds.some((id) => id.startsWith('overlay-person-a-'))).toBe(true);
		expect(p.factIds.every((id) => c.facts.some((f) => f.id === id))).toBe(true);
	});
	it('the same angle contact changes meaning with the planet, and its ablation removes the angle conclusion', async () => {
		const input = currentNatalTestInput('birth-chart');
		const graph = normalizeFactGraph(await calculateTrial(input, runId));
		const pluto = graph.positions.find((p) => p.body === 'pluto')!;
		const control = angleContactMeaning(pluto, 'asc', 'square');
		const communication = angleContactMeaning({ ...pluto, body: 'mercury' }, 'asc', 'square');
		expect(control).toContain('relações com poder e controle');
		expect(control).toContain('presença defensiva');
		expect(communication).toContain('encontrar a explicação certa');
		expect(communication).not.toContain('poder e controle');
		expect(angleContactMeaning(pluto, 'asc', 'trine')).not.toContain('presença defensiva');
		const present = interpretAngle(graph, 'asc')!;
		const absent = interpretAngle({ ...graph, angleContacts: [] }, 'asc')!;
		expect(present.text).toContain('com o Ascendente, aproxima');
		expect(absent.text).not.toContain('com o Ascendente, aproxima');
		expect(absent.factIds.some((id) => graph.angleContacts.some((a) => a.factId === id))).toBe(
			false
		);
	});
	it('career reads resources and daily work through their own cusps, rulers and actual links to public direction', async () => {
		const input = currentNatalTestInput('purpose-career');
		const graph = normalizeFactGraph(await calculateTrial(input, runId));
		const resources = interpretCareerField(graph, 2)!;
		const work = interpretCareerField(graph, 6)!;
		expect(resources.text).toContain('relação com recursos e sustentação material');
		expect(work.text).toContain('relação com tarefas e organização do trabalho');
		expect(resources.factIds).toContain('house-2');
		expect(work.factIds).toEqual(expect.arrayContaining(['house-2', 'house-6']));
		expect(resources.text).toContain('rege o Meio do Céu');
		expect(work.text).toContain('A casa 2, regida por');
		const noCusps = interpretCareerField({ ...graph, houses: [] }, 2)!;
		expect(noCusps.text).not.toContain('Com sua entrada em');
		expect(noCusps.claim).not.toEqual(resources.claim);
		// Recalculate a later birth time: house cusps change while the planetary signs remain stable.
		const later = normalizeFactGraph(
			await calculateTrial({ ...input, birth: birth('2000-01-01T14:00:00') }, runId)
		);
		const alternative = interpretCareerField(later, 2)!;
		expect(alternative.claim).not.toEqual(resources.claim);
		expect(alternative.relation).not.toEqual(resources.relation);
		expect(alternative.text).not.toContain(resources.text.split('\n\n')[1]);
		expect(graph.positions.map((p) => p.sign)).toEqual(later.positions.map((p) => p.sign));
	});
	it('career contact meaning follows the other body and aspect instead of treating every support as earning capacity', () => {
		const imagination = careerContactMeaning('neptune', 2, 'sextile');
		expect(imagination).toContain('Imaginação e sensibilidade');
		expect(imagination).not.toContain('capacidade de realização');
		expect(careerContactMeaning('neptune', 2, 'square')).toContain(
			'diferença entre o valor imaginado'
		);
		expect(careerContactMeaning('mars', 2, 'sextile')).toContain('iniciativa');
		expect(careerContactMeaning('neptune', 6, 'sextile')).toContain('tarefas de criação e cuidado');
		expect(careerContactMeaning('mars', 6, 'square')).toContain('romper a sequência');
	});
	it('Atlas gives Mercury its own mental function and connects the later priorities in its synthesis', async () => {
		const input = currentNatalTestInput('life-atlas');
		const calculation = await calculateTrial(input, runId);
		const reading = composeCurrentNatal(input, calculation)!;
		const mercury = normalizeFactGraph(calculation).positions.find((p) => p.body === 'mercury')!;
		expect(planetParticipation(mercury)).toContain('compreender e comunicar');
		expect(planetParticipation({ ...mercury, body: 'sun' })).toContain('direção própria');
		expect(reading.sections[4].text).toContain('vínculos e acordos');
		expect(reading.sections[4].text).toContain('aprendizado e expressão');
		expect(reading.sections[4].text).not.toContain(reading.sections[0].text);
		const changed = {
			...input,
			atlas: {
				priorities: [
					'Trabalho e contribuição',
					'Autocuidado e rotina',
					'Recursos e autonomia',
					'Aprendizado e expressão'
				]
			}
		} as WorkflowInput;
		const alternative = composeCurrentNatal(changed, await calculateTrial(changed, runId))!;
		expect(alternative.sections[4].text).not.toEqual(reading.sections[4].text);
		expect(alternative.sections[4].text).not.toContain(
			'O encontro entre autocuidado e rotina e vínculos e acordos'
		);
	});
	it('overlays distinguish a private base from play, a receiving person, and the theme under interpretation', () => {
		const homeCare = relationshipOverlayMeaning('venus', 4, 'care');
		const play = relationshipOverlayMeaning('venus', 5, 'care');
		const homeCommitment = relationshipOverlayMeaning('venus', 4, 'commitment');
		expect(homeCare).toContain('construir familiaridade');
		expect(play).toContain('brincar, criar e expressar interesse');
		expect(play).not.toContain('construir familiaridade');
		expect(homeCommitment).toContain('dever permanência ou disponibilidade');
		expect(homeCommitment).not.toEqual(homeCare);
		expect(relationshipOverlayMeaning('saturn', 4, 'care')).toContain(
			'compromissos e limites trazidos por A'
		);
	});
	it('care includes both actual Moons even when the selected cross-contact has Venus, while commitment survives absence of a selected aspect', async () => {
		const input = currentNatalTestInput('synastry');
		const calculation = await calculateTrial(input, runId);
		const care = interpretRelationship(calculation, 'care');
		expect(care.claim).toContain('Vênus de A');
		expect(care.text).toContain('Lua de A em Escorpião');
		expect(care.text).toContain('Lua de B em Áries');
		expect(care.text).toContain(
			'Dar espaço pode ser um gesto de cuidado para B e parecer distância para A'
		);
		expect(care.factIds).toEqual(
			expect.arrayContaining(['person-a-position-moon', 'person-b-position-moon'])
		);
		const ablated = structuredClone(calculation);
		ablated.data.relationshipGeometry = {
			...(ablated.data.relationshipGeometry as object),
			aspects: []
		};
		const commitment = interpretRelationship(ablated, 'commitment');
		expect(commitment.text).toContain('Vênus de A');
		expect(commitment.text).toContain('Saturno de B');
		expect(commitment.text).toContain('participação voluntária');
		expect(commitment.text).toContain('rever como cada pessoa participa');
		expect(commitment.text).not.toMatch(/forma (?:quadratura|trígono|sextil|conjunção|oposição)/);
		expect(commitment.factIds.some((id) => id.startsWith('cross-'))).toBe(false);
	});
	it('rejects tampered sources and declines unrelated products', async () => {
		const i = currentNatalTestInput('birth-chart'),
			c = await calculateTrial(i, runId),
			forged = structuredClone(c);
		forged.facts[0].display = 'adulterated';
		expect(() => composeCurrentNatal(i, forged)).toThrow();
		expect(composeCurrentNatal({ ...i, productId: 'not-current' }, c)).toBeNull();
	});
});
