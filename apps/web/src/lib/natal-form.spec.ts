import { describe, expect, it } from 'vitest';
import { emptyNatalForm, formFromNatal, natalFormCommand, type NatalForm } from './natal-form';
const fixture = (): NatalForm => ({
	date: '2000-01-01',
	time: '12:30',
	precision: 'APPROXIMATE',
	location: 'Local sintético',
	country: 'br',
	latitude: '-23.5',
	longitude: '-46.6',
	timezone: 'America/Sao_Paulo',
	offset: '-02:00',
	source: 'Fixture local'
});
describe('natal form — explicit inputs only', () => {
	it('starts empty without invented hour, place or consent', () => {
		expect(emptyNatalForm().precision).toBe('UNKNOWN');
		expect(Object.values(emptyNatalForm()).filter(Boolean)).toEqual(['UNKNOWN']);
		expect(natalFormCommand(fixture(), 0, false).command).toBeNull();
		expect(natalFormCommand({ ...fixture(), precision: 'UNKNOWN' }, 0, true).command).toBeNull();
	});
	it('converts an explicit offset without using the device timezone and preserves uncertainty', () => {
		const command = natalFormCommand(fixture(), 7, true).command;
		expect(command).toMatchObject({
			action: 'save-natal',
			expectedRevision: 7,
			natal: {
				utcInstant: '2000-01-01T14:30:00.000Z',
				timePrecision: 'APPROXIMATE',
				countryCode: 'BR'
			}
		});
	});
	it.each(['2001-02-29', '2000-02-30', '2000-13-01', '1899-12-31', '2100-01-01'])(
		'rejects invalid or out-of-range date %s',
		(date) => {
			expect(natalFormCommand({ ...fixture(), date }, 0, true).command).toBeNull();
		}
	);
	it.each(['24:00', '12:60', '12:00:60', '2:30'])('rejects invalid time %s', (time) => {
		expect(natalFormCommand({ ...fixture(), time }, 0, true).command).toBeNull();
	});
	it.each(['', ' ', 'NaN', 'Infinity', '1e2', '0x10', '-23,5', '91'])(
		'rejects invalid latitude %s',
		(latitude) => {
			expect(natalFormCommand({ ...fixture(), latitude }, 0, true).command).toBeNull();
		}
	);
	it.each(['', '03:00', '+24:00', '-03:60', '+00:00:60'])('rejects invalid offset %s', (offset) => {
		expect(natalFormCommand({ ...fixture(), offset }, 0, true).command).toBeNull();
	});
	it('roundtrips historical seconds and fractional local seconds', () => {
		const original = { ...fixture(), time: '12:30:01.123', offset: '-03:06:28' };
		const command = natalFormCommand(original, 3, true).command;
		if (command?.action !== 'save-natal') throw new Error('fixture rejected');
		const recovered = formFromNatal({ ...command.natal, version: 4 });
		expect(recovered.offset).toBe(original.offset);
		expect(recovered.time).toBe(original.time);
		expect(natalFormCommand(recovered, 3, true).command).toEqual(command);
	});
});
