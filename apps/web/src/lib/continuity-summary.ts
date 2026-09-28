export const CONTINUITY_SUMMARY_VERSION = 'atv-continuity-summary/1';

export interface ContinuitySummarySnapshot {
	version: typeof CONTINUITY_SUMMARY_VERSION;
	enabled: boolean;
	consentState: 'granted' | 'revoked';
	counts: { total: number; relevant: number; irrelevant: number; unreviewed: number };
}

export type ContinuitySummary =
	| { state: 'PREVIEW' | 'UNAVAILABLE' }
	| { state: 'AVAILABLE'; snapshot: ContinuitySummarySnapshot };

function exact(value: unknown, keys: string[]): value is Record<string, unknown> {
	return (
		!!value &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		Object.keys(value).length === keys.length &&
		keys.every((key) => Object.hasOwn(value, key))
	);
}

/** Reject unexpected content instead of serializing notes into dashboard data. */
export function parseContinuitySummary(value: unknown): ContinuitySummarySnapshot | null {
	if (
		!exact(value, ['version', 'enabled', 'consentState', 'counts']) ||
		value.version !== CONTINUITY_SUMMARY_VERSION ||
		typeof value.enabled !== 'boolean' ||
		(value.consentState !== 'granted' && value.consentState !== 'revoked') ||
		!exact(value.counts, ['total', 'relevant', 'irrelevant', 'unreviewed'])
	)
		return null;
	const { total, relevant, irrelevant, unreviewed } = value.counts;
	if (
		![total, relevant, irrelevant, unreviewed].every(
			(n) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 100
		)
	)
		return null;
	const counts = { total, relevant, irrelevant, unreviewed } as ContinuitySummarySnapshot['counts'];
	if (counts.total !== counts.relevant + counts.irrelevant + counts.unreviewed) return null;
	return {
		version: CONTINUITY_SUMMARY_VERSION,
		enabled: value.enabled,
		consentState: value.consentState,
		counts
	};
}
