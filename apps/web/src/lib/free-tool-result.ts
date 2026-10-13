import type { FreeToolResult } from './free-tools';

export const savedFreeToolIds = [
	'ascendente',
	'mapa-astral',
	'carta-do-dia',
	'tarot-sim-ou-nao',
	'combinacao-do-casal',
	'registro-de-sonho'
] as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (value: unknown, max: number): value is string =>
	typeof value === 'string' && value.length <= max;

/** Bound stored and runtime data before a reader renders it. */
export function parseFreeToolResult(value: unknown): FreeToolResult | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	const r = value as Record<string, unknown>;
	if (
		r.version !== 'atv-free-tool-result/1.0.0' ||
		typeof r.id !== 'string' ||
		!uuid.test(r.id) ||
		!savedFreeToolIds.some((id) => id === r.tool) ||
		typeof r.createdAt !== 'string' ||
		!Number.isFinite(Date.parse(r.createdAt)) ||
		!text(r.title, 180) ||
		!text(r.summary, 6000)
	)
		return null;
	if (
		!Array.isArray(r.facts) ||
		r.facts.length > 40 ||
		!r.facts.every(
			(f) =>
				f &&
				text(f.id, 80) &&
				text(f.label, 180) &&
				text(f.value, 6000) &&
				['calculated', 'drawn', 'reported'].includes(f.kind) &&
				text(f.source, 500)
		)
	)
		return null;
	if (
		!Array.isArray(r.sections) ||
		r.sections.length > 30 ||
		!r.sections.every((s) => s && text(s.id, 80) && text(s.title, 180) && text(s.body, 10000))
	)
		return null;
	if (!Array.isArray(r.limits) || r.limits.length > 30 || !r.limits.every((l) => text(l, 2000)))
		return null;
	if (r.chart !== undefined) {
		const c = r.chart as Record<string, unknown>;
		if (
			!c ||
			!text(c.svg, 64000) ||
			!Array.isArray(c.positions) ||
			c.positions.length > 20 ||
			!c.positions.every(
				(p) =>
					p &&
					text(p.body, 80) &&
					text(p.name, 180) &&
					Number.isFinite(p.longitude) &&
					p.longitude >= 0 &&
					p.longitude < 360
			) ||
			!Array.isArray(c.cusps) ||
			c.cusps.length > 12 ||
			!c.cusps.every((n) => Number.isFinite(n) && n >= 0 && n < 360) ||
			!['ok', 'not-applicable'].includes(c.status as string)
		)
			return null;
		for (const point of [c.ascendant, c.midheaven])
			if (
				point !== null &&
				!(typeof point === 'number' && Number.isFinite(point) && point >= 0 && point < 360)
			)
				return null;
	}
	if (r.draw !== undefined) {
		const d = r.draw as Record<string, unknown>;
		if (
			!d ||
			!text(d.cardId, 80) ||
			!text(d.name, 180) ||
			d.orientation !== 'upright' ||
			!text(d.deckVersion, 120) ||
			!text(d.algorithmVersion, 120)
		)
			return null;
	}
	if (new TextEncoder().encode(JSON.stringify(value)).byteLength > 100000) return null;
	return value as FreeToolResult;
}
