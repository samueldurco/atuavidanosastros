import { tarotDeck } from '@atv/domain';

export interface ArcanaSum {
	digits: number[];
	total: number;
}

function sumDigits(value: string): ArcanaSum {
	const digits = [...value].map(Number);
	return { digits, total: digits.reduce((sum, digit) => sum + digit, 0) };
}

/** Birth date in ISO format. The displayed sum follows the reader's DD/MM/YYYY order. */
export function calculatePersonalArcana(birthDate: string, today: string) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || birthDate.startsWith('0000') || birthDate > today)
		return null;
	const date = new Date(birthDate + 'T00:00:00Z');
	if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== birthDate)
		return null;

	const [year, month, day] = birthDate.split('-');
	const steps = [sumDigits(day! + month! + year!)];
	let number = steps[0]!.total;
	while (number > 22) {
		const step = sumDigits(String(number));
		steps.push(step);
		number = step.total;
	}
	const cardNumber = number === 22 ? 0 : number;
	const card = tarotDeck.find((candidate) => candidate.id === `major-${cardNumber}`)!;
	return { number, cardNumber, card, steps };
}
