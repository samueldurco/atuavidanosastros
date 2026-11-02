import { env } from '$env/dynamic/private';
import { readShopSale } from '$lib/server/shop/seller-identity';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => {
	const sale = readShopSale(env);
	return {
		ariesOnly: sale?.ariesOnly === true,
		shopSeller: sale?.seller ?? null,
		shopCommerceEnabled: sale !== null,
		deliveryBusinessDays: sale?.deliveryBusinessDays ?? null
	};
};
