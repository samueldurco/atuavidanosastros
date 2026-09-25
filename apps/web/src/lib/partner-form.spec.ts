import { expect, it } from 'vitest';
import { emptyPartnerForm, partnerFormValue, type PartnerForm } from './partner-form';
const form = (): PartnerForm => ({
	date: '2000-02-29',
	time: '10:00:00.125',
	precision: 'EXACT',
	timezone: 'UTC',
	offset: '+00:00',
	latitude: '51.5',
	longitude: '-.12'
});
it('starts entirely blank, without an inferred precision or location', () => {
	expect(Object.values(emptyPartnerForm()).every((v) => v === '')).toBe(true);
	expect(partnerFormValue(emptyPartnerForm()).partner).toBeNull();
});
it('produces only seven birth fields with constant technical provenance', () => {
	expect(partnerFormValue(form())).toEqual({
		error: '',
		partner: {
			localDateTime: '2000-02-29T10:00:00.125',
			utcInstant: '2000-02-29T10:00:00.125Z',
			timezone: 'UTC',
			latitude: 51.5,
			longitude: -0.12,
			timePrecision: 'EXACT',
			locationSource: 'manual-partner/1'
		}
	});
});
it.each([
	{ precision: 'UNKNOWN' },
	{ precision: 'APPROXIMATE' },
	{ date: '2001-02-29' },
	{ date: '1900-02-29' },
	{ time: '24:00' },
	{ time: '' },
	{ date: '1899-12-31' },
	{ date: '2100-01-01' },
	{ offset: '-24:00' },
	{ offset: '+00:60' },
	{ offset: '+01:00' },
	{ timezone: 'Invalid/Zone' },
	{ timezone: '' },
	{ latitude: '' },
	{ latitude: 'NaN' },
	{ latitude: '91' },
	{ longitude: '-181' },
	{ latitude: '1,5' },
	{ date: '2024-03-10', time: '02:30', timezone: 'America/New_York', offset: '-05:00' }
])('rejects invalid or ambiguous data %#', (change) => {
	const value = partnerFormValue({ ...form(), ...change });
	expect(value.partner).toBeNull();
	expect(value.error).not.toBe('');
});
it.each(['-04:00', '-05:00'])('preserves explicitly selected DST overlap %s', (offset) => {
	const value = partnerFormValue({
		...form(),
		date: '2024-11-03',
		time: '01:30',
		timezone: 'America/New_York',
		offset
	});
	expect(value.error).toBe('');
	expect(value.partner?.utcInstant).toBe(
		offset === '-04:00' ? '2024-11-03T05:30:00.000Z' : '2024-11-03T06:30:00.000Z'
	);
});
it('accepts historical seconds and fractional birth time without rounding', () => {
	const value = partnerFormValue({
		...form(),
		date: '1900-06-01',
		time: '10:00:00.125',
		timezone: 'Europe/Paris',
		offset: '+00:09:21'
	});
	expect(value.partner?.utcInstant).toBe('1900-06-01T09:50:39.125Z');
});
