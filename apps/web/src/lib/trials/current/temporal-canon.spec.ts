import { describe, expect, it } from 'vitest';
import type { Position } from '../reconstruction/fact-graph';
import {
	temporalNatalModifier,
	temporalPairMeaning,
	temporalSharedTarget,
	type TemporalContact
} from './temporal-canon';

const bodies = [
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
const contact = (
	transit: string,
	natal: string,
	aspect: TemporalContact['aspect'] = 'sextile'
): TemporalContact => ({
	id: `${transit}-${natal}-${aspect}`,
	transit,
	natal,
	aspect,
	orb: 0.5
});
const position = (body = 'sun'): Position => ({
	body,
	longitude: 10,
	sign: 0,
	house: 1,
	retrograde: false,
	factId: `position-${body}`
});

describe('complete temporal pair canon', () => {
	it('career composers can retain natal sign and aspect modulation without repeating the house layer', () => {
		const natal = position('sun');
		const full = temporalNatalModifier(natal, 'square');
		const focused = temporalNatalModifier(natal, 'square', false);
		expect(full).toContain('Na casa 1');
		expect(focused).toContain('Sol natal em Áries');
		expect(focused).toContain('O atrito pode aumentar a insistência');
		expect(full).toContain(focused);
		expect(focused).not.toMatch(/Na casa|Sem casas/);
		expect(temporalNatalModifier({ ...natal, house: null }, 'sextile', false)).not.toContain(
			'Sem casas'
		);
		expect(temporalNatalModifier({ ...natal, house: null }, 'sextile')).toContain(
			'Sem casas disponíveis'
		);
	});
	it('all supported directional pairs and aspects have authored relations; unknown bodies fail closed', () => {
		for (const transit of bodies)
			for (const natal of bodies) {
				const modes = new Set<string>();
				for (const aspect of ['conjunction', 'square', 'opposition', 'sextile', 'trine'] as const) {
					const text = temporalPairMeaning(contact(transit, natal, aspect), false);
					expect(text).not.toMatch(
						/undefined|Há uma passagem de apoio entre|Há uma tensão entre|Neste encontro, .*coloca em primeiro plano/
					);
					modes.add(text);
				}
				// Distinct conjunction, friction and cooperation; the aspect explanation
				// separately distinguishes square/opposition and sextile/trine.
				expect(modes.size, `${transit}/${natal}`).toBe(3);
			}
		expect(() => temporalPairMeaning(contact('chiron', 'sun'))).toThrow('sem cânone');
		expect(() => temporalPairMeaning(contact('moon', 'chiron'))).toThrow('sem cânone');
	});
	it('Moon to Jupiter relates momentary receptivity to expectations, while Moon to Neptune interprets impression and expression', () => {
		const hope = temporalPairMeaning(contact('moon', 'jupiter'), false);
		const sensitivity = temporalPairMeaning(contact('moon', 'neptune'), false);
		expect(hope).toContain('disposição mais receptiva');
		expect(hope).toContain('bem-estar momentâneo');
		expect(hope).toContain('garantia de que tudo caberá');
		expect(sensitivity).toContain('Música, imagem ou um gesto delicado');
		expect(sensitivity).toContain('intenção de outra pessoa');
		expect(sensitivity).not.toContain('garantia de que tudo caberá');
		expect(hope).not.toContain('intenção de outra pessoa');
	});
	it('changing the lunar target from Sun to Neptune changes participation into the expression of subtle impressions', () => {
		const participation = temporalPairMeaning(contact('moon', 'sun'), false);
		const imagination = temporalPairMeaning(contact('moon', 'neptune'), false);
		expect(participation).toContain('gesto simples de participação');
		expect(participation).toContain('decisão definitiva');
		expect(imagination).toContain('impressão sutil');
		expect(imagination).not.toContain('participação');
	});
	it('changing the aspect changes the mechanism, not only an appended aspect definition', () => {
		const ease = temporalPairMeaning(contact('moon', 'jupiter', 'sextile'), false);
		const friction = temporalPairMeaning(contact('moon', 'jupiter', 'square'), false);
		const fusion = temporalPairMeaning(contact('moon', 'jupiter', 'conjunction'), false);
		expect(ease).toContain('perceber caminhos');
		expect(friction).toContain('prometer mais do que já oferece');
		expect(friction).toContain('aceitar mais');
		expect(fusion).toContain('pequena abertura pode ganhar grande significado');
		expect(ease).not.toContain('aceitar mais');
	});
	it('Venus to Mercury interprets tact and clarity, rather than substituting the Sun identity conclusion', () => {
		const speech = temporalPairMeaning(contact('venus', 'mercury', 'square'), false);
		const identity = temporalPairMeaning(contact('venus', 'sun', 'square'), false);
		expect(speech).toContain('diferença até torná-la pouco compreensível');
		expect(speech).toContain('esconde a informação');
		expect(identity).toContain('esconder uma preferência');
		expect(identity).not.toContain('esconde a informação');
	});
	it('reversing the transiting and natal bodies changes what initiates the interaction', () => {
		const immediateMood = temporalPairMeaning(contact('moon', 'jupiter', 'square'), false);
		const enlargedCare = temporalPairMeaning(contact('jupiter', 'moon', 'square'), false);
		expect(immediateMood).toContain('anima no momento');
		expect(enlargedCare).toContain('receber muito');
		expect(enlargedCare).toContain('necessidade pode continuar sem nome');
		expect(enlargedCare).not.toContain('anima no momento');
	});
	it('slow contacts distinguish limits of an ideal from power invested in it', () => {
		const form = temporalPairMeaning(contact('saturn', 'neptune', 'square'), false);
		const attachment = temporalPairMeaning(contact('pluto', 'neptune', 'square'), false);
		expect(form).toContain('forma possível');
		expect(form).toContain('custo de realizá-la');
		expect(attachment).toContain('perder uma ilusão');
		expect(attachment).toContain('grande parte do sentido de uma escolha');
		expect(attachment).not.toContain('custo de realizá-la');
	});
});

describe('converging temporal relations', () => {
	it('adds the combined dynamic without repeating the two already narrated contacts', () => {
		const a = contact('pluto', 'neptune', 'conjunction');
		const b = contact('neptune', 'neptune', 'sextile');
		const combined = temporalSharedTarget(a, b, position('neptune'))!;
		expect(combined.claim).not.toContain(temporalPairMeaning(a, false));
		expect(combined.claim).not.toContain(temporalPairMeaning(b, false));
		expect(combined.claim).toContain('conjunção de Plutão concentra');
		expect(combined.claim).toContain('uma imagem precisa encontrar expressão');
		expect(combined.factIds).toEqual([a.id, b.id, 'position-neptune']);
	});
	it('all two-body combinations can converge on a supported target, but mismatched target evidence is rejected', () => {
		for (const target of bodies)
			for (let left = 0; left < bodies.length; left++)
				for (let right = left + 1; right < bodies.length; right++) {
					const a = contact(bodies[left], target, 'square');
					const b = contact(bodies[right], target, 'sextile');
					const result = temporalSharedTarget(a, b, position(target));
					expect(result?.claim, `${a.transit}/${b.transit}/${target}`).toBeTruthy();
					expect(result?.claim).not.toContain('undefined');
					expect(result?.factIds).toEqual([a.id, b.id, `position-${target}`]);
				}
		expect(
			temporalSharedTarget(contact('moon', 'sun'), contact('saturn', 'sun'), position('moon'))
		).toBeNull();
		expect(
			temporalSharedTarget(contact('moon', 'sun'), contact('moon', 'sun'), position())
		).toBeNull();
	});
	it('Venus/Mars on Sun links approval and initiative, and flipping which contact is tense changes the conclusion', () => {
		const pleasing = temporalSharedTarget(
			contact('venus', 'sun', 'square'),
			contact('mars', 'sun'),
			position()
		)!;
		const contest = temporalSharedTarget(
			contact('venus', 'sun'),
			contact('mars', 'sun', 'square'),
			position()
		)!;
		expect(pleasing.claim).toContain('corresponder ao que agrada aos outros');
		expect(pleasing.claim).toContain('merecer aceitação');
		expect(contest.claim).toContain('dar uma medida ao impulso de disputar');
		expect(contest.claim).toContain('prova de força');
		expect(contest.claim).not.toContain('merecer aceitação');
	});
	it('Moon/Saturn on Sun distinguishes emotional relief from a sustainable commitment', () => {
		const burden = temporalSharedTarget(
			contact('moon', 'sun'),
			contact('saturn', 'sun', 'square'),
			position()
		)!;
		const discomfort = temporalSharedTarget(
			contact('moon', 'sun', 'square'),
			contact('saturn', 'sun'),
			position()
		)!;
		expect(burden.claim).toContain('conforto ou incômodo mais imediato');
		expect(burden.claim).toContain('não reduz sozinho o tamanho da responsabilidade');
		expect(discomfort.claim).toContain('um dia menos confortável');
		expect(discomfort.claim).toContain('abandonar a escolha');
		expect(discomfort.claim).not.toContain('não reduz sozinho');
	});
	it('a conjunction retains concentration rather than being labelled an easy or hard contact', () => {
		const fusion = temporalSharedTarget(
			contact('venus', 'sun', 'conjunction'),
			contact('mars', 'sun', 'square'),
			position()
		)!;
		expect(fusion.claim).toContain('conjunção de Vênus aproxima preferência e identidade');
		expect(fusion.claim).toContain('tensão de Marte');
		expect(fusion.claim).not.toContain('abertura de Vênus');
		const both = temporalSharedTarget(
			contact('saturn', 'sun', 'conjunction'),
			contact('moon', 'sun', 'conjunction'),
			position()
		)!;
		expect(both.claim).toContain('As conjunções aproximam dever e sentimento');
	});
	it('removing the common target removes the combined conclusion', () => {
		expect(
			temporalSharedTarget(contact('venus', 'sun'), contact('mars', 'moon'), position())
		).toBeNull();
	});
});
