import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Offline preparation. The operator applies the listed changes through Shopify Admin
// after checking its current state and the individual Dimona retail quote.
export const associateMutation = `mutation AssociateExistingMugs($profile: ID!, $variants: [ID!]!) {
  deliveryProfileUpdate(id: $profile, profile: {variantsToAssociate: $variants}) {
    profile { id }
    userErrors { field message }
  }
}`;

const cents = (amount) => Math.round(Number(amount) * 100);
const requireField = (node, key) => node.metafields.nodes.find((item) => item.key === key)?.value;
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

function verifiedVariant(product, reference) {
  assert(product && product.status === 'ACTIVE', 'Anúncio inativo ou ausente');
  assert(product.variants.nodes.length === 1 && !product.variants.pageInfo.hasNextPage);
  const [v] = product.variants.nodes;
  assert.equal(v.inventoryItem.requiresShipping, true);
  assert.equal(v.inventoryPolicy, 'DENY');
  assert.equal(v.inventoryItem.tracked, false, 'O controle do estoque mudou. Rever o cadastro.');
  assert.equal(requireField(product, 'provider'), 'Dimona');
  assert.equal(requireField(product, 'supplier_route'), 'MANUAL_RETAIL_PORCELAIN_WHITE_325ML_SUBLIMATION');
  assert.equal(requireField(product, 'fulfillment_state'), 'MANUAL_PIX_RETAIL_325ML');
  assert.equal(requireField(product, 'commercial_release'), 'true');
  assert.equal(requireField(v, 'commercial_release'), 'true');
  assert.equal(cents(v.price), 7990);
  const published = (p) => {
    assert(!p.resourcePublicationsV2.pageInfo.hasNextPage);
    return p.resourcePublicationsV2.nodes.filter((x) => x.isPublished)
      .map((x) => x.publication.id).sort();
  };
  const wanted = published(reference);
  assert(wanted.length >= 2 && reference.resourcePublicationsV2.nodes.some(
    (x) => x.isPublished && x.publication.catalog?.title?.includes('Headless')));
  assert.deepEqual(published(product), wanted);
  return v;
}

export function planMugs({ snapshot, art, quotes, hashEvidence, now = Date.now() }) {
  assert.equal(snapshot.shop, 'bhvc0w-kk.myshopify.com');
  assert(Number.isFinite(Date.parse(snapshot.observed)) &&
    Math.abs(now - Date.parse(snapshot.observed)) < 24 * 3600_000, 'Atualize o snapshot Shopify');
  const reference = snapshot.nodes.find((n) => n.handle === 'caneca-aries');
  const referenceVariant = verifiedVariant(reference, reference);
  assert.equal(referenceVariant.id, 'gid://shopify/ProductVariant/68006922223984');
  const destination = referenceVariant.deliveryProfile.id;
  assert.equal(destination, 'gid://shopify/DeliveryProfile/139946492272');
  const planned = new Set();
  const offers = [];
  const operations = [];
  const rollback = [];
  for (const quote of quotes) {
    const slug = quote.slug;
    assert(/^caneca-[a-z]+$/.test(slug) && slug !== 'caneca-aries' && !planned.has(slug));
    planned.add(slug);
    const product = snapshot.nodes.find((n) => n.handle === slug);
    const variant = verifiedVariant(product, reference);
    assert.equal(quote.variantId, variant.id);
    assert.equal(quote.dimonaProductId, 94, 'Registro varejista 94 de 325 ml');
    assert.equal(quote.capacidadeMl, 325);
    assert.equal(quote.quantity, 1);
    assert.equal(quote.currency, 'BRL');
    assert.equal(quote.previewApproved, true, 'Conferir a arte individual aplicada no estúdio');
    assert(quote.unitPrintedBrl > 0 && cents(quote.unitPrintedBrl) <= 4810,
      'O custo difere da faixa já validada para o preço de R$ 79,90');
    assert(quote.productionBusinessDays > 0 && Number.isInteger(quote.productionBusinessDays));
    assert(quote.shippingBrl > 0 && Number.isFinite(quote.shippingBrl));
    assert.equal(cents(quote.unitPrintedBrl) + cents(quote.shippingBrl), cents(quote.totalBrl));
    assert(/^\d{8}$/.test(quote.cep) && Number.isFinite(Date.parse(quote.observed)));
    assert(Math.abs(now - Date.parse(quote.observed)) < 7 * 24 * 3600_000, 'Renovar cotação');
    assert(/^[0-9a-f]{64}$/.test(quote.receiptSha256) && hashEvidence(quote.receipt) === quote.receiptSha256);
    const image = art.records.find((a) => a.slug === slug);
    assert(image && image.identical_all_non_pHYs_chunks);
    assert.deepEqual(image.design_cm, [12, 8]);
    assert.equal(hashEvidence(image.print_file), image.print_sha256);
    assert([image.print_sha256, image.source_sha256].includes(quote.uploadedSha256),
      'A arte cotada precisa corresponder ao PNG aprovado desta caneca');
    offers.push({
      slug, variantId: variant.id, priceBrl: 79.9, dimonaProductId: 94, canalVarejo: true,
      capacidadeMl: 325, evidenciaIndustrial: { arquivo: image.print_file, sha256: image.print_sha256 },
      cotacao: { arquivo: quote.receipt, sha256: quote.receiptSha256,
        custoEstampadoBrl: quote.unitPrintedBrl, diasProducao: quote.productionBusinessDays }
    });
    const before = variant.deliveryProfile.id;
    assert([destination, 'gid://shopify/DeliveryProfile/139880759664'].includes(before),
      'Perfil inesperado. Revise o destino antes de modificar.');
    if (before !== destination) {
      operations.push({ profile: destination, variants: [variant.id] });
      rollback.push({ profile: before, variants: [variant.id] });
    }
  }
  return { shop: snapshot.shop, offers, shopify: { mutation: associateMutation, operations, rollback } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert.equal(process.argv.length, 7,
    'node scripts/shop/prepare-retail-mugs.mjs SNAPSHOT INDUSTRIAL COTACOES DIRETORIO_EVIDENCIAS SAIDA');
  const [snapshotPath, artPath, quotesPath, evidenceDir, output] = process.argv.slice(2);
  const json = (file) => JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  const plan = planMugs({ snapshot: json(snapshotPath), art: json(artPath), quotes: json(quotesPath),
    hashEvidence: (file) => sha256(resolve(evidenceDir, file)) });
  writeFileSync(output, JSON.stringify(plan, null, 2) + '\n');
}
