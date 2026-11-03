import { describe, expect, it } from 'vitest';
import { calculatePersonalArcana } from './personal-arcana';

const today = '2026-11-02';

describe('arcano pessoal pela data de nascimento', () => {
	it.each([
		['2000-01-01', 4, 4, 'O Imperador', [4]],
		['2000-09-29', 22, 0, 'O Louco', [22]],
		['2001-09-29', 5, 5, 'O Hierofante', [23, 5]],
		['2000-01-05', 8, 8, 'A Força', [8]],
		['2000-01-08', 11, 11, 'A Justiça', [11]],
		['2000-09-28', 21, 21, 'O Mundo', [21]]
	] as const)('%s → %s', (date, number, cardNumber, name, totals) => {
		const result = calculatePersonalArcana(date, today);
		expect(result).toMatchObject({ number, cardNumber, card: { id: `major-${cardNumber}`, name } });
		expect(result?.steps.map((step) => step.total)).toEqual(totals);
	});
	it('shows digits in the day/month/year order used in the explanation', () => {
		expect(calculatePersonalArcana('2001-09-29', today)?.steps).toEqual([
			{ digits: [2, 9, 0, 9, 2, 0, 0, 1], total: 23 },
			{ digits: [2, 3], total: 5 }
		]);
	});
	it.each(['', '2001-02-29', '2026-04-31', '0000-01-01', '2026-11-03', '29/09/2001'])(
		'rejeita data inválida ou futura %s',
		(date) => expect(calculatePersonalArcana(date, today)).toBeNull()
	);
	it('aceita dia bissexto e o dia de hoje', () => {
		expect(calculatePersonalArcana('2000-02-29', today)).not.toBeNull();
		expect(calculatePersonalArcana(today, today)).not.toBeNull();
	});
});
