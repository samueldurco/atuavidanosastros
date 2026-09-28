import { expect, it } from 'vitest';
import {
	CAREER_REQUEST_VERSION,
	parseNatalRequestInput,
	validCareerContext
} from './natal-request';

const command = (changes: Record<string, unknown> = {}) => ({
	version: CAREER_REQUEST_VERSION,
	productId: 'career-compass',
	expectedRevision: 1,
	consent: {
		storage: true,
		policyVersion: 'atv-input-consent/1',
		partner: false,
		continuity: false
	},
	...changes
});
it.each([
	'Relato sintético',
	'  Reflexão\ncom pausas\t  ',
	'a'.repeat(1200),
	'界'.repeat(1200),
	'🌌'.repeat(600)
])('accepts exact professional report %# without normalization', (context) => {
	expect(validCareerContext(context)).toBe(true);
	expect(parseNatalRequestInput(command({ context }))).toEqual(command({ context }));
});
it.each([
	null,
	undefined,
	1,
	{},
	[],
	'',
	' \t\n',
	'\u00a0\u2000\ufeff',
	'a'.repeat(1201),
	'🌌'.repeat(601),
	'a\u0000',
	'a\u0008',
	'a\u007f',
	'a\u0085',
	'\ud800',
	'\udfff'
])('rejects invalid report %#', (context) => {
	expect(validCareerContext(context)).toBe(false);
	expect(parseNatalRequestInput(command({ context }))).toBeNull();
});
it('omission is optional, v1 is preserved, context remains career/v2-only and cannot inject other fields', () => {
	expect(parseNatalRequestInput(command())).toEqual(command());
	expect(parseNatalRequestInput(command({ version: 'atv-natal-request/1' }))).toBeTruthy();
	for (const changes of [
		{ version: 'atv-natal-request/1', context: 'Relato' },
		{ version: 'atv-natal-request/3' },
		{ birth: {} },
		{ ownerId: 'forged' },
		{ professionalContext: 'alias' },
		...[
			'birth-chart',
			'three-pillars',
			'ascendant',
			'midheaven',
			'date-reading',
			'pair-preview'
		].map((productId) => ({ productId }))
	])
		expect(parseNatalRequestInput(command(changes))).toBeNull();
});
