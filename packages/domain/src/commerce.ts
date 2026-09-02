export type PurchaseState = 'PENDING' | 'APPROVED' | 'CANCELLED' | 'REFUNDED' | 'CHARGEDBACK';
export type EntitlementState = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED';

const transitions: Record<PurchaseState, readonly PurchaseState[]> = {
  PENDING: ['APPROVED', 'CANCELLED'],
  APPROVED: ['CANCELLED', 'REFUNDED', 'CHARGEDBACK'],
  CANCELLED: [],
  REFUNDED: [],
  CHARGEDBACK: []
};

export function canTransitionPurchase(from: PurchaseState, to: PurchaseState): boolean {
  return transitions[from].includes(to);
}

export interface CommercialMapping {
  internalProductId: string;
  internalOfferId: string;
  hotmartProductId: string;
  hotmartOfferCode: string;
  version: number;
  activeFrom: string;
}
