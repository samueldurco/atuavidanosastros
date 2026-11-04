import { describe, expect, it } from 'vitest';
import {
	formatLaunchDate,
	formatLaunchLocalDateTime,
	formatLaunchUtcInstant,
	formatLaunchUtcPeriod
} from './launch-reading-dates';

describe('launch reading date presentation', () => {
	it('keeps the ceremony on its reported local date even across a UTC day boundary', () => {
		expect(formatLaunchLocalDateTime('2027-03-20T23:30:00', 'São Paulo')).toBe(
			'20/03/2027 às 23h30 (horário de São Paulo)'
		);
		expect(formatLaunchUtcInstant('2027-03-21T02:30:00.000Z')).toBe('21/03/2027 às 02h30 (UTC)');
	});

	it('preserves nonzero seconds and milliseconds rather than changing the instant', () => {
		expect(formatLaunchLocalDateTime('2027-03-20T10:30:15', 'São Paulo')).toContain('10h30min15s');
		expect(formatLaunchUtcInstant('2026-11-16T00:00:00.125Z')).toBe(
			'16/11/2026 às 00h00min00,125s (UTC)'
		);
	});

	it('states the exact exclusive UTC period and never relies on the workstation timezone', () => {
		expect(formatLaunchUtcPeriod('2026-11-01', '2026-12-01')).toBe(
			'De 01/11/2026 às 00h00 até 01/12/2026 às 00h00 (UTC; o horário final não está incluído)'
		);
		expect(formatLaunchDate('2026-11-01')).toBe('01/11/2026');
	});

	it('rejects malformed or impossible dates and an unlabelled UTC instant', () => {
		expect(() => formatLaunchDate('2026-02-30')).toThrow();
		expect(() => formatLaunchDate('01/11/2026')).toThrow();
		expect(() => formatLaunchLocalDateTime('2027-03-20T24:00:00', 'São Paulo')).toThrow();
		expect(() => formatLaunchUtcInstant('2026-11-16T00:00:00')).toThrow();
	});
});
