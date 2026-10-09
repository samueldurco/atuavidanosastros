import { error, json } from '@sveltejs/kit';
import { trialJson } from '$lib/server/private-trials';
import { trialContinuity } from '$lib/server/trial-continuity';
import { parseClubCommand } from '$lib/trials/club-continuity';
import type { RequestHandler } from './$types';
const headers = { 'cache-control': 'private, no-store' };
export const GET: RequestHandler = async ({ locals }) =>
	json(await trialContinuity(locals), { headers });
export const POST: RequestHandler = async (event) => {
	const command = parseClubCommand(await trialJson(event));
	if (!command) error(400, 'Confira os itens escolhidos e a autorização.');
	return json(await trialContinuity(event.locals, command), { headers });
};
