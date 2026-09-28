const object = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === 'object' && !Array.isArray(value);
export const emailUuid = (value: unknown): value is string =>
	typeof value === 'string' &&
	/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const exact = (value: Record<string, unknown>, keys: string[]) =>
	Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const revision = (value: unknown): value is number =>
	typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 8;
const digest = (value: unknown): value is string =>
	typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const timestamp = (value: unknown): value is string =>
	typeof value === 'string' &&
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
	Number.isFinite(Date.parse(value));

export interface ProductEmailCommand {
	version: 'atv-email-request/1';
	runId: string;
	expectedRevision: number;
	reviewDigest: string;
	consent: {
		transactional: true;
		policyVersion: 'atv-email-delivery/1';
		recipient: 'account-owner';
	};
}
export interface ProductEmailReceipt {
	id: string;
	runId: string;
	revision: number;
	reviewDigest: string;
	state: 'REQUESTED' | 'CANCELLED';
	createdAt: string;
	cancelledAt: string | null;
}

/** Entire bounded projection is rejected if any entry is malformed or misplaced. */
export function parseProductEmailHistory(
	value: unknown,
	runId: string
): ProductEmailReceipt[] | null {
	if (!emailUuid(runId) || !Array.isArray(value) || value.length > 8) return null;
	const receipts: ProductEmailReceipt[] = [];
	const ids = new Set<string>();
	let previousRevision = 9;
	for (const entry of value) {
		const receipt = parseProductEmailReceipt(entry);
		if (
			!receipt ||
			receipt.runId.toLowerCase() !== runId.toLowerCase() ||
			receipt.revision >= previousRevision ||
			ids.has(receipt.id.toLowerCase())
		)
			return null;
		ids.add(receipt.id.toLowerCase());
		previousRevision = receipt.revision;
		receipts.push(receipt);
	}
	return receipts;
}

export function parseProductEmailCommand(value: unknown): ProductEmailCommand | null {
	if (
		!object(value) ||
		!exact(value, ['version', 'runId', 'expectedRevision', 'reviewDigest', 'consent']) ||
		value.version !== 'atv-email-request/1' ||
		!emailUuid(value.runId) ||
		!revision(value.expectedRevision) ||
		!digest(value.reviewDigest) ||
		!object(value.consent) ||
		!exact(value.consent, ['transactional', 'policyVersion', 'recipient']) ||
		value.consent.transactional !== true ||
		value.consent.policyVersion !== 'atv-email-delivery/1' ||
		value.consent.recipient !== 'account-owner'
	)
		return null;
	return {
		version: value.version,
		runId: value.runId,
		expectedRevision: value.expectedRevision,
		reviewDigest: value.reviewDigest,
		consent: {
			transactional: true,
			policyVersion: 'atv-email-delivery/1',
			recipient: 'account-owner'
		}
	};
}

/** Receipt only: neither state represents provider acceptance or inbox delivery. */
export function parseProductEmailReceipt(value: unknown): ProductEmailReceipt | null {
	if (
		!object(value) ||
		!exact(value, [
			'id',
			'runId',
			'revision',
			'reviewDigest',
			'state',
			'createdAt',
			'cancelledAt'
		]) ||
		!emailUuid(value.id) ||
		!emailUuid(value.runId) ||
		!revision(value.revision) ||
		!digest(value.reviewDigest) ||
		!timestamp(value.createdAt) ||
		!(
			(value.state === 'REQUESTED' && value.cancelledAt === null) ||
			(value.state === 'CANCELLED' &&
				timestamp(value.cancelledAt) &&
				Date.parse(value.cancelledAt) >= Date.parse(value.createdAt))
		)
	)
		return null;
	return {
		id: value.id,
		runId: value.runId,
		revision: value.revision,
		reviewDigest: value.reviewDigest,
		state: value.state,
		createdAt: value.createdAt,
		cancelledAt: value.cancelledAt as string | null
	};
}
