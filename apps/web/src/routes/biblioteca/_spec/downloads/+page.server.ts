import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { WorkflowReaderData } from '$lib/product-run';
import { svgFixture } from '../../../../../tests/fixtures/product-export';

export const load: PageServerLoad = ({ url }) => {
	if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) error(404);
	const run = svgFixture();
	return {
		state: 'workflow',
		synthetic: false,
		run,
		item: {
			id: run.libraryItemId!,
			title: 'Downloads — teste sintético local',
			universe: 'meu-ceu',
			created_at: run.createdAt
		}
	} satisfies WorkflowReaderData;
};
