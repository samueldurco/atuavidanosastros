export type AccountOrderState = 'PENDING' | 'APPROVED' | 'CANCELLED' | 'REFUNDED' | 'CHARGEDBACK';

/** A purchase without any linked entitlement; this never represents product access. */
export type AccountOrder = {
	productId: string;
	state: AccountOrderState;
	createdAt: string;
};

export type AccountOrders =
	{ status: 'ready'; items: AccountOrder[] } | { status: 'error'; items: [] };
