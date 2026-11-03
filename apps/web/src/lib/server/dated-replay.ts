import { hash } from 'node:crypto';

type Span = [number, number];
type Proofs = {
	snapshots: Record<string, string>;
	claimDigests: Record<string, string>;
	compositions: string[];
	archives: Record<string, { packages: Record<string, Span>; evidence: Record<string, Span> }>;
};
declare const __ATV_DATED_REPLAYS__: Proofs | undefined;

// A build only remembers exact inputs accepted by the pure replay functions in that build.
// No authorities, signatures, evidence or publication decisions enter either table.
const proofs = typeof __ATV_DATED_REPLAYS__ === 'undefined' ? undefined : __ATV_DATED_REPLAYS__;
const compositions = new Set(proofs?.compositions ?? []);
const fingerprint = (value: unknown) => hash('sha256', JSON.stringify(value), 'hex');
const decoded = new WeakSet<object>();

export const datedArchiveSpans = (sha256: string) => proofs?.archives?.[sha256];

// Only JSON decoded from a freshly hash-checked archive is eligible for exact-input replay.
export function markDatedReplayInputs(...values: object[]) {
	for (const value of values) decoded.add(value);
}

export const replayedComposition = (inputs: {
	document: object;
	claims: object;
	facts: object;
	scope: object;
}) =>
	compositions.size > 0 &&
	Object.values(inputs).every((value) => decoded.has(value)) &&
	compositions.has(fingerprint(inputs));

export const replayedSnapshotDigest = (snapshot: object) =>
	decoded.has(snapshot) ? proofs?.snapshots[fingerprint(snapshot)] : undefined;

export const replayedClaimsDigest = (claims: object) =>
	decoded.has(claims) ? proofs?.claimDigests[fingerprint(claims)] : undefined;
