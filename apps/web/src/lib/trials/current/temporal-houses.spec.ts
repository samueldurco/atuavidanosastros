import { describe, expect, it } from 'vitest';
import type { Position } from '../reconstruction/fact-graph';
import { annualHouseInterplay } from './temporal-houses';

const position = (body: string, house: number | null): Position => ({
	body,
	house,
	longitude: 0,
	sign: 0,
	retrograde: false,
	factId: `return-${body}`
});

describe('annual houses: combined meaning grounded in the return chart', () => {
	it('retains each new planetary agency without reprinting an already interpreted house bridge', () => {
		const introduced = new Set<string>();
		const venus = annualHouseInterplay(
			position('sun', 8),
			position('venus', 8),
			'conjunction',
			introduced
		)!;
		const mars = annualHouseInterplay(
			position('sun', 8),
			position('mars', 8),
			'conjunction',
			introduced
		)!;
		const allBridges = [...introduced];
		expect(allBridges.length).toBe(2);
		for (const bridge of allBridges) {
			expect(venus.claim).toContain(bridge);
			expect(mars.claim).not.toContain(bridge);
		}
		expect(mars.claim).toContain('Marte na casa 8');
		expect(mars.claim).toContain('Na conjunção');
		expect(mars.claim).not.toContain('Vênus');
		expect(mars.factIds).toEqual(['return-sun', 'return-mars', 'return-house-8']);
	});
	it('adds the unintroduced tension when a supportive relation is followed by a hard aspect', () => {
		const introduced = new Set<string>();
		const support = annualHouseInterplay(
			position('moon', 12),
			position('pluto', 8),
			'trine',
			introduced
		)!;
		const priorSupport = [...introduced][0];
		const tension = annualHouseInterplay(
			position('sun', 8),
			position('moon', 12),
			'square',
			introduced
		)!;
		expect(introduced.size).toBe(2);
		expect(support.claim).toContain(priorSupport);
		expect(tension.claim).not.toContain(priorSupport);
		expect(tension.claim).toContain('A pressão para compartilhar antes');
		expect(tension.claim).toContain('A quadratura acentua a dificuldade');
	});
	it('Sun in 8 and Moon in 12 explain how private processing changes trust and intimacy', () => {
		const reading = annualHouseInterplay(position('sun', 8), position('moon', 12))!;
		expect(reading.claim).toContain('a direção que você deseja dar ao ciclo');
		expect(reading.claim).toContain('a necessidade de amparo emocional');
		expect(reading.claim).toContain('o tempo de recolhimento pode permitir renegociar limites');
		expect(reading.claim).toContain('A intimidade não exige exposição total');
		expect(reading.closure).toContain('aprofundar a confiança respeitando o tempo de elaboração');
		expect(reading.claim).not.toMatch(/primeiro campo|segundo campo|segredos|trauma|descubra como/);
		expect(reading.factIds).toEqual([
			'return-sun',
			'return-moon',
			'return-house-8',
			'return-house-12'
		]);
		expect(reading.relation).toContain('relação temática sem inferir aspecto');
		expect(reading.claim).not.toMatch(/trígono|sextil|quadratura|oposição|conjunção/);
	});

	it('a trine from Moon in 12 to Pluto in 8 connects care with releasing control', () => {
		const reading = annualHouseInterplay(position('moon', 12), position('pluto', 8), 'trine')!;
		expect(reading.claim).toContain(
			'acolher o que você sente pode ajudar você a rever o que você tenta garantir pelo controle'
		);
		expect(reading.claim).toContain('A intimidade não exige exposição total');
		expect(reading.claim).not.toContain('A pressão para compartilhar antes');
		expect(reading.factIds).toEqual([
			'return-moon',
			'return-pluto',
			'return-house-12',
			'return-house-8'
		]);
	});

	it('the same houses under tension foreground premature exposure instead of easy cooperation', () => {
		const first = position('moon', 12),
			second = position('pluto', 8);
		const tension = annualHouseInterplay(first, second, 'square')!;
		const support = annualHouseInterplay(first, second, 'trine')!;
		expect(tension.claim).toContain(
			'dificuldade de acolher o que você sente sem atropelar a necessidade de rever o que você tenta garantir pelo controle'
		);
		expect(tension.claim).toContain(
			'compartilhar antes de compreender o que sente pode tornar a entrega defensiva'
		);
		expect(tension.claim.indexOf('A pressão para compartilhar')).toBeLessThan(
			tension.claim.indexOf('Elaborar em reservado')
		);
		expect(support.claim).not.toContain('entrega defensiva');
		expect(tension.closure).not.toBe(support.closure);
	});

	it('changing a house changes the conclusion, not just the position label', () => {
		const intimacy = annualHouseInterplay(position('sun', 8), position('moon', 12))!;
		const work = annualHouseInterplay(position('sun', 2), position('moon', 6))!;
		expect(work.claim).toContain(
			'O valor do seu trabalho se torna mais claro quando inclui o tempo e a energia'
		);
		expect(work.claim).toContain(
			'Oferecer disponibilidade para provar competência pode consumir a própria capacidade de continuar'
		);
		expect(work.closure).toContain('reconhecer o custo de esforço de uma tarefa');
		expect(work.claim).not.toContain('A intimidade não exige exposição total');
		expect(work.closure).not.toBe(intimacy.closure);
		expect(work.factIds).not.toContain('return-house-8');
		expect(work.factIds).not.toContain('return-house-12');
	});

	it('changing the body changes the mechanism even in the same house pair', () => {
		const care = annualHouseInterplay(position('moon', 12), position('pluto', 8), 'trine')!;
		const thought = annualHouseInterplay(position('mercury', 12), position('saturn', 8), 'trine')!;
		expect(thought.claim).toContain(
			'esclarecer o que ainda está confuso pode ajudar você a dar medida ao compromisso'
		);
		expect(thought.claim).not.toContain('acolher o que você sente pode ajudar');
		expect(care.claim).not.toContain('dar medida ao compromisso');
		expect(thought.factIds).toContain('return-saturn');
		expect(thought.factIds).not.toContain('return-pluto');
	});

	it('the body-to-house assignment is preserved when the houses are swapped', () => {
		const first = annualHouseInterplay(position('sun', 8), position('moon', 12))!;
		const swapped = annualHouseInterplay(position('sun', 12), position('moon', 8))!;
		expect(first.claim).toContain(
			'Sol na casa 8 relaciona a direção que você deseja dar ao ciclo a compartilhar confiança'
		);
		expect(swapped.claim).toContain(
			'Sol na casa 12 relaciona a direção que você deseja dar ao ciclo a recolher-se'
		);
		expect(swapped.claim).toContain(
			'Lua na casa 8 associa a necessidade de amparo emocional a compartilhar confiança'
		);
		expect(first.claim).not.toBe(swapped.claim);
	});

	it('removing an aspect removes the geometric claim while retaining the actual thematic relation', () => {
		const first = position('moon', 12),
			second = position('pluto', 8);
		const contact = annualHouseInterplay(first, second, 'opposition')!;
		const thematic = annualHouseInterplay(first, second)!;
		expect(contact.claim).toContain('A oposição');
		expect(thematic.claim).not.toMatch(/oposição|quadratura|trígono|sextil|conjunção/);
		expect(thematic.claim).toContain('renegociar limites');
		expect(thematic.relation).toContain('sem inferir aspecto');
	});

	it('distinguishes shared-house concentration from opposing concerns without inventing house aspects', () => {
		const same = annualHouseInterplay(position('sun', 6), position('moon', 6), 'conjunction')!;
		const separate = annualHouseInterplay(position('sun', 6), position('moon', 10), 'sextile')!;
		expect(same.claim).toContain('ficam estreitamente ligados');
		expect(same.factIds).toEqual(['return-sun', 'return-moon', 'return-house-6']);
		expect(separate.claim).toContain('sextil');
		expect(separate.closure).not.toBe(same.closure);
	});

	it('covers every annual house pair with a concrete combined conclusion and traceable facts', () => {
		for (let first = 1; first <= 12; first++) {
			for (let second = 1; second <= 12; second++) {
				const reading = annualHouseInterplay(position('sun', first), position('moon', second));
				expect(reading, `annual houses ${first}/${second}`).not.toBeNull();
				expect(reading!.claim).not.toMatch(/undefined|null|primeiro campo|segundo campo/);
				expect(reading!.closure.length).toBeGreaterThan(70);
				expect(reading!.factIds).toContain(`return-house-${first}`);
				expect(reading!.factIds).toContain(`return-house-${second}`);
			}
		}
	});

	it('does not infer a house, supported body, or aspect when input evidence is missing', () => {
		const sun = position('sun', 8),
			moon = position('moon', 12);
		for (const house of [null, 0, 13, 1.5, Number.NaN]) {
			expect(annualHouseInterplay({ ...sun, house }, moon)).toBeNull();
		}
		expect(annualHouseInterplay(position('chiron', 8), moon)).toBeNull();
		expect(annualHouseInterplay(position('constructor', 8), moon)).toBeNull();
		expect(annualHouseInterplay(sun, { ...moon, body: 'sun' })).toBeNull();
		expect(annualHouseInterplay(sun, moon, 'quincunx')).toBeNull();
		expect(annualHouseInterplay(sun, moon, 'constructor')).toBeNull();
	});
});
