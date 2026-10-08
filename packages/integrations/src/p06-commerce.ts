/** P06 fixed artwork. Prices are owner-approved versions, never supplied by the buyer. */
export const P06_PRICE_VERSION = 'p06-2026-10-07-v1';
const motifs = [
  { code: 'ARI', sign: 'Áries', slug: 'aries', title: 'O Arco do Carneiro', story: 'O carneiro de lã dourada aparece em uma das tradições greco-romanas associadas a Áries. O arco dos chifres inspira esta composição autoral.' },
  { code: 'CAP', sign: 'Capricórnio', slug: 'capricornio', title: 'A Curva da Cabra Marinha', story: 'A cabra marinha reúne terra e água em uma das tradições greco-romanas associadas a Capricórnio. A curva híbrida inspira esta composição autoral.' },
  { code: 'AQU', sign: 'Aquário', slug: 'aquario', title: 'O Vaso e o Fluxo', story: 'O portador de água aparece em uma das tradições greco-romanas associadas a Aquário. O vaso e o fluxo inspiram esta composição autoral.' }
] as const;

export const p06Products = motifs.flatMap((motif) => [
  {
    id: `P06-${motif.code}-EMB-A001-SWT01`,
    sku: `ATV-P06-${motif.code}-EMB-A001-SWT01-PRE-M`,
    slug: `${motif.slug}-moletom-emblema`, sign: motif.sign,
    name: `${motif.sign} — ${motif.title} | Moletom bordado`,
    description: `${motif.story} Moletom preto Gildan 18000, tamanho M, com bordado plano no peito esquerdo. Composição informada pelo catálogo da peça: 50% algodão e 50% poliéster. Arte fixa, sem personalização por dados de nascimento. As imagens são simulações oficiais do fornecedor; o resultado pode variar. A cor dourada, quando presente, é de linha comum, sem efeito metálico. Produção sob demanda.`,
    kind: 'EMB' as const, amountMinor: 39900, currency: 'BRL' as const,
    image: `/shop/p06/${motif.code}-EMB.png`,
    imageAlt: `Simulação de moletom preto com emblema de ${motif.sign} no peito esquerdo`,
    details: ['Gildan 18000 · preto · M', '50% algodão e 50% poliéster', 'Bordado plano no peito esquerdo', 'Arte fixa; sem personalização', 'M: comprimento 71,12 cm · largura 55,88 cm · manga 87,63 cm, desde o centro da gola', 'Medidas da peça podem variar até 5 cm; compare com um moletom seu'],
    supplier: 'printful' as const,
    catalogVariantId: 5435,
    quality: 'Qualidade física desta aplicação ainda não testada.'
  },
  {
    id: `P06-${motif.code}-GRV-A001-PST01`,
    sku: `ATV-P06-${motif.code}-GRV-A001-PST01-HOR4030`,
    slug: `${motif.slug}-gravura-40x30`, sign: motif.sign,
    name: `${motif.sign} — ${motif.title} | Gravura digital 40 × 30 cm`,
    description: `${motif.story} Impressão digital de composição original em linguagem de gravura, com fundo creme e traço escuro, em formato horizontal de 40 × 30 cm. Não é uma gravura manual nem uma edição certificada de museu. Arte fixa, sem personalização por dados de nascimento. Sem moldura. O papel e a aplicação final ainda dependem da confirmação do fornecedor para o Brasil; este cadastro permanece em preparação.`,
    kind: 'GRV' as const, amountMinor: 24900, currency: 'BRL' as const,
    image: `/shop/p06/${motif.code}-GRV.png`,
    imageAlt: `Arte digital de ${motif.sign}, traço escuro sobre fundo creme, sem moldura`,
    details: ['40 × 30 cm · horizontal', 'Impressão digital · sem moldura', 'Arte fixa; sem personalização', 'Papel e aplicação em confirmação'],
    supplier: 'gelato' as const,
    catalogVariantId: null,
    quality: 'Qualidade física desta aplicação ainda não testada.'
  }
]);
export type P06Product = (typeof p06Products)[number];
export const getP06Product = (sku: string) => p06Products.find((item) => item.sku === sku);

export function parseP06Intent(form: FormData): { sku: string; quantity: 1 } | null {
  const keys = [...form.keys()];
  if (keys.length !== 2 || new Set(keys).size !== 2 || keys.some((key) => !['sku', 'quantity'].includes(key))) return null;
  const sku = form.get('sku');
  if (typeof sku !== 'string' || !getP06Product(sku) || form.get('quantity') !== '1') return null;
  return { sku, quantity: 1 };
}

