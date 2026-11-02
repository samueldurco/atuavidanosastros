import { shopAriesRoute, shopDelivery } from '$lib/data/shop-commerce';
import { readPublicAddress, validSellerDocument, validSellerName } from './seller-fields';

let loggedIdentityIssue = false;

export type ShopSellerIdentity = {
	name: string;
	address: string;
	email: string;
	document: string;
};

// Only explicitly public fields may cross the server/client boundary.
// Values are configured at runtime, never embedded in source or build fixtures.
export function readShopSale(
	env: Record<string, string | undefined>
): { seller: ShopSellerIdentity; deliveryBusinessDays: number; ariesOnly: boolean } | null {
	const scope = env.SHOP_ARIES_SINGLE_UNIT_ONLY;
	if (
		env.FEATURE_PHYSICAL_CHECKOUT !== 'true' ||
		env.SHOP_SELLER_DISCLOSURE_APPROVED !== 'true' ||
		(scope !== 'true' && scope !== 'false')
	)
		return null;
	const days = env.SHOP_DELIVERY_MAX_BUSINESS_DAYS ?? '';
	const ariesOnly = scope === 'true';
	if (
		!/^[1-9][0-9]?$/.test(days) ||
		(ariesOnly && Number(days) !== shopAriesRoute.deliveryBusinessDays)
	)
		return null;
	if (env.SHOP_VERIFIED_FLAT_SHIPPING_BRL !== shopDelivery.priceBrl.toFixed(2)) return null;
	const name = env.SHOP_SELLER_PUBLIC_NAME?.trim() ?? '';
	const { address, issue: addressIssue } = readPublicAddress(
		env.SHOP_SELLER_PUBLIC_ADDRESS?.trim() ?? '',
		env.SHOP_SELLER_PRIVATE_RETURN_LOCATION,
		env.SHOP_SELLER_PUBLIC_POSTCODE
	);
	const email = env.SHOP_SELLER_PUBLIC_EMAIL?.trim() ?? '';
	const document = env.SHOP_SELLER_PUBLIC_DOCUMENT?.trim() ?? '';
	const issues = [
		validSellerName(name) ? null : 'name',
		addressIssue,
		/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : 'email',
		validSellerDocument(document) ? null : 'document'
	].filter(Boolean);
	if (issues.length) {
		if (!loggedIdentityIssue) {
			loggedIdentityIssue = true;
			console.warn('shop_seller_identity_blocked', issues.join(','));
		}
		return null;
	}
	return {
		seller: { name, address, email, document },
		deliveryBusinessDays: Number(days),
		ariesOnly
	};
}
