import { loginHref } from '$lib/auth-return';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { symbolicProduct } from '$lib/symbolic-intake';
import { natalProducts, type NatalProduct } from '$lib/natal-request';
import { isUuid } from '$lib/library-result';
import { readIntakeAccess } from '$lib/server/symbolic-intake';
import { productCatalog } from '@atv/domain';

export const load: PageServerLoad = async ({ parent, params, locals, setHeaders }) => {
	setHeaders({
		'cache-control': 'private, no-store',
		'referrer-policy': 'no-referrer',
		'x-robots-tag': 'noindex, nofollow'
	});
	if (
		!productCatalog.some(
			(product) => product.id === params.productId && product.universe !== 'global'
		)
	)
		error(404, 'Produto não encontrado');
	const { user, trialAccess } = await parent();
	if (!user || !isUuid(user.id)) redirect(303, loginHref(`/biblioteca/nova/${params.productId}`));
	if (trialAccess) redirect(303, `/testar-produtos/${params.productId}`);
	if (
		!symbolicProduct(params.productId) &&
		!natalProducts.includes(params.productId as NatalProduct) &&
		params.productId !== 'date-reading' &&
		params.productId !== 'week-reading' &&
		params.productId !== 'solar-return' &&
		params.productId !== 'personal-calendar' &&
		params.productId !== 'direction-journey' &&
		params.productId !== 'horoscope' &&
		params.productId !== 'pair-preview' &&
		params.productId !== 'synastry' &&
		params.productId !== 'couple-dossier'
	)
		error(404, 'Entrada de produto não disponível');
	return {
		ownerId: user.id,
		productId: params.productId,
		access: await readIntakeAccess(locals.supabase, params.productId)
	};
};
