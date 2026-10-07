import { error } from '@sveltejs/kit';
import { trialWriter } from '$lib/server/private-trials';
import { sharedReading, shareTokenHash, validShareToken } from '$lib/trials/sharing';
import type { SavedTrial } from '$lib/trials/reading';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	setHeaders({
		'cache-control': 'private, no-store',
		'x-robots-tag': 'noindex, nofollow',
		'referrer-policy': 'no-referrer'
	});
	if (!validShareToken(params.token)) error(404, 'Este link não está disponível.');
	const client = trialWriter();
	const link = await client
		.from('atv_trial_shares')
		.select('owner_id,reading_id')
		.eq('token_hash', await shareTokenHash(params.token))
		.is('revoked_at', null)
		.gt('expires_at', new Date().toISOString())
		.maybeSingle();
	if (link.error) error(503, 'Não foi possível abrir a leitura compartilhada. Tente novamente.');
	if (!link.data) error(404, 'Este link expirou ou foi desativado.');
	const grant = await client
		.from('atv_trial_grants')
		.select('revoked_at,expires_at')
		.eq('owner_id', link.data.owner_id)
		.maybeSingle();
	if (grant.error) error(503, 'Não foi possível abrir a leitura compartilhada.');
	if (
		!grant.data ||
		grant.data.revoked_at ||
		(grant.data.expires_at && Date.parse(grant.data.expires_at) <= Date.now())
	)
		error(404, 'Este link não está disponível.');
	const result = await client
		.from('atv_trial_readings')
		.select('*')
		.eq('owner_id', link.data.owner_id)
		.eq('id', link.data.reading_id)
		.maybeSingle();
	if (result.error) error(503, 'Não foi possível abrir a leitura compartilhada.');
	const reading = result.data && sharedReading(result.data as SavedTrial);
	if (!reading) error(404, 'Este link não está disponível.');
	return { reading };
};
