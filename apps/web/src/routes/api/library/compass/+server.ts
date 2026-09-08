import { sha256Hex } from '@atv/integrations';
import { json } from '@sveltejs/kit';
import { readSmallJson } from '$lib/server/request-json';
import {
	calculateMidheaven,
	fingerprintMaterial,
	parseCalculationInput
} from '$lib/server/midheaven';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.supabase) return json({ code: 'auth_unavailable' }, { status: 503 });
	const { data: claimsData, error: claimsError } = await locals.supabase.auth.getClaims();
	const userId = !claimsError ? claimsData?.claims?.sub : undefined;
	if (!userId) return json({ code: 'auth_required' }, { status: 401 });

	const input = parseCalculationInput(await readSmallJson(request));
	if (!input) return json({ code: 'invalid_input' }, { status: 400 });

	try {
		const [result, inputFingerprint] = await Promise.all([
			calculateMidheaven(input),
			sha256Hex(fingerprintMaterial(input))
		]);
		const { data: savedResult, error: resultError } = await locals.supabase
			.from('calculation_results')
			.upsert(
				{
					user_id: userId,
					kind: 'MIDHEAVEN',
					input_fingerprint: inputFingerprint,
					result: {
						midheaven: result.midheaven,
						sign: result.sign,
						degree: result.degree,
						status: result.status,
						warning: result.warning
					},
					provenance: result.provenance
				},
				{ onConflict: 'user_id,kind,input_fingerprint' }
			)
			.select('id')
			.single();
		if (resultError || !savedResult) return json({ code: 'storage_unavailable' }, { status: 503 });

		const { data: libraryItem, error: libraryError } = await locals.supabase
			.from('library_items')
			.upsert(
				{
					user_id: userId,
					title: `Bússola de Carreira — Meio do Céu em ${result.sign}`,
					universe: 'proposito-prosperidade',
					item_type: 'COMPASS_RESULT',
					source_id: savedResult.id,
					occurred_at: new Date().toISOString()
				},
				{ onConflict: 'user_id,item_type,source_id' }
			)
			.select('id')
			.single();
		if (libraryError || !libraryItem) return json({ code: 'library_unavailable' }, { status: 503 });
		return json(
			{ saved: true, resultId: savedResult.id, libraryItemId: libraryItem.id },
			{ status: 201 }
		);
	} catch {
		return json({ code: 'calculation_failed' }, { status: 422 });
	}
};
