/** Anchor new rolling forecasts to server UTC; preserve stored inputs for idempotent retries. */
export function anchorForecastInput(raw: unknown, saved?: unknown, now = new Date()): unknown {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
	const input = raw as Record<string, unknown>;
	if (!['personal-calendar', 'career-forecast-30d'].includes(String(input.productId))) return raw;
	const prior =
		saved && typeof saved === 'object' && !Array.isArray(saved)
			? (saved as Record<string, unknown>)
			: null;
	// Historical civil-month requests retain their exact contract and digest.
	if (prior && prior.forecastPeriod !== 'rolling-30-days') return raw;
	return {
		...input,
		forecastPeriod: 'rolling-30-days',
		targetDate: prior?.targetDate ?? now.toISOString().slice(0, 10)
	};
}
