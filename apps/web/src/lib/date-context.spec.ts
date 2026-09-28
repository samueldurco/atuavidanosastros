import { expect, it } from 'vitest';
import { DATE_CONTEXT_REQUEST_VERSION, parseDateRequestInput } from './date-request';
import { validReportedContext } from './reported-context';

const command = (changes: Record<string, unknown> = {}) => ({
	version: DATE_CONTEXT_REQUEST_VERSION,
	productId: 'date-reading',
	expectedRevision: 1,
	targetDate: '2028-02-29',
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
])('preserves optional date report %# exactly', (context) => {
	expect(validReportedContext(context)).toBe(true);
	expect(parseDateRequestInput(command({ context }))).toEqual(command({ context }));
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
])('rejects invalid context %#', (context) => {
	expect(validReportedContext(context)).toBe(false);
	expect(parseDateRequestInput(command({ context }))).toBeNull();
});
it('accepts omission and v1 unchanged; rejects aliases, version or product escalation', () => {
	expect(parseDateRequestInput(command())).toEqual(command());
	expect(parseDateRequestInput(command({ version: 'atv-date-request/1' }))).toBeTruthy();
	for (const changes of [
		{ version: 'atv-date-request/1', context: 'Relato' },
		{ version: 'atv-date-request/3' },
		{ birth: {} },
		{ ownerId: 'forged' },
		{ dateContext: 'alias' },
		{ timezone: 'UTC' },
		...['career-compass', 'weekly-sky', 'solar-return', 'personal-horoscope'].map((productId) => ({
			productId
		}))
	])
		expect(parseDateRequestInput(command(changes))).toBeNull();
});
