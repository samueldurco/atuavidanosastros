import { parseFreeToolResult } from './free-tool-result';
import type { FreeToolResult } from './free-tools';

export interface FreeToolQuota {
	mode: 'corrections' | 'daily-draw' | 'daily-entry';
	remainingCorrections: number | null;
	resetsAt: string;
	profileRevision: number;
	stale: boolean;
}
export interface FreeToolState {
	/** Opaque server binding for browser drafts; never an authorization credential. */
	owner?: string;
	result: FreeToolResult | null;
	receipt: string | null;
	input: unknown;
	quota: FreeToolQuota;
	profile: { input: unknown; revision: number } | null;
}

export function parseFreeToolState(value: unknown): FreeToolState | null {
	if (!value || typeof value !== 'object') return null;
	const state = value as FreeToolState;
	const quota = state.quota;
	if (
		(state.owner !== undefined &&
			(typeof state.owner !== 'string' || !/^[a-f0-9]{64}$/.test(state.owner))) ||
		!quota ||
		!['corrections', 'daily-draw', 'daily-entry'].includes(quota.mode) ||
		(quota.remainingCorrections !== null &&
			(!Number.isInteger(quota.remainingCorrections) ||
				quota.remainingCorrections < 0 ||
				quota.remainingCorrections > 2)) ||
		!Number.isFinite(Date.parse(quota.resetsAt)) ||
		!Number.isInteger(quota.profileRevision) ||
		quota.profileRevision < 0 ||
		typeof quota.stale !== 'boolean' ||
		(state.result !== null && !parseFreeToolResult(state.result)) ||
		(state.profile !== null && (!state.profile || !Number.isInteger(state.profile.revision)))
	)
		return null;
	return { ...state, receipt: typeof state.receipt === 'string' ? state.receipt : null };
}
