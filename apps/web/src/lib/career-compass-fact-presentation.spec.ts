import { describe, expect, it } from 'vitest';
import { calculateTrial } from './server/trial-calculation';
import { compassQaProfiles } from './trials/reconstruction/compass-qa-profiles';
import {
	careerCompassFactLabel,
	careerCompassFactValue,
	careerCompassReaderLimits,
	formatCareerCompassFactDisplay
} from './career-compass-fact-presentation';

describe('Career Compass fact presentation', () => {
	it('renders the 39 calculated facts with public labels and one decimal place', async () => {
		const profile = compassQaProfiles[0];
		const calculation = await calculateTrial(profile.input, profile.id);
		const original = structuredClone(calculation.facts);
		expect(calculation.facts).toHaveLength(39);

		for (const fact of calculation.facts) {
			const label = careerCompassFactLabel(fact.id);
			const full = formatCareerCompassFactDisplay(fact.display);
			const value = careerCompassFactValue(fact.id, fact.display);
			expect(label, fact.id).not.toBe(fact.id);
			expect(full, fact.id).not.toMatch(/\d+\.\d+°/);
			expect(value, fact.id).not.toMatch(/\d+\.\d+°/);
			expect(full, fact.id).not.toMatch(
				/movimento (?:direto|retrógrado) (?:da candidata|do candidato)/i
			);
			expect(value, fact.id).not.toMatch(new RegExp(`^${label}: ${label}:`));
			if (/\d+(?:\.\d+)?°/.test(fact.display)) {
				expect(full, fact.id).toMatch(/\d+,\d°/);
			}
		}
		expect(calculation.facts).toEqual(original);
	});

	it('keeps the complete display for prose and removes repeated prefixes in labelled lists', () => {
		const sun = 'Sol: 26.810900° de Touro; movimento direto da candidata';
		expect(formatCareerCompassFactDisplay(sun)).toBe('Sol: 26,8° de Touro; movimento direto');
		expect(careerCompassFactValue('position-sun', sun)).toBe('26,8° de Touro; movimento direto');
		expect(careerCompassFactValue('house-1', 'Cúspide 1 (Placidus): 27.668672° de Gêmeos')).toBe(
			'27,7° de Gêmeos'
		);
		expect(careerCompassFactValue('career-mc-ruler', 'Regente moderno do Meio do Céu: Marte')).toBe(
			'Marte'
		);
		expect(careerCompassFactLabel('career-aspect-2')).toBe('Aspecto natal 3');
		expect(careerCompassFactLabel('ascendant-unavailable')).toBe('Ascendente indisponível');
	});

	it('presents the current calculation notices in reader language without altering evidence', () => {
		const calculation = [
			'UTC aproxima UT1; ΔT usa o modelo da candidata, sem correção IERS de DUT1.',
			'Regras IANA do runtime não estão fixadas; o offset resolvido é registrado.',
			'Offset histórico fornecido pelo usuário; DST não é inferido.',
			'Sem prescrição de profissão ou promessa de emprego, renda, prosperidade financeira ou destino.'
		];
		const snapshot = [...calculation];
		const result = careerCompassReaderLimits(calculation, ['Considere sua experiência concreta.']);
		expect(result).toHaveLength(4);
		expect(result.join(' ')).not.toMatch(/UT1|IANA|DUT1|DST|offset|candidata/);
		expect(result).toContain('Confira a hora e o fuso de nascimento informados antes de usar a leitura.');
		expect(result).toContain('A leitura não determina profissão, emprego, renda ou destino.');
		expect(calculation).toEqual(snapshot);
	});

	it('does not leak unreviewed calculation notices into a reader export', () => {
		const result = careerCompassReaderLimits(['Internal version xyz; raw technical note.'], []);
		expect(result).toHaveLength(1);
		expect(result[0]).toContain('limitação de cálculo');
		expect(result.join(' ')).not.toContain('Internal version');
	});
});
