import { dev } from '$app/environment';
import { env as privateEnv } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Funnel presentations are design previews until a verified purchase/reading
// event can authorize an individual handoff. A URL alone is never that proof.
export const load: PageServerLoad = async ({ parent, setHeaders }) => {
	setHeaders({
		'cache-control': 'private, no-store',
		'referrer-policy': 'no-referrer',
		'x-robots-tag': 'noindex, nofollow'
	});
	if (dev) return { designPreview: true };
	const { user, trialAccess } = await parent();
	const allowed = (privateEnv.ADMIN_EMAIL_ALLOWLIST ?? '')
		.split(',')
		.map((value) => value.trim().toLowerCase())
		.filter(Boolean);
	if (!user || (!trialAccess && (!user.email || !allowed.includes(user.email.toLowerCase()))))
		error(404, 'Página não disponível.');
	return { designPreview: true };
};
