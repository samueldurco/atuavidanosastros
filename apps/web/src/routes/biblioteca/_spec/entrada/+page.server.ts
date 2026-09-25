import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { symbolicProduct, type IntakeAccess } from '$lib/symbolic-intake';
import { natalProducts, type NatalProduct } from '$lib/natal-request';

export const load: PageServerLoad = ({ url, setHeaders }) => {
	if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) error(404);
	setHeaders({
		'cache-control': 'private, no-store',
		'x-robots-tag': 'noindex, nofollow',
		'referrer-policy': 'no-referrer'
	});
	const productId = url.searchParams.get('product') ?? 'daily-card';
	const access = url.searchParams.get('access') ?? 'AVAILABLE';
	if (
		(!symbolicProduct(productId) && !natalProducts.includes(productId as NatalProduct)) ||
		!['AVAILABLE', 'UNRELEASED', 'ACCESS_REQUIRED', 'UNAVAILABLE'].includes(access)
	)
		error(404);
	return {
		ownerId: '00000000-0000-4000-8000-000000000056',
		productId,
		access: access as IntakeAccess
	};
};
