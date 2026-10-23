import type { RequestHandler } from './$types';

const result = (status: 'encerrada' | 'erro') =>
	new Response(null, {
		status: 303,
		headers: {
			location: `/entrar?sessao=${status}`,
			'cache-control': 'private, no-store',
			'referrer-policy': 'no-referrer'
		}
	});

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.supabase) return result('erro');
	try {
		const { error } = await locals.supabase.auth.signOut({ scope: 'local' });
		return result(error ? 'erro' : 'encerrada');
	} catch {
		return result('erro');
	}
};
