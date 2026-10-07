import { env } from '$env/dynamic/private';
import { products, shopDomain } from './catalog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	// Ativar somente depois de confirmar recebimentos, retenção manual e dados comerciais.
	const authorized = env.FEATURE_PHYSICAL_CHECKOUT === 'true' && env.P04_CHECKOUT_READY === 'true';
	const catalog = await Promise.all(
		products.map(async (product) => {
			let available = false;
			if (authorized) {
				try {
					const response = await fetch(`https://${shopDomain}/products/${product.handle}.js`, {
						signal: AbortSignal.timeout(5000),
						headers: { Accept: 'application/json' }
					});
					if (response.ok) {
						const live = (await response.json()) as {
							id?: number;
							variants?: { id: number; available: boolean; price: number }[];
						};
						available =
							String(live.id) === product.id &&
							!!live.variants?.some(
								(variant) =>
									String(variant.id) === product.variantId &&
									variant.available === true &&
									variant.price === product.price
							);
					}
					// HTML da página de senha, indisponibilidade ou preço alterado fecham a compra.
				} catch {
					available = false;
				}
			}
			return {
				...product,
				checkoutHref: available ? `https://${shopDomain}/cart/${product.variantId}:1` : null
			};
		})
	);
	return { products: catalog };
};
