import { env } from '$env/dynamic/private';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => ({
	shopCommerceEnabled: env.FEATURE_PHYSICAL_CHECKOUT === 'true'
});
