export type AccountRightState = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED';
export type AccountRightSource = 'purchase' | 'unknown';

export type AccountRight = {
	productId: string;
	state: AccountRightState;
	source: AccountRightSource;
	sourceLabel: string;
	startsAt: string | null;
	endsAt: string | null;
};

/** A read-only account projection. It is not an authorization grant. */
export type AccountRights =
	{ status: 'ready'; items: AccountRight[] } | { status: 'error'; items: [] };
