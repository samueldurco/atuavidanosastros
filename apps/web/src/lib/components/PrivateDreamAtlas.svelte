<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { WORKFLOW_VERSION } from '@atv/domain';
	import DreamAtlasDiary from './DreamAtlasDiary.svelte';
	let {
		cycles,
		exampleAccess = false,
		atvPlusCycleId = null
	}: {
		cycles: { id: string; start_date: string; ready_at: string }[];
		exampleAccess?: boolean;
		atvPlusCycleId?: string | null;
	} = $props();
	type Diary = {
		id: string;
		startDate: string;
		readyAt: string;
		serverNow: string;
		analysisId: string | null;
		facts: { includedEntryIds: string[] };
	};
	let availableCycles = $state<typeof cycles>([]);
	let selected = $state('');
	let consent = $state(false);
	let busy = $state(false);
	let message = $state('');
	let startKey = $state('');
	let analysisKey = $state('');
	let diary = $state<Diary | null>(null);
	const ready = $derived(diary && Date.parse(diary.serverNow) >= Date.parse(diary.readyAt));
	const label = (date: string) => date.slice(0, 10).split('-').reverse().join('/');
	async function post<T>(url: string, body: object): Promise<T> {
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(75000)
		});
		const value = (await response.json()) as T & { message?: string; error?: string };
		if (!response.ok)
			throw new Error(
				value.message ?? value.error ?? 'Não foi possível concluir. Tente novamente.'
			);
		return value;
	}
	async function refresh() {
		if (!selected) return;
		try {
			diary = await post<Diary>('/api/private-dream-atlas/read', { runId: selected });
		} catch (problem) {
			message = problem instanceof Error ? problem.message : 'Não foi possível carregar o diário.';
		}
	}
	async function selectCycle() {
		diary = null;
		analysisKey = '';
		message = '';
		await refresh();
	}
	async function start() {
		if (!consent || busy) return;
		busy = true;
		message = '';
		startKey ||= crypto.randomUUID();
		try {
			const value = await post<Diary>('/api/private-dream-atlas/start', {
				requestKey: startKey,
				consent
			});
			if (!availableCycles.some((cycle) => cycle.id === value.id))
				availableCycles = [
					{ id: value.id, start_date: value.startDate, ready_at: value.readyAt },
					...availableCycles
				];
			selected = value.id;
			diary = value;
			analysisKey = '';
			startKey = '';
		} catch (problem) {
			message = problem instanceof Error ? problem.message : 'Não foi possível iniciar.';
		} finally {
			busy = false;
		}
	}
	async function synthesize() {
		if (!diary || !ready || busy) return;
		busy = true;
		message = '';
		analysisKey ||= crypto.randomUUID();
		try {
			const value = await post<{ id: string }>('/api/private-trials', {
				requestKey: analysisKey,
				dreamAtlasCycleId: diary.id,
				atvPlusCycleId,
				input: {
					version: WORKFLOW_VERSION,
					productId: 'dream-atlas',
					dreamAtlas: { startDate: diary.startDate },
					consent: {
						storage: true,
						policyVersion: 'atv-input-consent/1',
						partner: false,
						continuity: false
					}
				}
			});
			await goto(`/testar-produtos/leituras/${value.id}`);
		} catch (problem) {
			message = problem instanceof Error ? problem.message : 'Não foi possível gerar a análise.';
			await refresh();
		} finally {
			busy = false;
		}
	}
	onMount(() => {
		availableCycles = [...cycles];
		selected = cycles[0]?.id ?? '';
		void refresh();
	});
</script>

<section class="atlas-intro" aria-labelledby="atlas-start">
	<p class="eyebrow">Um período, suas próprias palavras</p>
	<h2 id="atlas-start">Registre agora. Releia o conjunto em 30 dias.</h2>
	{#if exampleAccess}<p>
			<a href="/testar-produtos/dream-atlas/exemplo"
				>Explorar uma demonstração com relatos fictícios e PDF</a
			>
		</p>{/if}
	<p>
		Guarde as cenas, as emoções e as associações que cada sonho desperta. Ao fim dos 30 dias, receba
		uma análise que relaciona os relatos autorizados, as repetições e as diferenças entre os
		períodos.
	</p>
	<p>
		Você pode registrar quantos dias lembrar, sem preencher os dias em branco. A interpretação de um
		sonho individual continua disponível como outra leitura.
	</p>
	{#if availableCycles.length}
		<label for="atlas-cycle">Seus diários</label>
		<select id="atlas-cycle" bind:value={selected} onchange={selectCycle} disabled={busy}>
			{#each availableCycles as cycle (cycle.id)}<option value={cycle.id}
					>Iniciado em {label(cycle.start_date)}</option
				>{/each}
		</select>
	{/if}
	{#if !diary || ready}
		<label class="consent"
			><input type="checkbox" bind:checked={consent} disabled={busy} /> Autorizo guardar meus relatos
			nesta conta e usar na análise final somente os registros que eu selecionar.</label
		>
		<button class="atv-button" type="button" onclick={start} disabled={!consent || busy}
			>{diary ? 'Iniciar outro diário de 30 dias' : 'Iniciar meus 30 dias'}</button
		>
	{/if}
	{#if message}<p role="status">{message}</p>{/if}
</section>
{#if diary}
	<div class="period" aria-live="polite">
		{#if diary.analysisId}<h2>Sua análise integrada está salva</h2>
			<a class="atv-button" href={`/testar-produtos/leituras/${diary.analysisId}`}
				>Abrir análise e PDF</a
			>
		{:else if ready}<h2>É hora de olhar o conjunto</h2>
			<p>
				{diary.facts.includedEntryIds.length} relatos autorizados. A análise manterá uma cópia dos registros
				usados nesta edição.
			</p>
			<button
				class="atv-button"
				type="button"
				onclick={synthesize}
				disabled={busy || !diary.facts.includedEntryIds.length}
				>{busy ? 'Preparando sua análise…' : 'Gerar análise integrada'}</button
			>
		{:else}<p>
				A análise final ficará disponível em <strong
					>{new Date(diary.readyAt).toLocaleString('pt-BR')}</strong
				>, ao completar 30 dias. As datas dos sonhos seguem o calendário UTC do diário.
			</p>{/if}
		<button type="button" onclick={refresh} disabled={busy}>Atualizar período</button>
	</div>
	{#key diary.id}<DreamAtlasDiary
			runId={diary.id}
			access="AVAILABLE"
			privateCycle
			onchange={refresh}
		/>{/key}
{/if}

<style>
	.atlas-intro,
	.period {
		max-width: 55rem;
		padding: clamp(1.2rem, 4vw, 2.5rem);
		background: var(--atv-paper);
		border: 1px solid var(--atv-border);
		margin-block: 1.5rem;
	}
	.atlas-intro h2 {
		font-size: clamp(1.8rem, 4vw, 2.6rem);
	}
	.atlas-intro p,
	.period p {
		line-height: 1.7;
	}
	label,
	select {
		display: block;
		margin-block: 1rem;
	}
	select {
		max-width: 100%;
		padding: 0.7rem;
	}
	.consent {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		line-height: 1.6;
	}
	.consent input {
		margin-top: 0.4rem;
	}
	button,
	.atv-button {
		margin: 0.5rem 0.75rem 0.5rem 0;
	}
</style>
