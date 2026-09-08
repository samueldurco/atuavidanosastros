import { json } from '@sveltejs/kit';
import { readSmallJson } from '$lib/server/request-json';
import { calculateMidheaven, parseCalculationInput } from '$lib/server/midheaven';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const input = parseCalculationInput(await readSmallJson(request));
	if (!input) return json({ code: 'invalid_input' }, { status: 400 });
	try {
		return json(await calculateMidheaven(input));
	} catch {
		return json({ code: 'calculation_failed' }, { status: 422 });
	}
};
