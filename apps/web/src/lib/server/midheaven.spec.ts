import { describe, expect, it } from 'vitest';
import { fingerprintMaterial, parseCalculationInput } from './midheaven';

const validInput = {
	utcInstant: '2000-01-01T12:00:00.000Z',
	localDateTime: '2000-01-01T09:00:00',
	timezone: 'UTC-03:00',
	latitude: -23.5505,
	longitude: -46.6333,
	locationSource: 'user-provided-coordinates'
};

describe('entrada de cálculo persistível', () => {
	it('aceita somente coordenadas e instante válidos', () => {
		expect(parseCalculationInput(validInput)).toMatchObject(validInput);
		expect(parseCalculationInput({ ...validInput, latitude: 91 })).toBeNull();
		expect(parseCalculationInput({ ...validInput, utcInstant: 'not-a-date' })).toBeNull();
		for (const latitude of [null, '', false, [], ' '])
			expect(parseCalculationInput({ ...validInput, latitude })).toBeNull();
		expect(parseCalculationInput({ ...validInput, timezone: '' })).toBeNull();
		expect(parseCalculationInput({ ...validInput, timezone: 'America/Sao_Paulo' })).toBeNull();
		expect(parseCalculationInput({ ...validInput, utcInstant: '2000-02-30T12:00:00Z' })).toBeNull();
		expect(parseCalculationInput({ ...validInput, utcInstant: '2000-01-01T12:00:00' })).toBeNull();
	});

	it('cria material de fingerprint estável sem armazenar dados em texto', () => {
		const input = parseCalculationInput(validInput);
		expect(input).not.toBeNull();
		expect(fingerprintMaterial(input!)).toBe(fingerprintMaterial(input!));
	});
});
