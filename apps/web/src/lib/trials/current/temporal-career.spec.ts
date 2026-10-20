import { describe, expect, it } from 'vitest';
import type { Position } from '../reconstruction/fact-graph';
import type { TemporalContact } from './temporal-canon';
import {
	careerAspectNuance,
	careerContactMeaning,
	careerPeriodSynthesis,
	type CareerContact
} from './temporal-career';

function entry(
	transit: string,
	target: string,
	aspect: TemporalContact['aspect'] = 'sextile',
	house: number | null = 10
): CareerContact {
	return {
		contact: { id: `${transit}-${target}-${aspect}`, transit, natal: target, aspect, orb: 1 },
		natal: {
			body: target,
			longitude: 0,
			sign: 0,
			house,
			retrograde: false,
			factId: `position-${target}`
		}
	};
}
const meaning = (e: CareerContact) => careerContactMeaning(e.contact, e.natal);

describe('professional interpretation of actual temporal contacts', () => {
	it('distinguishes an opening that needs participation from a familiar working response', () => {
		expect(careerAspectNuance('sextile')).toContain('depende de participação');
		expect(careerAspectNuance('sextile')).toContain('não se realiza apenas por estar disponível');
		expect(careerAspectNuance('trine')).toContain('manter uma maneira conhecida de fazer');
		expect(careerAspectNuance('trine')).not.toContain('depende de participação');
	});
	it('distinguishes interference in execution from polarization without inventing an opponent', () => {
		expect(careerAspectNuance('square')).toContain(
			'insistir no mesmo método pode aumentar o atrito'
		);
		expect(careerAspectNuance('square')).toContain('sem reduzir a questão a trabalhar mais');
		expect(careerAspectNuance('opposition')).toContain('oscilar entre duas exigências');
		expect(careerAspectNuance('opposition')).toContain('não identifica outra pessoa como causa');
		expect(careerAspectNuance('conjunction')).toContain(
			'evita esperar que uma única escolha resolva tudo'
		);
	});
	it('connects communication to contribution and responsibility rather than only finding words', () => {
		const reading = meaning(entry('mercury', 'sun'));
		expect(reading.claim).toContain(
			'explicar a proposta e delimitar a responsabilidade dá forma à autoria'
		);
		expect(reading.claim).toContain('compreender o que está sendo oferecido');
		expect(reading.text).toContain('responsabilidade visível');
		expect(reading.factIds).toEqual(['mercury-sun-sextile', 'position-sun', 'house-10']);
	});

	it('changes the mechanism when the transiting body changes, while keeping the natal target', () => {
		const communication = meaning(entry('mercury', 'sun'));
		const emotional = meaning(entry('moon', 'sun'));
		expect(communication.claim).toContain('sem precisar adivinhar sua intenção');
		expect(emotional.claim).toContain('sensação momentânea de conforto');
		expect(emotional.claim).toContain('compromisso duradouro');
		expect(emotional.claim).not.toContain('explicar a proposta');
	});

	it('distinguishes a pressured commitment from a supported one and from identity merged with duty', () => {
		const tension = meaning(entry('saturn', 'sun', 'square'));
		const support = meaning(entry('saturn', 'sun', 'trine'));
		const concentration = meaning(entry('saturn', 'sun', 'conjunction'));
		expect(tension.claim).toContain('aceitar mais responsabilidade do que consegue sustentar');
		expect(tension.claim).toContain('excesso de obrigação acabaria apagando');
		expect(support.claim).toContain('responsabilidade delimitada');
		expect(support.claim).toContain('sem depender apenas de reconhecimento imediato');
		expect(support.claim).not.toContain('aceitar mais responsabilidade');
		expect(concentration.claim).toContain(
			'rever uma obrigação começa a parecer uma perda de valor pessoal'
		);
	});

	it('changes the professional dilemma when the natal target changes', () => {
		const identity = meaning(entry('moon', 'sun', 'square'));
		const ideal = meaning(entry('moon', 'neptune', 'square'));
		expect(identity.claim).toContain('avaliação do caminho profissional inteiro');
		expect(ideal.claim).toContain('não esclarece sozinha a intenção de outra pessoa');
		expect(ideal.claim).toContain('dar nome ao incômodo');
		expect(ideal.claim).not.toContain('avaliação do caminho profissional inteiro');
	});

	it('locates the same relation in resources or public responsibility only when those houses exist', () => {
		const resources = meaning(entry('mercury', 'sun', 'sextile', 2));
		const direction = meaning(entry('mercury', 'sun', 'sextile', 10));
		const withoutHouse = meaning(entry('mercury', 'sun', 'sextile', null));
		expect(resources.text).toContain('tempo, na energia e no valor atribuídos à contribuição');
		expect(direction.text).toContain('direção profissional e da responsabilidade visível');
		expect(resources.text).not.toContain('responsabilidade visível');
		expect(withoutHouse.text).not.toMatch(/casa \d|responsabilidade visível/);
		expect(withoutHouse.factIds).toEqual(['mercury-sun-sextile', 'position-sun']);
	});

	it('covers all ten bodies without grammatical interpolation artifacts or predicted events', () => {
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
		for (const transit of bodies) {
			for (const target of bodies) {
				for (const aspect of ['square', 'conjunction', 'trine'] as const) {
					const result = meaning(entry(transit, target, aspect, 6));
					expect(result.claim, `${transit}/${target}/${aspect}`).not.toMatch(
						/undefined|(?:^|\s)(?:em|a|de) (?:a|o)\s|\. [a-záéíóúç]/
					);
					expect(result.text).not.toMatch(
						/será promovid|vai receber uma oferta|conseguirá emprego|seu chefe|seus funcionários/
					);
					expect(result.text).toContain('ajustar método, divisão de trabalho ou carga');
				}
			}
		}
	});

	it('rejects a mismatched natal position rather than citing unrelated evidence', () => {
		const e = entry('saturn', 'sun');
		expect(() => careerContactMeaning(e.contact, { ...e.natal, body: 'moon' } as Position)).toThrow(
			'não corresponde'
		);
	});
});

