import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { symbolicProduct } from '$lib/symbolic-intake';
import { natalProducts, type NatalProduct } from '$lib/natal-request';
import { isUuid } from '$lib/library-result';
import { readIntakeAccess } from '$lib/server/symbolic-intake';

export const load: PageServerLoad = async ({ parent, params, locals, setHeaders }) => {
	setHeaders({
		'cache-control': 'private, no-store',
		'referrer-policy': 'no-referrer',
		'x-robots-tag': 'noindex, nofollow'
	});
	if (
		!symbolicProduct(params.productId) &&
		!natalProducts.includes(params.productId as NatalProduct)
	)
		error(404, 'Entrada de produto não disponível');
	const { user } = await parent();
	if (!user || !isUuid(user.id)) redirect(303, '/entrar');
	return {
		ownerId: user.id,
		productId: params.productId,
		access: await readIntakeAccess(locals.supabase, params.productId)
	};
};
