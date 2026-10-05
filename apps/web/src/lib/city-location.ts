export interface CityLocation {
	id: string;
	label: string;
	countryCode: string;
	latitude: number;
	longitude: number;
	timezone: string;
	source: string;
}
export const normalizeCity = (value: string) =>
	value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
export const cityShardKey = (query: string) =>
	[...normalizeCity(query)]
		.slice(0, 2)
		.reduce((hash, c) => (hash * 31 + c.codePointAt(0)!) % 1024, 0)
		.toString(16)
		.padStart(3, '0');

type CityRow = [string, string, string, string, number, number, string, number, string[]];
const validRow = (row: unknown): row is CityRow =>
	Array.isArray(row) &&
	row.length === 9 &&
	typeof row[0] === 'string' &&
	typeof row[1] === 'string' &&
	typeof row[2] === 'string' &&
	/^[A-Z]{2}$/.test(row[2]) &&
	typeof row[3] === 'string' &&
	typeof row[4] === 'number' &&
	Number.isFinite(row[4]) &&
	Math.abs(row[4]) <= 90 &&
	typeof row[5] === 'number' &&
	Number.isFinite(row[5]) &&
	Math.abs(row[5]) <= 180 &&
	typeof row[6] === 'string' &&
	row[6].includes('/') &&
	Number.isFinite(row[7]) &&
	Array.isArray(row[8]) &&
	row[8].every((alias: unknown) => typeof alias === 'string');
export function searchCityRows(data: unknown, query: string): CityLocation[] {
	const rows: CityRow[] = Array.isArray(data) ? data.filter(validRow) : [];
	const [name, ...qualifiers] = normalizeCity(query)
		.split(',')
		.map((v) => v.trim());
	if (name.length < 2) return [];
	const countries = new Intl.DisplayNames(['pt-BR'], { type: 'region' });
	return rows
		.filter(
			(row) =>
				row[8].some((alias) => alias.startsWith(name)) &&
				qualifiers.every((q) =>
					normalizeCity(`${row[3]} ${row[2]} ${countries.of(row[2])}`).includes(q)
				)
		)
		.sort((a, b) => Number(b[8].includes(name)) - Number(a[8].includes(name)) || b[7] - a[7])
		.slice(0, 12)
		.map((r) => ({
			id: r[0],
			label: [r[1], r[3], countries.of(r[2])].filter(Boolean).join(', '),
			countryCode: r[2],
			latitude: r[4],
			longitude: r[5],
			timezone: r[6],
			source: `geonames:${r[0]}/cities500-v1`
		}));
}

export interface CivilInstant {
	utcInstant: string;
	offset: string;
}
/** Invert IANA wall time. Round trips reject gaps and retain BOTH instants in a fold. */
export function civilInstants(date: string, time: string, timezone: string): CivilInstant[] {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(time))
		return [];
	const localDateTime = `${date}T${time.length === 5 ? `${time}:00` : time}`;
	const wall = Date.parse(`${localDateTime}Z`);
	if (
		!Number.isFinite(wall) ||
		new Date(wall).toISOString().slice(0, 19) !== localDateTime.slice(0, 19)
	)
		return [];
	try {
		const fmt = new Intl.DateTimeFormat('en-GB', {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hourCycle: 'h23'
		});
		const wallAt = (ms: number) => {
			const p = Object.fromEntries(
				fmt.formatToParts(new Date(ms)).map(({ type, value }) => [type, value])
			);
			return (
				Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`) +
				(((ms % 1000) + 1000) % 1000)
			);
		};
		const offsets = new Set(
			[-72, -24, 0, 24, 72].map((h) => {
				const ms = wall + h * 3600000;
				return wallAt(ms) - ms;
			})
		);
		return [...offsets]
			.map((offset) => ({ ms: wall - offset, offset }))
			.filter(
				({ ms }) =>
					wallAt(ms) === wall &&
					ms >= Date.parse('1900-01-01T00:00:00Z') &&
					ms <= Date.parse('2099-12-31T23:59:59.999Z')
			)
			.sort((a, b) => a.ms - b.ms)
			.map(({ ms, offset }) => {
				const seconds = Math.abs(offset / 1000);
				const pad = (n: number) => String(n).padStart(2, '0');
				return {
					utcInstant: new Date(ms).toISOString(),
					offset: `${offset < 0 ? '-' : '+'}${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`
				};
			});
	} catch {
		return [];
	}
}
export function resolvedCivilInstant(
	date: string,
	time: string,
	timezone: string,
	occurrence = ''
): CivilInstant {
	const options = civilInstants(date, time, timezone);
	if (!options.length)
		throw new Error(
			'Confira a data e a hora. Esse horário pode não existir na cidade escolhida devido a uma mudança de horário de verão.'
		);
	if (options.length > 1 && !options.some((option) => option.utcInstant === occurrence))
		throw new Error(
			'Esse horário ocorreu duas vezes na cidade escolhida. Selecione a ocorrência indicada no registro de nascimento.'
		);
	return options.find((option) => option.utcInstant === occurrence) ?? options[0];
}
