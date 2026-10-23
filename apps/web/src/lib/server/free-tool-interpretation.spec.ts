import { describe, expect, it } from 'vitest';
import {
	freeCareerSections,
	freeMoneySections,
	freeNatalPortrait,
	freeNatalSynthesis,
	freePairSection,
	freeRulerSection
} from './free-tool-interpretation';

describe('introductory readings deliver the interpretation inside their actual scope', () => {
	it('Sun, Moon and Ascendant retain distinct experiences in all twelve signs', () => {
		const sun = freeNatalPortrait('sun', 61).body;
		const moon = freeNatalPortrait('moon', 61).body;
		const asc = freeNatalPortrait('ascendant', 61).body;
		expect(sun).toContain('novidade termina');
		expect(moon).toContain('compreender uma emoção não a encerra');
		expect(asc).toContain('porta de entrada');
		for (let sign = 0; sign < 12; sign++) {
			expect(
				new Set(
					(['sun', 'moon', 'ascendant'] as const).map(
						(body) => freeNatalPortrait(body, sign * 30).body.split('\n\n')[1]
					)
				).size
			).toBe(3);
		}
	});

	it('changing the Moon modifies the relationship between curiosity and emotional comfort', () => {
		const earth = freeNatalSynthesis(61, 31).body;
		const water = freeNatalSynthesis(61, 91).body;
		expect(earth).toContain('curiosidade encontra uma necessidade de previsibilidade');
		expect(water).toContain('busca de explicações encontra uma necessidade de acolhimento');
		expect(water).not.toContain('necessidade de previsibilidade');
	});

	it('reversing two Moons reverses who needs consistency and who needs conversation', () => {
		const first = freePairSection('moon', 61, 31).body;
		const reversed = freePairSection('moon', 31, 61).body;
		expect(first).toContain('Para a pessoa B, presença consistente');
		expect(first).toContain('para a pessoa A, compreender e conversar');
		expect(reversed).toContain('Para a pessoa A, presença consistente');
		expect(reversed).toContain('para a pessoa B, compreender e conversar');
		expect(first).toContain('uma boa explicação pode não substituir a presença esperada');
		expect(first).not.toContain('Você pode gostar de imaginar mudanças');
	});

	it('the same two signs describe care, participation and approach differently', () => {
		const moon = freePairSection('moon', 61, 91).body;
		const sun = freePairSection('sun', 61, 91).body;
		const asc = freePairSection('ascendant', 61, 91).body;
		expect(moon).toContain('emoção foi acolhida');
		expect(sun).toContain('encontrar sentido ao compreender');
		expect(asc).toContain('perceber o clima antes de se expor');
		expect(sun).not.toContain('emoção foi acolhida');
		expect(asc).not.toContain('emoção foi acolhida');
	});

	it('identical lunar signs explain shared needs without inventing different comfort styles', () => {
		const same = freePairSection('moon', 61, 75).body;
		expect(same).toContain('Com a Lua no mesmo signo');
		expect(same).toContain('momento da resposta');
		expect(same).not.toContain('A diferença está no caminho');
		expect(same).not.toContain('Uma providência prática');
	});

	it('a ruler modifies follow-through without importing the Moon’s emotional need', () => {
		const steady = freeRulerSection(61, 'Mercúrio', 31).body;
		const direct = freeRulerSection(61, 'Mercúrio', 1).body;
		expect(steady).toContain('repetição e consistência');
		expect(direct).toContain('continuidade pede uma iniciativa concreta');
		expect(steady).not.toContain('necessidade de previsibilidade');
		expect(direct).not.toContain('repetição e consistência');
	});

	it('the Casa 2 ruler changes how knowledge serves the unchanged value lens', () => {
		const steady = freeMoneySections(61, 'Mercúrio', 31);
		const direct = freeMoneySections(61, 'Mercúrio', 1);
		expect(steady[0].body).toEqual(direct[0].body);
		expect(steady[1].body).toContain('conhecimento ganha valor de uso');
		expect(direct[1].body).toContain('investir esforço em cada ideia');
		expect(steady[1].body).not.toContain('curiosidade encontra uma necessidade de previsibilidade');
	});

	it('all sign pairs preserve both people and form complete sentences', () => {
		for (let a = 0; a < 12; a++)
			for (let b = 0; b < 12; b++) {
				const pair = (['sun', 'moon', 'ascendant'] as const).map((body) =>
					freePairSection(body, a * 30, b * 30)
				);
				for (const section of pair) {
					expect(section.body).toContain('pessoa A');
					expect(section.body).toContain('pessoa B');
				}
				const sections = [
					...pair,
					freeRulerSection(a * 30, 'Regente', b * 30),
					...freeMoneySections(a * 30, 'Regente', b * 30),
					freeNatalSynthesis(a * 30, b * 30),
					...freeCareerSections(a * 30)
				];
				for (const section of sections)
					expect(section.body).not.toMatch(
						/undefined|NaN|(?:^|\s)(?:a a|a os|em a|em os)(?=\s|[.,;:!?]|$)|Lua em \w+, associado/
					);
			}
	});

	it('changes the resource conclusion when the ruler changes, while keeping the cusp meaning', () => {
		const initiative = freeMoneySections(40, 'Vênus', 5);
		const continuity = freeMoneySections(40, 'Vênus', 160);
		expect(initiative[0]).toEqual(continuity[0]);
		expect(initiative[0]!.body).toContain('continuam servindo');
		expect(initiative[1]!.body).toContain('comprometer essa base');
		expect(continuity[1]!.body).toContain('manter algo custa mais tempo');
		expect(initiative[1]!.body).not.toEqual(continuity[1]!.body);
	});

	it('changes what security means when the cusp changes, even with the same ruler style', () => {
		const stable = freeMoneySections(40, 'Vênus', 160)[0]!.body;
		const shared = freeMoneySections(190, 'Vênus', 160)[0]!.body;
		expect(stable).toContain('Um objeto');
		expect(shared).toContain('reciprocidade');
		expect(shared).toContain('quanto tempo ou esforço');
		expect(stable).not.toContain('reciprocidade');
	});

	it('connects professional expression to concrete work, rather than a generic Sun portrait', () => {
		const firstStep = freeCareerSections(5)
			.map((section) => section.body)
			.join(' ');
		const commitment = freeCareerSections(275)
			.map((section) => section.body)
			.join(' ');
		expect(firstStep).toContain('chegar à entrega');
		expect(firstStep).toContain('iniciar mais frentes');
		expect(commitment).toContain('presença permanente de uma única pessoa');
		expect(commitment).not.toContain('chegar à entrega');
	});

	it('keeps emotional needs distinct from shared direction in a comparison', () => {
		const emotional = freePairSection('moon', 5, 40).body;
		const direction = freePairSection('sun', 5, 40).body;
		expect(emotional).not.toEqual(direction);
		expect(emotional).toMatch(/cuidado|conforto|amparo/);
		expect(direction).toMatch(/projeto|interesse|escolha/);
		expect(emotional).not.toContain('não calcula aspectos');
	});

	it('makes a change in the Moon modify the interpretation of an unchanged Sun', () => {
		const sameRhythm = freeNatalSynthesis(5, 125).body;
		const differentRhythm = freeNatalSynthesis(5, 40).body;
		expect(sameRhythm).toContain('resposta viva e imediata');
		expect(differentRhythm).toContain('ritmo, os recursos e a continuidade');
		expect(sameRhythm).not.toEqual(differentRhythm);
	});

	it('does not interrupt the interpretation with repeated scope notices or instructions to finish it', () => {
		const readings = Array.from({ length: 12 }, (_, index) => [
			...freeMoneySections(index * 30 + 5, 'Vênus', ((index + 3) % 12) * 30 + 5),
			...freeCareerSections(index * 30 + 5),
			freePairSection('moon', index * 30 + 5, ((index + 1) % 12) * 30 + 5)
		]).flat();
		for (const reading of readings) {
			expect(reading.body).not.toMatch(
				/sem substituir sua decisão|não recomenda uma decisão de investimento|não estima sua situação financeira|a leitura não determina|Esta comparação considera|a síntese se completa quando/i
			);
			expect(reading.body).not.toContain('undefined');
		}
	});
});
