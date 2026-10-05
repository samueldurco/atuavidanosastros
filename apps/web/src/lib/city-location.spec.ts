import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { civilInstants, cityShardKey, resolvedCivilInstant, searchCityRows } from './city-location';
import { emptyPartnerForm, partnerFormValue } from './partner-form';
import { emptyNatalForm, natalFormCommand } from './natal-form';

const cities = (query: string) =>
	searchCityRows(
		JSON.parse(
			readFileSync(
				new URL(`../../static/locations/${cityShardKey(query)}.json`, import.meta.url),
				'utf8'
			)
		),
		query
	);
describe('self-hosted city search', () => {
	it('resolves accented cities, countries, coordinates and IANA zones from the shipped data', () => {
		const sp = cities('sao paulo, Brasil')[0];
		expect(sp.label).toContain('São Paulo');
		expect(sp.timezone).toBe('America/Sao_Paulo');
		expect(sp.latitude).toBeCloseTo(-23.55, 1);
		expect(sp.longitude).toBeCloseTo(-46.63, 1);
		expect(sp.source).toMatch(/^geonames:\d+\/cities500-v1$/);
		expect(cities('lisboa')[0].countryCode).toBe('PT');
		expect(cities('new york')[0].timezone).toBe('America/New_York');
		expect(cities('東京').length).toBeGreaterThan(0);
	});
	it('distinguishes homonyms, honors qualifiers and refuses malformed records', () => {
		expect(cities('springfield').length).toBeGreaterThan(1);
		expect(cities('springfield, Illinois')[0].label).toContain('Illinois');
		expect(cityShardKey('São')).toBe(cityShardKey('sao'));
		expect(searchCityRows([['malformed'], null], 'xx')).toEqual([]);
		expect(searchCityRows({}, 'xx')).toEqual([]);
	});
});
describe('automatic birth time resolution', () => {
	it('uses the birth-date DST rather than today or the device timezone', () => {
		expect(resolvedCivilInstant('2000-01-01', '12:30', 'America/Sao_Paulo').utcInstant).toBe(
			'2000-01-01T14:30:00.000Z'
		);
		expect(resolvedCivilInstant('2000-07-01', '12:30', 'America/Sao_Paulo').offset).toBe(
			'-03:00:00'
		);
		expect(resolvedCivilInstant('2000-01-01', '12:30', 'Asia/Kathmandu').offset).toBe('+05:45:00');
	});
	it('rejects impossible dates, gaps and unrecognized zones', () => {
		for (const [date, time, zone] of [
			['2000-02-30', '12:00', 'UTC'],
			['2018-11-04', '00:30', 'America/Sao_Paulo'],
			['2000-01-01', '24:00', 'UTC'],
			['2000-01-01', '12:00', 'Unknown/City']
		])
			expect(civilInstants(date, time, zone)).toEqual([]);
	});
	it('requires a deliberate occurrence for repeated hours, including half-hour changes', () => {
		const options = civilInstants('2020-11-01', '01:30', 'America/New_York');
		expect(options.map((o) => o.utcInstant)).toEqual([
			'2020-11-01T05:30:00.000Z',
			'2020-11-01T06:30:00.000Z'
		]);
		expect(() => resolvedCivilInstant('2020-11-01', '01:30', 'America/New_York')).toThrow(
			'duas vezes'
		);
		expect(
			resolvedCivilInstant('2020-11-01', '01:30', 'America/New_York', options[1].utcInstant)
		).toEqual(options[1]);
		expect(civilInstants('2020-04-05', '01:45', 'Australia/Lord_Howe')).toHaveLength(2);
	});
	it('preserves fractions and historical second offsets', () => {
		expect(resolvedCivilInstant('2000-02-29', '10:00:00.125', 'UTC').utcInstant).toBe(
			'2000-02-29T10:00:00.125Z'
		);
		expect(resolvedCivilInstant('1900-01-01', '12:00', 'Europe/Paris').offset).toBe('+00:09:21');
	});
	it('feeds the existing natal and partner contracts with city provenance', () => {
		const sp = cities('sao paulo, Brasil')[0];
		const form = {
			...emptyNatalForm(),
			date: '2000-01-01',
			time: '12:30',
			precision: 'EXACT' as const,
			location: sp.label,
			country: sp.countryCode,
			latitude: String(sp.latitude),
			longitude: String(sp.longitude),
			timezone: sp.timezone,
			source: sp.source
		};
		form.offset = resolvedCivilInstant(form.date, form.time, form.timezone).offset;
		expect(natalFormCommand(form, 0, true).command?.action).toBe('save-natal');
		const partner = partnerFormValue({ ...emptyPartnerForm(), ...form });
		expect(partner.error).toBe('');
		expect(partner.partner?.locationSource).toBe(sp.source);
		expect(partner.partner?.utcInstant).toBe('2000-01-01T14:30:00.000Z');
	});
});
