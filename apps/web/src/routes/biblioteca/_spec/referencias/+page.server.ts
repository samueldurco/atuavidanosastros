import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { exportFixture } from '../../../../../tests/fixtures/product-export';

export const load: PageServerLoad = ({ url, setHeaders }) => {
	if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) error(404);
	setHeaders({ 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' });
	const run = exportFixture();
	run.productId = 'date-reading';
	run.calculation!.facts = [
		{
			id: 'cycle-1',
			kind: 'calculated',
			display: 'Ciclo de referência sintética',
			source: 'Fixture, não cálculo de pessoa'
		}
	];
	return { run };
};