describe('career synthesis changes when a continuity is removed', () => {
	const duty = entry('saturn', 'sun', 'square');
	const ideal = entry('neptune', 'neptune', 'sextile');
	const attachment = entry('pluto', 'neptune', 'conjunction');

	it('connects actual responsibility, inspiration and attachment, without deciding a biography', () => {
		const result = careerPeriodSynthesis([duty, attachment, ideal])!;
		expect(result.claim).toContain('o que você consegue sustentar e que sentido vale preservar');
		expect(result.claim).toContain(
			'O apego a uma imagem de realização torna essa revisão mais delicada'
		);
		expect(result.claim).toContain(
			'preservar o sentido que ainda inspira e transformar a forma de alcançá-lo'
		);
		expect(result.claim).toContain('Como esses alvos se reúnem na casa 10');
		expect(result.factIds).toEqual(
			expect.arrayContaining([
				duty.contact.id,
				attachment.contact.id,
				ideal.contact.id,
				'position-sun',
				'position-neptune',
				'house-10'
			])
		);
		expect(result.relation).toContain('pluto→neptune/conjunction');
	});

	it('drops attachment and loss-of-ideal conclusions when Pluto is removed', () => {
		const result = careerPeriodSynthesis([duty, ideal])!;
		expect(result.claim).toContain('uma visão inspiradora também não elimina os limites');
		expect(result.claim).not.toContain('O apego a uma imagem de realização');
		expect(result.claim).not.toContain('reconhecer o custo de um ideal pode parecer perder');
		expect(result.factIds).not.toContain(attachment.contact.id);
	});

	it('drops the duty-versus-meaning dilemma when the Saturn continuity is removed', () => {
		const result = careerPeriodSynthesis([attachment, ideal])!;
		expect(result.claim).toContain('convergem sobre o sentido e a inspiração');
		expect(result.claim).toContain(
			'a pressão para transformar uma posição e a abertura à inspiração'
		);
		expect(result.claim).not.toContain('a cobrança por consistência');
		expect(result.claim).not.toContain('aceitando tudo');
		expect(result.factIds).not.toContain(duty.contact.id);
	});

	it('makes mixed resources and direction explicit instead of pretending all targets are in house 10', () => {
		const result = careerPeriodSynthesis([entry('saturn', 'sun', 'square', 2), ideal])!;
		expect(result.claim).toContain('ligação entre as casas 2 e 10');
		expect(result.claim).toContain('ocupar um lugar precisa caber no valor, no tempo e nos meios');
		expect(result.claim).not.toContain('esses alvos se reúnem na casa 10');
	});

	it('changes the professional consequence when the responsibility targets communication instead of authorship', () => {
		const authorship = careerPeriodSynthesis([duty, ideal])!;
		const communication = careerPeriodSynthesis([entry('saturn', 'mercury', 'square'), ideal])!;
		expect(authorship.claim).toContain(
			'mostrar uma contribuição delimitada e assumir a parte que lhe pertence'
		);
		expect(communication.claim).toContain(
			'entendimento de informações, propostas e combinados de trabalho'
		);
		expect(communication.claim).toContain(
			'transformar uma ideia em termos que possam ser compreendidos e revistos'
		);
		expect(communication.claim).not.toContain('mostrar uma contribuição delimitada');
	});

	it('does not locate an unknown-house target in the other target’s house', () => {
		const result = careerPeriodSynthesis([entry('saturn', 'sun', 'square', null), ideal])!;
		expect(result.claim).not.toContain('esses alvos se reúnem na casa 10');
		expect(result.claim).not.toContain('Como o alvo está na casa');
	});

	it('gives the third continuity an explicit role outside the main authored combination', () => {
		const change = entry('uranus', 'mercury', 'square', 3);
		const withChange = careerPeriodSynthesis([
			entry('mars', 'sun'),
			entry('venus', 'jupiter'),
			change
		])!;
		const withoutChange = careerPeriodSynthesis([entry('mars', 'sun'), entry('venus', 'jupiter')])!;
		expect(withChange.claim).toContain(
			'entendimento de informações, propostas e combinados de trabalho'
		);
		expect(withChange.claim).toContain('tratar toda continuidade como impedimento à mudança');
		expect(withChange.claim).toContain(
			'transformar uma ideia em termos que possam ser compreendidos e revistos'
		);
		expect(withoutChange.claim).not.toContain('impedimento à mudança');
		expect(withoutChange.factIds).not.toContain(change.contact.id);
	});

	it('does not synthesize a period without supplied continuities', () => {
		expect(careerPeriodSynthesis([])).toBeNull();
	});
});
