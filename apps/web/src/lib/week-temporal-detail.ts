const bodies = [
	'sun',
	'moon',
	'mercury',
	'venus',
	'mars',
	'jupiter',
	'saturn',
	'uranus',
	'neptune',
	'pluto'
] as const;
const aspects = ['conjunction', 'sextile', 'square', 'trine', 'opposition'] as const;
const thresholds = ['exact', 'lower-orb', 'upper-orb'] as const;
const modes = ['bracketed-crossing', 'grid-contact-run'] as const;
const directions = ['increasing', 'decreasing', 'not-established'] as const;
export const weekBodyLabel: Record<string, string> = {
	sun: 'Sol',
	moon: 'Lua',
	mercury: 'Mercúrio',
	venus: 'Vênus',
	mars: 'Marte',
	jupiter: 'Júpiter',
	saturn: 'Saturno',
	uranus: 'Urano',
	neptune: 'Netuno',
	pluto: 'Plutão'
};
export const weekAspectLabel: Record<string, string> = {
	conjunction: 'conjunção',
	sextile: 'sextil',
	square: 'quadratura',
	trine: 'trígono',
	opposition: 'oposição'
};
export const weekModeLabel: Record<string, string> = {
	'bracketed-crossing': 'cruzamento delimitado por observações',
	'grid-contact-run': 'contato observado na grade'
};
export const weekPhaseLabel: Record<string, string> = {
	increasing: 'fase geométrica crescente',
	decreasing: 'fase geométrica decrescente',
	'not-established': 'direção geométrica não estabelecida'
};

export interface WeekTemporalDetail {
	version: 'atv-week-reading-calculation/1.2.0';
	eventCount: number;
	windowCount: number;
	events: {
		id: string;
		transitBody: string;
		natalBody: string;
		aspect: string;
		threshold: string;
		mode: string;
		from: string;
		to: string;
		phaseDirection: string;
	}[];
	windows: {
		transitBody: string;
		natalBody: string;
		aspect: string;
		from: string;
		to: string;
		startClipped: boolean;
		endClipped: boolean;
	}[];
}

const record = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === 'object' && !Array.isArray(value);
const oneOf = (value: unknown, values: readonly string[]): value is string =>
	typeof value === 'string' && values.includes(value);
const instant = (value: unknown): value is string =>
	typeof value === 'string' &&
	/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) &&
	!Number.isNaN(Date.parse(value)) &&
	new Date(value).toISOString() === value;
const span = (
	value: Record<string, unknown>
): value is Record<string, unknown> & { from: string; to: string } =>
	instant(value.from) && instant(value.to) && Date.parse(value.from) <= Date.parse(value.to);
const count = (value: unknown, max: number): value is number =>
	Number.isInteger(value) && (value as number) >= 0 && (value as number) <= max;

/** Whitelist projection from the owner-only, released SQL reader; never exposes raw snapshot data. */
export function parseWeekTemporalDetail(value: unknown): WeekTemporalDetail | null {
	if (
		!record(value) ||
		value.version !== 'atv-week-reading-calculation/1.2.0' ||
		!count(value.eventCount, 4096) ||
		!count(value.windowCount, 2048) ||
		!Array.isArray(value.events) ||
		value.events.length > 24 ||
		!Array.isArray(value.windows) ||
		value.windows.length > 12 ||
		value.events.length !== Math.min(value.eventCount, 24) ||
		value.windows.length !== Math.min(value.windowCount, 12)
	)
		return null;
	const events: WeekTemporalDetail['events'] = [];
	for (const event of value.events) {
		if (
			!record(event) ||
			typeof event.id !== 'string' ||
			!/^[a-z0-9-]{1,120}$/.test(event.id) ||
			!oneOf(event.transitBody, bodies) ||
			!oneOf(event.natalBody, bodies) ||
			!oneOf(event.aspect, aspects) ||
			!oneOf(event.threshold, thresholds) ||
			!oneOf(event.mode, modes) ||
			!oneOf(event.phaseDirection, directions) ||
			!span(event) ||
			events.some((entry) => entry.id === event.id)
		)
			return null;
		events.push({
			id: event.id,
			transitBody: event.transitBody,
			natalBody: event.natalBody,
			aspect: event.aspect,
			threshold: event.threshold,
			mode: event.mode,
			from: event.from,
			to: event.to,
			phaseDirection: event.phaseDirection
		});
	}
	const windows: WeekTemporalDetail['windows'] = [];
	for (const window of value.windows) {
		if (
			!record(window) ||
			!oneOf(window.transitBody, bodies) ||
			!oneOf(window.natalBody, bodies) ||
			!oneOf(window.aspect, aspects) ||
			!span(window) ||
			typeof window.startClipped !== 'boolean' ||
			typeof window.endClipped !== 'boolean'
		)
			return null;
		windows.push({
			transitBody: window.transitBody,
			natalBody: window.natalBody,
			aspect: window.aspect,
			from: window.from,
			to: window.to,
			startClipped: window.startClipped,
			endClipped: window.endClipped
		});
	}
	return {
		version: value.version,
		eventCount: value.eventCount,
		windowCount: value.windowCount,
		events,
		windows
	};
}
