import assert from 'node:assert/strict';
import test from 'node:test';
import { p06Products, P06_PRICE_VERSION, parseP06Intent, resolveP06Checkout, classifyP06Payment, type P06CheckoutBinding } from './p06-commerce.ts';
const now = Date.parse('2026-10-07T18:00:00Z');
const product = p06Products[0]!;
function binding(): P06CheckoutBinding {
  return { productId: product.id, sku: product.sku, productState: 'ACTIVE', physical: true,
    offerId: 'offer', offerState: 'ACTIVE', hotmartProductId: 'provider-product', hotmartOfferCode: 'offer123',
    offerStartsAt: null, offerEndsAt: null, priceVersionId: 'price', priceStatus: 'ACTIVE',
    priceVersion: P06_PRICE_VERSION, amountMinor: product.amountMinor, currency: 'BRL',
    validFrom: '2026-10-07T00:00:00Z', validUntil: null,
    release: { verifiedAt: '2026-10-07T17:00:00Z', expiresAt: '2026-10-08T17:00:00Z',
      directOfferLink: 'https://pay.hotmart.com/A12345A?off=offer123',
      merchantReady: true, fiscalReady: true, consumerPolicyReady: true, shippingByDestinationReady: true,
      supplierApplicationReady: true, paidFulfillmentReady: true, inboxOutboxReady: true,
      hotmartReadbackProductId: 'provider-product', hotmartReadbackOfferCode: 'offer123',
      hotmartReadbackAmountMinor: product.amountMinor, hotmartReadbackCurrency: 'BRL', evidenceRef: 'private-proof' } };
}
test('six unique fixed products with approved prices and no physical quality assertion', () => {
  assert.equal(p06Products.length, 6);
  assert.equal(new Set(p06Products.map(p => p.sku)).size, 6);
  for (const p of p06Products) {
    assert.equal(p.amountMinor, p.kind === 'EMB' ? 39900 : 24900);
    assert.ok(p.description.length >= 200);
    assert.match(p.quality, /não testada/);
  }
});
test('buyer intent accepts only one known SKU and quantity one; never a price or URL', () => {
  const form = new FormData(); form.set('sku', product.sku); form.set('quantity','1');
  assert.deepEqual(parseP06Intent(form), {sku: product.sku, quantity: 1});
  for (const extra of ['price','url','offer','currency','discount']) {
    form.set(extra, 'forged'); assert.equal(parseP06Intent(form), null); form.delete(extra);
  }
  form.append('sku', product.sku); assert.equal(parseP06Intent(form), null);
  form.set('sku','unknown'); assert.equal(parseP06Intent(form),null);
  form.set('sku',product.sku); form.set('quantity','2'); assert.equal(parseP06Intent(form),null);
});
test('checkout requires each live gate and exact immutable price binding', () => {
  assert.equal(resolveP06Checkout(product.sku,binding(),now), 'https://pay.hotmart.com/A12345A?off=offer123');
  assert.equal(resolveP06Checkout(product.sku,null,now),null);
  const mutations: Partial<P06CheckoutBinding>[] = [
    {productState:'DRAFT'}, {offerState:'DRAFT'}, {priceStatus:'DRAFT'}, {amountMinor:1}, {currency:'USD'},
    {physical:false}, {priceVersion:'old'}, {productId:p06Products[1]!.id}, {sku:'forged'}, {release:null},
    {validFrom:'invalid'}, {validFrom:'2026-10-08'}, {validUntil:'2026-10-07'}, {offerStartsAt:'2026-10-08'}, {offerEndsAt:'2026-10-07'}
  ];
  for (const mutation of mutations) assert.equal(resolveP06Checkout(product.sku,{...binding(),...mutation},now),null,JSON.stringify(mutation));
  for (const key of ['merchantReady','fiscalReady','consumerPolicyReady','shippingByDestinationReady','supplierApplicationReady','paidFulfillmentReady','inboxOutboxReady'] as const) {
    const b=binding(); b.release![key]=false; assert.equal(resolveP06Checkout(product.sku,b,now),null,key);
  }
});
test('checkout rejects stale attestations and provider readback mismatches', () => {
  for (const mutation of [
    {expiresAt:'2026-10-07T18:00:00Z'}, {expiresAt:'2026-10-09T00:00:00Z'}, {verifiedAt:'2026-10-08'},
    {hotmartReadbackAmountMinor:1}, {hotmartReadbackCurrency:'USD'}, {hotmartReadbackOfferCode:'other'},
    {hotmartReadbackProductId:'other'}, {evidenceRef:''}
  ]) { const b=binding(); Object.assign(b.release!,mutation); assert.equal(resolveP06Checkout(product.sku,b,now),null); }
});
test('checkout never redirects to a client URL, lookalike host, extra query or mismatched offer', () => {
  for (const link of ['https://pay.hotmart.com.evil.test/A12345A?off=offer123','http://pay.hotmart.com/A12345A?off=offer123',
    'https://evil@pay.hotmart.com/A12345A?off=offer123','https://pay.hotmart.com/A12345A?off=other',
    'https://pay.hotmart.com/A12345A?off=offer123&off=offer123','https://pay.hotmart.com/A12345A?off=offer123&price=1',
    'https://pay.hotmart.com/A12345A?off=offer123#x','https://pay.hotmart.com/../x/y?off=offer123']) {
    const b=binding(); b.release!.directOfferLink=link; assert.equal(resolveP06Checkout(product.sku,b,now),null,link);
  }
});
test('physical payments require reconciliation and reversals never dispatch a new order', () => {
  assert.equal(classifyP06Payment('PURCHASE_APPROVED',false),'READY_FOR_RECONCILIATION');
  assert.equal(classifyP06Payment('PURCHASE_APPROVED',true),'MANUAL_REVIEW');
  for (const event of ['PURCHASE_REFUNDED','PURCHASE_CHARGEBACK','PURCHASE_CANCELED']) {
    assert.equal(classifyP06Payment(event,false),'CANCEL');
    assert.equal(classifyP06Payment(event,true),'MANUAL_REVIEW');
  }
  assert.equal(classifyP06Payment('PURCHASE_DELAYED',false),'HOLD');
});
