import { error, redirect } from '@sveltejs/kit';
import { loginHref } from '$lib/auth-return';
import { productCatalog, isRetiredTarot } from '@atv/domain';
import { trialIdentity } from '$lib/server/private-trials';
import { trialContinuity } from '$lib/server/trial-continuity';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals, parent }) => {
	const account = await parent();
	if (!account.user) redirect(303, loginHref('/testar-produtos/atv-plus'));
	// Account management remains reachable after a grant is revoked; this never opens readings.
	if (!account.trialAccess)
		return {
			products: [],
			readings: [],
			feedback: null,
			continuity: await trialContinuity(locals).catch(() => null),
			continuityReadings: []
		};
	const identity = (await trialIdentity(locals))!;
	const [readings, feedback, continuity] = await Promise.all([
		identity.supabase
			.from('atv_trial_readings')
			.select(
				'id,product_id,created_at,version:reading->>version,title:reading->>title,sections:reading->sections'
			)
			.eq('owner_id', identity.ownerId)
			.is('archived_at', null)
			.order('created_at', { ascending: false })
			.limit(100),
		identity.supabase
			.from('atv_trial_club_feedback')
			.select('*')
			.eq('owner_id', identity.ownerId)
			.maybeSingle(),
		trialContinuity(locals).catch(() => null)
	]);
	if (readings.error || feedback.error)
		error(503, 'Não foi possível abrir seu clube privado. Tente novamente.');
	const active = readings.data.filter((r) => !isRetiredTarot(r.product_id));
	return {
		products: productCatalog.filter((p) => p.id !== 'atv-plus'),
		readings: active.map(({ id, product_id, created_at, version }) => ({
			id,
			product_id,
			created_at,
			version
		})),
		feedback: feedback.data,
		continuity,
		continuityReadings: active.map((r) => ({
			id: r.id,
			title: typeof r.title === 'string' ? r.title : r.product_id,
			chapters: Array.isArray(r.sections)
				? r.sections
						.slice(0, 64)
						.map((s) =>
							s && typeof s === 'object' && !Array.isArray(s) && typeof s.title === 'string'
								? s.title
								: 'Capítulo'
						)
				: []
		}))
	};
};
