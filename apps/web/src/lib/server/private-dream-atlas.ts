import { error } from '@sveltejs/kit';
import { parseDreamAtlasEntryInput, prepareDreamAtlasFacts } from '@atv/domain';
import { trialIdentity, validTrialId } from './private-trials';

export function atlasWriteError(problem: { message?: string }) {
	const code = problem.message ?? '';
	if (code.includes('atlas_period_open'))
		error(409, 'A análise ficará disponível ao completar os 30 dias.');
	if (code.includes('atlas_period_closed'))
		error(409, 'O período de registros terminou. Atualize o diário para gerar a análise final.');
	if (code.includes('atlas_text_limit'))
		error(
			400,
			'Este diário atingiu o limite de texto. Reduza o relato ou remova um registro antes de salvar.'
		);
	if (code.includes('revision_conflict') || code.includes('atlas_sources_changed'))
		error(409, 'O diário mudou. Atualize a lista antes de tentar novamente.');
	if (code.includes('trial_access') || code.includes('atlas_access'))
		error(403, 'O acesso a este diário está indisponível.');
	if (
		code.includes('atlas_not_found') ||
		code.includes('atlas_run_unavailable') ||
		code.includes('atlas_entry_unavailable')
	)
		error(404, 'Diário não encontrado.');
	if (code.includes('atlas_') || code.includes('entry_outside_period'))
		error(400, 'Confira a data, o relato e a autorização dos registros.');
	error(503, 'Não foi possível atualizar o diário. Tente novamente.');
}

export async function privateAtlas(locals: App.Locals, id: unknown) {
	if (!validTrialId(id)) error(400, 'Diário inválido.');
	const identity = (await trialIdentity(locals))!;
	const result = await identity.supabase
		.from('atv_trial_dream_cycles')
		.select('id,started_at,ready_at,start_date')
		.eq('owner_id', identity.ownerId)
		.eq('id', id)
		.maybeSingle();
	if (result.error) error(503, 'Não foi possível consultar o diário.');
	if (!result.data) error(404, 'Diário não encontrado.');
	return {
		identity,
		cycle: result.data as { id: string; started_at: string; ready_at: string; start_date: string }
	};
}

export async function readPrivateAtlas(locals: App.Locals, id: unknown) {
	const { identity, cycle } = await privateAtlas(locals, id);
	const [rows, reading] = await Promise.all([
		identity.supabase
			.from('atv_trial_dreams')
			.select('id,data,revision,created_at,updated_at')
			.eq('owner_id', identity.ownerId)
			.eq('cycle_id', cycle.id)
			.order('created_at'),
		identity.supabase
			.from('atv_trial_readings')
			.select('id')
			.eq('owner_id', identity.ownerId)
			.eq('dream_atlas_cycle_id', cycle.id)
			.maybeSingle()
	]);
	if (rows.error || reading.error) error(503, 'Não foi possível carregar os registros.');
	const entries = (rows.data ?? []).map((row) => {
		const parsed = parseDreamAtlasEntryInput(row.data);
		if (!parsed) error(503, 'Um registro precisa de revisão antes de continuar.');
		return {
			...parsed,
			id: row.id as string,
			revision: row.revision as number,
			runId: cycle.id,
			createdAt: row.created_at as string,
			updatedAt: row.updated_at as string
		};
	});
	const facts = prepareDreamAtlasFacts(cycle.start_date, entries);
	if (!facts) error(503, 'Não foi possível conferir o período do diário.');
	return {
		id: cycle.id,
		startDate: cycle.start_date,
		startedAt: cycle.started_at,
		readyAt: cycle.ready_at,
		serverNow: new Date().toISOString(),
		entries,
		facts,
		analysisId: (reading.data?.id as string | undefined) ?? null
	};
}

export async function trialAtlasSelection(locals: App.Locals, id: unknown, startDate: string) {
	const diary = await readPrivateAtlas(locals, id);
	if (diary.startDate !== startDate)
		error(400, 'O início do diário deve corresponder ao ciclo salvo.');
	if (Date.parse(diary.readyAt) > Date.now())
		error(409, 'A análise ficará disponível ao completar os 30 dias.');
	if (diary.analysisId) error(409, 'Este diário já tem uma análise final. Abra o resultado salvo.');
	const sources = diary.entries.filter((entry) => entry.includeInSynthesis);
	if (!sources.length)
		error(400, 'Nenhum relato deste diário foi autorizado para a análise final.');
	return sources;
}
