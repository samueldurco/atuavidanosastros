import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';
import { error, type RequestEvent } from '@sveltejs/kit';
import { isRetiredTarot, parseDreamAtlasEntryInput, type DreamAtlasFactSource } from '@atv/domain';
import type { SavedTrial } from '$lib/trials/reading';

export async function trialIdentity(locals: App.Locals, required = true) {
	if (!locals.supabase) {
		if (required) error(503, 'O acesso de testes está temporariamente indisponível.');
		return null;
	}
	const claims = await locals.supabase.auth.getClaims();
	const ownerId = !claims.error ? claims.data?.claims.sub : null;
	if (!ownerId) {
		if (required) error(401, 'Entre com sua conta Google para testar.');
		return null;
	}
	const grant = await locals.supabase.rpc('has_atv_trial_access');
	if (grant.error || grant.data !== true) {
		if (required) error(403, 'Esta conta ainda não tem acesso aos testes privados.');
		return null;
	}
	return { ownerId, supabase: locals.supabase };
}
export function trialWriter() {
	if (!publicEnv.PUBLIC_SUPABASE_URL || !privateEnv.SUPABASE_SERVICE_ROLE_KEY)
		error(503, 'O salvamento de testes está temporariamente indisponível.');
	return createClient(publicEnv.PUBLIC_SUPABASE_URL, privateEnv.SUPABASE_SERVICE_ROLE_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}
export const validTrialId = (v: unknown): v is string =>
	typeof v === 'string' &&
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export async function privateTrial(locals: App.Locals, id: string): Promise<SavedTrial> {
	if (!validTrialId(id)) error(404, 'Leitura não encontrada.');
	const identity = await trialIdentity(locals);
	const result = await identity!.supabase
		.from('atv_trial_readings')
		.select('*')
		.eq('id', id)
		.eq('owner_id', identity!.ownerId)
		.maybeSingle();
	if (result.error) error(503, 'Não foi possível abrir sua leitura. Tente novamente.');
	if (!result.data) error(404, 'Leitura não encontrada.');
	if (isRetiredTarot(result.data.product_id) || result.data.archived_at)
		error(404, 'Esta leitura foi arquivada.');
	return result.data as SavedTrial;
}
export async function trialDreamSources(
	locals: App.Locals,
	ids: unknown
): Promise<DreamAtlasFactSource[]> {
	if (
		!Array.isArray(ids) ||
		ids.length > 150 ||
		ids.some((id) => !validTrialId(id)) ||
		new Set(ids).size !== ids.length
	)
		error(400, 'Seleção de sonhos inválida.');
	if (!ids.length) return [];
	const identity = await trialIdentity(locals);
	const result = await identity!.supabase
		.from('atv_trial_dreams')
		.select('id,data,revision')
		.eq('owner_id', identity!.ownerId)
		.in('id', ids);
	if (result.error || result.data?.length !== ids.length)
		error(400, 'Um registro selecionado não está disponível na sua biblioteca.');
	return result.data.map((row) => {
		const parsed = parseDreamAtlasEntryInput(row.data);
		if (!parsed) error(400, 'Um registro selecionado precisa ser revisado.');
		return { id: row.id, revision: row.revision, ...parsed };
	});
}
export async function trialJson(event: RequestEvent) {
	if (event.request.headers.get('origin') !== event.url.origin)
		error(403, 'Origem da solicitação inválida.');
	if (Number(event.request.headers.get('content-length')) > 35000)
		error(413, 'Solicitação muito extensa.');
	const body = await event.request.text();
	if (body.length > 35000) error(413, 'Solicitação muito extensa.');
	try {
		return JSON.parse(body);
	} catch {
		error(400, 'Solicitação inválida.');
	}
}
