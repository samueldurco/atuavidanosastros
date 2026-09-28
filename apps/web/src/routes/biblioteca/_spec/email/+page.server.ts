import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url, setHeaders }) => {
	if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) error(404);
	setHeaders({ 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer' });
	return {
		allowNew: url.searchParams.get('mode') === 'available',
		revoked: url.searchParams.get('mode') === 'revoked'
	};
};
