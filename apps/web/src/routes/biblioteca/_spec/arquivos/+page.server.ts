import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { exportFixture } from '../../../../../tests/fixtures/product-export';

export const load: PageServerLoad = ({ url }) => {
	if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) error(404);
	return { run: exportFixture() };
};
