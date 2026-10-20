import { describe, expect, it } from 'vitest';
import {
	freeCareerSections,
	freeMoneySections,
	freeNatalPortrait,
	freeNatalSynthesis,
	freePairSection,
	freeRulerSection
} from './free-tool-interpretation';

describe('introductory interpretations preserve the subject of each relationship', () => {
	it('Sun, Moon and Ascendant in the same sign develop different experiences', () => {
		const sun = freeNatalPortrait('sun', 61).body;
		const moon = freeNatalPortrait('moon', 61).body;
		const asc = freeNatalPortrait('ascendant', 61).body;
		expect(sun).toContain('novidade termina');
		expect(moon).toContain('compreender uma emoção não a encerra');
		expect(asc).toContain('porta de entrada');
		expect(new Set([sun, moon, asc].map((text) => text.split('\n\n')[1])).size).toBe(3);
		for (const longitude of Array.from({ length: 12 }, (_, i) => i * 30)) {
			expect(
				new Set(
					['sun', 'moon', 'ascendant'].map(
						(body) =>
							freeNatalPortrait(body as 'sun' | 'moon' | 'ascendant', longitude).body.split(
								'\n\n'
							)[1]
					)
				).size
			).toBe(3);
		}
	});
	it('changing the Moon changes the specific relation between curiosity and emotional comfort', () => {
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
	it('identical lunar signs explain shared needs instead of inventing different comfort styles', () => {
		const same = freePairSection('moon', 61, 75).body;
		expect(same).toContain('Com a Lua no mesmo signo');
		expect(same).toContain('momento da resposta');
		expect(same).not.toContain('A diferença está no caminho');
		expect(same).not.toContain('Uma providência prática');
	});
	it('a ruler modifies follow-through rather than importing the Moon’s emotional need', () => {
		const steady = freeRulerSection(61, 'Mercúrio', 31).body;
		const direct = freeRulerSection(61, 'Mercúrio', 1).body;
		expect(steady).toContain('repetição e consistência');
		expect(direct).toContain('continuidade pede uma iniciativa concreta');
		expect(steady).not.toContain('necessidade de previsibilidade');
		expect(direct).not.toContain('repetição e consistência');
	});
	it('changing a Casa 2 ruler keeps the value lens and changes how resources serve it', () => {
		const steady = freeMoneySections(61, 'Mercúrio', 31);
		const direct = freeMoneySections(61, 'Mercúrio', 1);
		expect(steady[0].body).toEqual(direct[0].body);
		expect(steady[1].body).toContain('conhecimento ganha valor de uso');
		expect(direct[1].body).toContain('investir esforço em cada ideia');
		expect(steady[1].body).not.toContain('curiosidade encontra uma necessidade de previsibilidade');
	});
	it('every sign combination is complete and retains the two-person scope', () => {
		for (let a = 0; a < 12; a++)
			for (let b = 0; b < 12; b++) {
				const pair = (['sun', 'moon', 'ascendant'] as const).map((body) =>
					freePairSection(body, a * 30, b * 30)
				);
				for (const section of pair) {
					expect(section.body).toContain('pessoa A');
					expect(section.body).toContain('pessoa B');
					expect(section.body).toContain('não calcula aspectos');
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
});
