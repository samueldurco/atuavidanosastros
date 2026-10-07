import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';
import {
	p06Products,
	P06_PRICE_VERSION,
	resolveP06Checkout,
	type P06CheckoutBinding
} from '@atv/integrations';

export async function getP06Binding(sku: string): Promise<P06CheckoutBinding | null> {
	const item = p06Products.find((product) => product.sku === sku);
	if (
		!item ||
		privateEnv.FEATURE_PHYSICAL_CHECKOUT !== 'true' ||
		privateEnv.FEATURE_HOTMART_LIVE !== 'true' ||
		!publicEnv.PUBLIC_SUPABASE_URL ||
		!privateEnv.SUPABASE_SERVICE_ROLE_KEY ||
		!privateEnv.HOTMART_HOTTOK
	)
		return null;
	const db = createClient(publicEnv.PUBLIC_SUPABASE_URL, privateEnv.SUPABASE_SERVICE_ROLE_KEY, {
		auth: { persistSession: false }
	});
	const { data: product, error: productError } = await db
		.from('products')
		.select('id,state,physical,metadata')
		.eq('id', item.id)
		.single();
	const { data: offer, error: offerError } = await db
		.from('offers')
		.select('id,state,hotmart_product_id,hotmart_offer_code,starts_at,ends_at')
		.eq('product_id', item.id)
		.eq('code', `${item.id}-BRL-V1`)
		.single();
	if (productError || offerError || !product || !offer) return null;
	const { data: price, error: priceError } = await db
		.from('price_versions')
		.select('id,status,currency,amount_minor,valid_from,valid_until')
		.eq('offer_id', offer.id)
		.eq('status', 'ACTIVE')
		.single();
	if (priceError || !price) return null;
	return {
		productId: product.id,
		sku: product.metadata?.sku ?? '',
		productState: product.state,
		physical: product.physical,
		offerId: offer.id,
		offerState: offer.state,
		hotmartProductId: offer.hotmart_product_id ?? '',
		hotmartOfferCode: offer.hotmart_offer_code ?? '',
		offerStartsAt: offer.starts_at,
		offerEndsAt: offer.ends_at,
		priceVersionId: price.id,
		priceStatus: price.status,
		priceVersion: product.metadata?.price_version ?? '',
		amountMinor: price.amount_minor,
		currency: price.currency,
		validFrom: price.valid_from,
		validUntil: price.valid_until,
		release: product.metadata?.p06_release ?? null
	};
}

export async function getP06PublicProducts() {
	if (privateEnv.FEATURE_P06_CATALOG !== 'true') return [];
	try {
		const products = await Promise.all(
			p06Products.map(async (product) => {
				const binding = await getP06Binding(product.sku);
				if (!resolveP06Checkout(product.sku, binding)) return null;
				// No supplier IDs, private release evidence or buyer data is sent to the browser.
				const publicProduct = {
					id: product.id,
					sku: product.sku,
					slug: product.slug,
					sign: product.sign,
					name: product.name,
					description: product.description,
					kind: product.kind,
					amountMinor: product.amountMinor,
					currency: product.currency,
					image: product.image,
					imageAlt: product.imageAlt,
					details: product.details,
					quality: product.quality
				};
				return { ...publicProduct, priceVersion: P06_PRICE_VERSION, available: true };
			})
		);
		return products.filter((product) => product !== null);
	} catch {
		return [];
	}
}
