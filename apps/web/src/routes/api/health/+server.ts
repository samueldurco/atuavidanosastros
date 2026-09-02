import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = ({ url }) =>
	json(
		{
			status: 'ok',
			service: 'atv-web',
			environment: url.hostname.endsWith('pages.dev')
				? 'preview'
				: url.hostname === 'localhost'
					? 'local'
					: 'production',
			timestamp: new Date().toISOString()
		},
		{ headers: { 'cache-control': 'no-store' } }
	);
