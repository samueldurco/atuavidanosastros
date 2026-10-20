import { dev } from '$app/environment';
import { env as privateEnv } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// The commercial branch preview is intentionally browsable for journey QA.
// A URL alone will never authorize a live post-purchase offer or entitlement.
const commercialPreviewHost = 'codex-commercial-journeys-20.atuavidanosastros.pages.dev';

export const load: PageServerLoad = async ({ parent, setHeaders, url }) => {
	setHeaders({
		'cache-control': 'private, no-store',
		'referrer-policy': 'no-referrer',
		'x-robots-tag': 'noindex, nofollow'
	});
	if (dev || url.hostname === commercialPreviewHost) return { designPreview: true };
	const { user, trialAccess } = await parent();
	const allowed = (privateEnv.ADMIN_EMAIL_ALLOWLIST ?? '')
		.split(',')
		.map((value) => value.trim().toLowerCase())
		.filter(Boolean);
	if (!user || (!trialAccess && (!user.email || !allowed.includes(user.email.toLowerCase()))))
		error(404, 'Página não disponível.');
	return { designPreview: true };
};
