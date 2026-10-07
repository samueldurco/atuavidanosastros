import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readP06HotmartSale, reconcileP06Inbox } from './p06-reconciliation.ts';
import type { P06SaleExpectation, P06ReconciliationPort } from './p06-reconciliation.ts';

const expected: P06SaleExpectation = { transaction: 'HP_SYNTHETIC_1', hotmartProductId: '1234567',
  hotmartOfferCode: 'synthetic', amountMinor: 39900, currency: 'BRL', status: 'APPROVED' };
const body = () => ({ items: [{ product: { id: 1234567 }, buyer: { email: 'synthetic@example.invalid' },
  purchase: { transaction: expected.transaction, status: expected.status, offer: { code: 'synthetic' },
    price: { value: 399, currency_code: 'BRL' } } }], page_info: { total_results: 1 } });
const response = (value: unknown): typeof fetch => async () => Response.json(value);

test('official readback uses bounded GET with transaction/status filters and strips buyer fields', async () => {
  const result = await readP06HotmartSale('synthetic-token', expected, async (url, init) => {
    const parsed = new URL(String(url));
    assert.equal(parsed.origin, 'https://developers.hotmart.com');
    assert.equal(parsed.pathname, '/payments/api/v1/sales/history');
    assert.equal(parsed.searchParams.get('transaction'), expected.transaction);
    assert.equal(parsed.searchParams.get('transaction_status'), 'APPROVED');
    assert.equal(init?.method, 'GET'); assert.equal(init?.redirect, 'error');
    assert.ok(init?.signal); return Response.json(body());
  }, () => 1000);
  assert.deepEqual(result, { ...expected, verifiedAt: new Date(1000).toISOString() });
  assert.equal(JSON.stringify(result).includes('email'), false);
});

test('readback rejects wrong identity, offer, price, currency, status, ambiguity and fractional cents', async () => {
  const changes = [
    (x: ReturnType<typeof body>) => { x.items[0]!.product.id = 2; },
    (x: ReturnType<typeof body>) => { x.items[0]!.purchase.transaction = 'other'; },
    (x: ReturnType<typeof body>) => { x.items[0]!.purchase.offer.code = 'other'; },
    (x: ReturnType<typeof body>) => { x.items[0]!.purchase.price.value = 399.001; },
    (x: ReturnType<typeof body>) => { x.items[0]!.purchase.price.currency_code = 'USD'; },
    (x: ReturnType<typeof body>) => { x.items[0]!.purchase.status = 'REFUNDED'; },
    (x: ReturnType<typeof body>) => { x.items.push(x.items[0]!); }
  ];
  for (const change of changes) { const x = body(); change(x);
    await assert.rejects(() => readP06HotmartSale('synthetic-token', expected, response(x)), /readback_mismatch|ambiguous_readback/);
  }
  await assert.rejects(() => readP06HotmartSale('synthetic-token', expected,
    response({ ...body(), page_info: { next_page_token: 'more' } })), /ambiguous_readback/);
});

test('reversal is explicitly queried; stale approvals cannot masquerade as refund evidence', async () => {
  const x = body(); x.items[0]!.purchase.status = 'REFUNDED';
  const result = await readP06HotmartSale('synthetic-token', { ...expected, status: 'REFUNDED' }, async (url) => {
    assert.equal(new URL(String(url)).searchParams.get('transaction_status'), 'REFUNDED'); return Response.json(x);
  });
  assert.equal(result.status, 'REFUNDED');
  await assert.rejects(() => readP06HotmartSale('synthetic-token', { ...expected, status: 'REFUNDED' }, response(body())), /readback_mismatch/);
});

test('network/invalid JSON/oversized bodies fail without exposing token or provider payload', async () => {
  await assert.rejects(() => readP06HotmartSale('synthetic-token', expected,
    async () => { throw new Error('synthetic-token buyer@example.invalid'); }), /^P06ReconciliationError: hotmart_unavailable$/);
  await assert.rejects(() => readP06HotmartSale('synthetic-token', expected,
    async () => new Response('private detail', { status: 401 })), /hotmart_http_401/);
  await assert.rejects(() => readP06HotmartSale('synthetic-token', expected,
    async () => new Response('not JSON')), /hotmart_unavailable/);
  await assert.rejects(() => readP06HotmartSale('synthetic-token', expected,
    async () => new Response('x'.repeat(131073))), /readback_too_large/);
});

test('worker commits only signed, bound inbox after a matching readback; logistics is a separate event', async () => {
  let commits = 0, requests = 0;
  const inbox = { id: 'synthetic-inbox', provider: 'hotmart', event_type: 'PURCHASE_APPROVED', signature_verified: true,
    payload: { event: 'PURCHASE_APPROVED', data: { product: { id: 1234567 }, purchase: {
      transaction: expected.transaction, offer: { code: 'synthetic' } } } } };
  const port: P06ReconciliationPort = {
    loadInbox: async () => inbox, findOffer: async () => ({ hotmartProductId: '1234567', hotmartOfferCode: 'synthetic' }),
    commit: async (_id, productId, sale) => { commits++; assert.equal(productId, 'P06-ARI-EMB-A001-SWT01');
      assert.equal(sale.status, 'APPROVED'); return { state: 'WAITING_LOGISTICS' }; }
  };
  const fetcher: typeof fetch = async () => { requests++; return Response.json(body()); };
  const sku = 'ATV-P06-ARI-EMB-A001-SWT01-PRE-M';
  assert.deepEqual(await reconcileP06Inbox(inbox.id, sku, 'synthetic-token', port, fetcher), { state: 'WAITING_LOGISTICS' });
  inbox.signature_verified = false;
  await assert.rejects(() => reconcileP06Inbox(inbox.id, sku, 'synthetic-token', port, fetcher), /untrusted_inbox/);
  inbox.signature_verified = true; inbox.event_type = 'ORDER_FULFILLMENT';
  await assert.rejects(() => reconcileP06Inbox(inbox.id, sku, 'synthetic-token', port, fetcher), /unsupported_event/);
  inbox.event_type = 'PURCHASE_APPROVED'; inbox.payload.data.purchase.offer.code = 'wrong';
  await assert.rejects(() => reconcileP06Inbox(inbox.id, sku, 'synthetic-token', port, fetcher), /inbox_binding_mismatch/);
  assert.equal(commits, 1); assert.equal(requests, 1);
});
