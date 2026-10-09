import { error } from '@sveltejs/kit';
import {
	parseClubState,
	prepareClubContinuity,
	type ClubCommand
} from '$lib/trials/club-continuity';

export async function continuityIdentity(locals: App.Locals) {
	if (!locals.supabase) error(503, 'O acompanhamento está indisponível. Tente novamente.');
	const claims = await locals.supabase.auth
		.getClaims()
		.catch(() => error(503, 'Não foi possível conferir sua sessão. Tente novamente.'));
	if (claims.error || !claims.data?.claims.sub) error(401, 'Entre na sua conta para continuar.');
	return locals.supabase;
}

export async function trialContinuity(locals: App.Locals, command?: ClubCommand) {
	const supabase = await continuityIdentity(locals);
	const request = command
		? supabase.rpc('set_atv_trial_continuity', {
				p_revision: command.revision,
				p_granted: command.granted,
				p_items: command.items
			})
		: supabase.rpc('read_atv_trial_continuity');
	let result;
	try {
		result = await request.abortSignal(AbortSignal.timeout(10000));
	} catch {
		error(503, 'O acompanhamento está indisponível. Suas escolhas continuam nesta página.');
	}
	if (result.error) {
		if (result.error.code === '40001')
			error(409, 'Seu contexto mudou em outra aba. Reabra a página antes de salvar.');
		if (result.error.code === '22023')
			error(400, 'Confira os itens escolhidos. Uma leitura pode ter sido removida.');
		if (result.error.code === '42501')
			error(
				403,
				'Não foi possível autorizar este contexto. Você ainda pode remover sua autorização.'
			);
		error(503, 'O acompanhamento está indisponível. Suas leituras continuam preservadas.');
	}
	if (JSON.stringify(result.data).length > 196608)
		error(503, 'Não foi possível abrir este contexto.');
	const state = parseClubState(result.data);
	if (!state) error(503, 'Não foi possível conferir este contexto.');
	return { state, preparation: prepareClubContinuity(state) };
}