export interface P06CheckoutBinding {
  productId: string; sku: string; productState: string; physical: boolean;
  offerId: string; offerState: string; hotmartProductId: string; hotmartOfferCode: string;
  offerStartsAt: string | null; offerEndsAt: string | null;
  priceVersionId: string; priceStatus: string; priceVersion: string;
  amountMinor: number; currency: string; validFrom: string; validUntil: string | null;
  // This record belongs in private, server-controlled product metadata after actual checks.
  release: {
    verifiedAt: string; expiresAt: string; directOfferLink: string;
    merchantReady: boolean; fiscalReady: boolean; consumerPolicyReady: boolean;
    shippingByDestinationReady: boolean; supplierApplicationReady: boolean;
    paidFulfillmentReady: boolean; inboxOutboxReady: boolean;
    hotmartReadbackProductId: string; hotmartReadbackOfferCode: string;
    hotmartReadbackAmountMinor: number; hotmartReadbackCurrency: string;
    evidenceRef: string;
  } | null;
}

function inWindow(start: string | null, end: string | null, now: number) {
  return (start === null || (Number.isFinite(Date.parse(start)) && Date.parse(start) <= now)) &&
    (end === null || (Number.isFinite(Date.parse(end)) && Date.parse(end) > now));
}

/** Never enables checkout from a flag alone, a draft price, or a client-selected URL. */
export function resolveP06Checkout(sku: string, binding: P06CheckoutBinding | null, now = Date.now()): string | null {
  const product = getP06Product(sku);
  if (!Number.isFinite(now) || !product || !binding || binding.sku !== sku || binding.productId !== product.id || binding.physical !== true ||
    binding.productState !== 'ACTIVE' || binding.offerState !== 'ACTIVE' || binding.priceStatus !== 'ACTIVE' ||
    binding.priceVersion !== P06_PRICE_VERSION || binding.amountMinor !== product.amountMinor || binding.currency !== 'BRL' ||
    !binding.offerId || !binding.priceVersionId || !binding.hotmartProductId || !binding.hotmartOfferCode ||
    typeof binding.validFrom !== 'string' || !inWindow(binding.offerStartsAt, binding.offerEndsAt, now) || !inWindow(binding.validFrom, binding.validUntil, now)) return null;
  const release = binding.release;
  if (!release || release.merchantReady !== true || release.fiscalReady !== true || release.consumerPolicyReady !== true ||
    release.shippingByDestinationReady !== true || release.supplierApplicationReady !== true || release.paidFulfillmentReady !== true ||
    release.inboxOutboxReady !== true || !release.evidenceRef ||
    release.hotmartReadbackProductId !== binding.hotmartProductId || release.hotmartReadbackOfferCode !== binding.hotmartOfferCode ||
    release.hotmartReadbackAmountMinor !== binding.amountMinor || release.hotmartReadbackCurrency !== binding.currency) return null;
  const verifiedAt = Date.parse(release.verifiedAt), expiresAt = Date.parse(release.expiresAt);
  if (!Number.isFinite(verifiedAt) || !Number.isFinite(expiresAt) || verifiedAt > now || expiresAt <= now ||
    expiresAt <= verifiedAt || expiresAt - verifiedAt > 24 * 60 * 60 * 1000) return null;
  try {
    const url = new URL(release.directOfferLink);
    if (url.protocol !== 'https:' || url.host !== 'pay.hotmart.com' || url.username || url.password || url.hash ||
      !/^\/[A-Za-z0-9]+$/.test(url.pathname) || url.searchParams.getAll('off').length !== 1 ||
      url.searchParams.get('off') !== binding.hotmartOfferCode || [...url.searchParams.keys()].some((key) => key !== 'off')) return null;
    return url.toString();
  } catch { return null; }
}

/** Physical purchases must never enter the digital entitlement pipeline. */
export function classifyP06Payment(event: string, alreadyDispatched: boolean): 'HOLD' | 'READY_FOR_RECONCILIATION' | 'CANCEL' | 'MANUAL_REVIEW' {
  if (['PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'PURCHASE_CANCELED'].includes(event)) return alreadyDispatched ? 'MANUAL_REVIEW' : 'CANCEL';
  if (event === 'PURCHASE_APPROVED') return alreadyDispatched ? 'MANUAL_REVIEW' : 'READY_FOR_RECONCILIATION';
  return 'HOLD';
}
