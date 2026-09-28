export const REPORTED_CONTEXT_LIMIT = 1200;
/** Preserve the exact report; reject controls and invalid Unicode before allocation. */
export const validReportedContext = (v: unknown): v is string =>
	typeof v === 'string' &&
	v.trim().length > 0 &&
	v.length <= REPORTED_CONTEXT_LIMIT &&
	![...v].some((c) => {
		const code = c.codePointAt(0)!;
		return (
			(code < 32 && ![9, 10, 13].includes(code)) ||
			(code >= 127 && code <= 159) ||
			(code >= 0xd800 && code <= 0xdfff)
		);
	});
