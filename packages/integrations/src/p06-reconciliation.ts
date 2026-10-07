import { getP06Product } from './p06-commerce.ts';

const eventStatuses: Readonly<Record<string, string>> = {
  PURCHASE_APPROVED: 'APPROVED', PURCHASE_COMPLETE: 'COMPLETE',
  PURCHASE_CANCELED: 'CANCELLED', PURCHASE_REFUNDED: 'REFUNDED',
  PURCHASE_CHARGEBACK: 'CHARGEBACK', PURCHASE_PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED'
};
export class P06ReconciliationError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.name = 'P06ReconciliationError'; this.code = code; }
}
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const identifier = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);

export interface P06SaleExpectation {
  transaction: string; hotmartProductId: string; hotmartOfferCode: string;
  amountMinor: number; currency: 'BRL'; status: string;
}
export interface P06VerifiedSale extends P06SaleExpectation { verifiedAt: string }

/** Fixed official endpoint; no buyer details or raw payment payload leave this adapter. */
export async function readP06HotmartSale(accessToken: string, expected: P06SaleExpectation,
  fetcher: typeof fetch = fetch, clock: () => number = Date.now): Promise<P06VerifiedSale> {
  if (!accessToken.trim() || /[\r\n]/.test(accessToken) || !identifier(expected.transaction) ||
    !/^\d{1,16}$/.test(expected.hotmartProductId) || !identifier(expected.hotmartOfferCode) ||
    !Object.values(eventStatuses).includes(expected.status) || expected.currency !== 'BRL' ||
    !Number.isSafeInteger(expected.amountMinor) || expected.amountMinor <= 0) throw new P06ReconciliationError('invalid_expectation');
  const url = new URL('https://developers.hotmart.com/payments/api/v1/sales/history');
  // Both filters are explicit: unfiltered history can omit refunded/cancelled sales.
  url.searchParams.set('transaction', expected.transaction);
  url.searchParams.set('transaction_status', expected.status);
  url.searchParams.set('product_id', expected.hotmartProductId);
  url.searchParams.set('offer_code', expected.hotmartOfferCode);
  url.searchParams.set('max_results', '2');
  try {
    const response = await fetcher(url, { method: 'GET', redirect: 'error',
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new P06ReconciliationError(`hotmart_http_${response.status}`);
    if (!response.body) throw new P06ReconciliationError('invalid_readback');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > 131072) { await reader.cancel(); throw new P06ReconciliationError('readback_too_large'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const body = record(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
    const items = body.items, page = record(body.page_info);
    if (!Array.isArray(items) || items.length !== 1 || page.next_page_token ||
      (page.total_results !== undefined && page.total_results !== 1)) throw new P06ReconciliationError('ambiguous_readback');
    const item = record(items[0]), purchase = record(item.purchase), price = record(purchase.price);
    const product = record(item.product), offer = record(purchase.offer);
    const value = price.value;
    // Numeric JSON decimals may have binary rounding; require exact cent representation.
    const minor = typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 100) : NaN;
    if (purchase.transaction !== expected.transaction || String(product.id) !== expected.hotmartProductId ||
      purchase.status !== expected.status || offer.code !== expected.hotmartOfferCode ||
      price.currency_code !== expected.currency || minor !== expected.amountMinor ||
      typeof value !== 'number' || Math.abs(value * 100 - minor) > 0.000001) throw new P06ReconciliationError('readback_mismatch');
    return { ...expected, verifiedAt: new Date(clock()).toISOString() };
  } catch (error) {
    if (error instanceof P06ReconciliationError) throw error;
    // Never propagate response bodies, buyer details, tokens or fetch error messages.
    throw new P06ReconciliationError('hotmart_unavailable');
  }
}

export interface P06InboxRecord {
  id: string; provider: string; event_type: string; signature_verified: boolean; payload: unknown;
}
export interface P06ReconciliationPort {
  loadInbox(id: string): Promise<P06InboxRecord | null>;
  findOffer(productId: string): Promise<{ hotmartProductId: string; hotmartOfferCode: string } | null>;
  commit(inboxId: string, productId: string, sale: P06VerifiedSale): Promise<unknown>;
}

/** Service-only worker unit. Does not dispatch a supplier order or grant entitlements. */
export async function reconcileP06Inbox(inboxId: string, sku: string, accessToken: string,
  port: P06ReconciliationPort, fetcher: typeof fetch = fetch): Promise<unknown> {
  const product = getP06Product(sku), inbox = await port.loadInbox(inboxId);
  if (!product || !inbox || inbox.id !== inboxId || inbox.provider !== 'hotmart' || inbox.signature_verified !== true)
    throw new P06ReconciliationError('untrusted_inbox');
  const status = eventStatuses[inbox.event_type];
  if (!status) throw new P06ReconciliationError('unsupported_event');
  const payload = record(inbox.payload), data = record(payload.data), purchase = record(data.purchase);
  const transaction = purchase.transaction;
  const binding = await port.findOffer(product.id);
  if (!binding || !identifier(transaction) || payload.event !== inbox.event_type ||
    String(record(data.product).id) !== binding.hotmartProductId ||
    record(purchase.offer).code !== binding.hotmartOfferCode) throw new P06ReconciliationError('inbox_binding_mismatch');
  const sale = await readP06HotmartSale(accessToken, { transaction: transaction as string,
    ...binding, amountMinor: product.amountMinor, currency: 'BRL', status }, fetcher);
  return port.commit(inboxId, product.id, sale);
}
