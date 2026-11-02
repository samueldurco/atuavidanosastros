import assert from 'node:assert/strict';
import test from 'node:test';
import { planMugs } from './prepare-retail-mugs.mjs';

const now = Date.parse('2026-11-02T12:00:00Z');
const observed = new Date(now).toISOString();
const dedicated = 'gid://shopify/DeliveryProfile/139946492272';
const previous = 'gid://shopify/DeliveryProfile/139880759664';
const variantId = 'gid://shopify/ProductVariant/68006922256752';
const hash = '1'.repeat(64);
const imageHash = '2'.repeat(64);
const fields = (obj) => ({ nodes: Object.entries(obj).map(([key, value]) => ({ key, value })) });
function product(handle, id, profile) {
  return { handle, status: 'ACTIVE',
    resourcePublicationsV2: { pageInfo: { hasNextPage: false }, nodes: ['Loja virtual', 'Minha Loja Headless']
      .map((title) => ({ isPublished: true, publication: { id: title, catalog: { title } } })) },
    metafields: fields({ provider: 'Dimona', supplier_route: 'MANUAL_RETAIL_PORCELAIN_WHITE_325ML_SUBLIMATION',
      fulfillment_state: 'MANUAL_PIX_RETAIL_325ML', commercial_release: 'true' }),
    variants: { pageInfo: { hasNextPage: false }, nodes: [{
      id, inventoryPolicy: 'DENY', inventoryItem: { tracked: false, requiresShipping: true },
      price: '79.90', deliveryProfile: { id: profile }, metafields: fields({ commercial_release: 'true' })
    }] }
  };
}
function fixture() {
  return { now, snapshot: { observed, shop: 'bhvc0w-kk.myshopify.com', nodes: [
    product('caneca-aries', 'gid://shopify/ProductVariant/68006922223984', dedicated),
    product('caneca-taurus', variantId, previous)] },
    art: { records: [{ slug: 'caneca-taurus', identical_all_non_pHYs_chunks: true, design_cm: [12, 8],
      print_file: 'taurus.png', print_sha256: imageHash, source_sha256: '3'.repeat(64) }] },
    quotes: [{ slug: 'caneca-taurus', variantId, observed, dimonaProductId: 94, capacidadeMl: 325,
      quantity: 1, currency: 'BRL', previewApproved: true, unitPrintedBrl: 48.1, shippingBrl: 18.41,
      totalBrl: 66.51, cep: '36960000', productionBusinessDays: 3, receipt: 'taurus.pdf',
      receiptSha256: hash, uploadedSha256: imageHash }],
    hashEvidence: (file) => ({ 'taurus.pdf': hash, 'taurus.png': imageHash })[file] };
}
test('relaciona somente a variante comprovada e prepara a restauração exata', () => {
  const p = planMugs(fixture());
  assert.deepEqual(p.shopify.operations, [{ profile: dedicated, variants: [variantId] }]);
  assert.deepEqual(p.shopify.rollback, [{ profile: previous, variants: [variantId] }]);
  assert.equal(p.offers[0].priceBrl, 79.9);
});
test('nenhuma prova significa nenhuma mudança', () => {
  const args = fixture();
  args.quotes = [];
  assert.equal(planMugs(args).shopify.operations.length, 0);
});
test('exclui outra arte, SKU Dropsimples, falta de estoque ou cotação vencida', () => {
  for (const field of [
    { uploadedSha256: '4'.repeat(64) }, { dimonaProductId: 11001 }, { previewApproved: false },
    { totalBrl: 99 }, { receiptSha256: '0'.repeat(64) }, { observed: '2026-01-01' }, { unitPrintedBrl: 49 }
  ]) {
    const args = fixture();
    Object.assign(args.quotes[0], field);
    assert.throws(() => planMugs(args));
  }
});
test('processar o snapshot depois da mudança não gera nova mutação', () => {
  const args = fixture();
  args.snapshot.nodes[1].variants.nodes[0].deliveryProfile.id = dedicated;
  const p = planMugs(args);
  assert.deepEqual(p.shopify.operations, []);
  assert.deepEqual(p.shopify.rollback, []);
});
