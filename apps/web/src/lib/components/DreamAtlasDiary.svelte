<script lang="ts">
	import { onMount } from 'svelte';
	import {
		DREAM_ATLAS_ENTRY_VERSION,
		dreamAtlasDateWithinPeriod,
		parseDreamAtlasEntryInput,
		prepareDreamAtlasFacts,
		validDate
	} from '@atv/domain';
	import type { DreamAtlasEntryInput } from '@atv/domain';
	import type { IntakeAccess } from '$lib/symbolic-intake';

	interface Entry extends DreamAtlasEntryInput {
		id: string;
		runId: string;
		revision: number;
		createdAt: string;
		updatedAt: string;
	}
	let {
		runId,
		access,
		synthetic = false
	}: { runId: string; access: IntakeAccess; synthetic?: boolean } = $props();
	let entries = $state<Entry[]>([]);
	let startDate = $state<string | null>(null);
	let pendingEntryId = $state<string | null>(null);
	let busy = $state<'read' | 'save' | 'delete' | null>(null);
	let loaded = $state(false);
	let notice = $state('');
	let editing = $state<Entry | null>(null);
	let dreamDate = $state('');
	let narrative = $state('');
	let emotions = $state('');
	let associations = $state('');
	let includeInSynthesis = $state(false);
	let confirmDelete = $state<string | null>(null);
	let alive = false;
	const writable = $derived(!synthetic && access === 'AVAILABLE');
	const endDate = $derived(
		startDate
			? new Date(Date.parse(`${startDate}T00:00:00Z`) + 29 * 86_400_000).toISOString().slice(0, 10)
			: null
	);
	const facts = $derived(startDate ? prepareDreamAtlasFacts(startDate, entries) : null);
	const lines = (value: string) =>
		value
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean);
	const dateLabel = (value: string) => {
		const [year, month, day] = value.split('-');
		return `${day}/${month}/${year}`;
	};

	function resetForm() {
		editing = null;
		pendingEntryId = null;
		dreamDate = '';
		narrative = '';
		emotions = '';
		associations = '';
		includeInSynthesis = false;
	}
	function edit(entry: Entry) {
		editing = entry;
		pendingEntryId = null;
		dreamDate = entry.dreamDate;
		narrative = entry.narrative;
		emotions = entry.emotions.join('\n');
		associations = entry.associations.join('\n');
		includeInSynthesis = entry.includeInSynthesis;
		notice = '';
	}
	async function request(action: 'read' | 'save' | 'delete', body: object): Promise<unknown> {
		const response = await fetch(`/api/dream-atlas/entries/${action}`, {
			method: 'POST',
			credentials: 'same-origin',
			cache: 'no-store',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(15000)
		});
		const payload: unknown = await response.json();
		if (!response.ok) {
			const code =
				payload && typeof payload === 'object' && 'error' in payload ? payload.error : '';
			throw new Error(typeof code === 'string' ? code : 'atlas_service_unavailable');
		}
		return payload;
	}
	function parseEntries(payload: unknown): { startDate: string; entries: Entry[] } {
		if (
			!payload ||
			typeof payload !== 'object' ||
			!('startDate' in payload) ||
			!validDate(payload.startDate) ||
			payload.startDate > '2099-12-02' ||
			!('entries' in payload) ||
			!Array.isArray(payload.entries)
		)
			throw new Error('invalid_response');
		const periodStart = payload.startDate;
		const periodEntries = payload.entries.map((value: unknown) => {
			if (!value || typeof value !== 'object') throw new Error('invalid_response');
			const item = value as Record<string, unknown>;
			const parsed = parseDreamAtlasEntryInput({
				version: item.version,
				dreamDate: item.dreamDate,
				narrative: item.narrative,
				emotions: item.emotions,
				associations: item.associations,
				includeInSynthesis: item.includeInSynthesis
			});
			if (
				!parsed ||
				!dreamAtlasDateWithinPeriod(periodStart, parsed.dreamDate) ||
				typeof item.id !== 'string' ||
				item.runId !== runId ||
				!Number.isInteger(item.revision) ||
				Number(item.revision) < 1 ||
				typeof item.createdAt !== 'string' ||
				typeof item.updatedAt !== 'string'
			)
				throw new Error('invalid_response');
			return {
				...parsed,
				id: item.id,
				runId,
				revision: Number(item.revision),
				createdAt: item.createdAt,
				updatedAt: item.updatedAt
			};
		});
		return { startDate: periodStart, entries: periodEntries };
	}
	async function fetchEntries() {
		const payload = await request('read', { runId });
		const next = parseEntries(payload);
		if (alive) {
			entries = next.entries;
			startDate = next.startDate;
			loaded = true;
		}
	}
	async function refresh() {
		if (synthetic || busy) return;
		busy = 'read';
		notice = '';
		try {
			await fetchEntries();
		} catch {
			if (alive) {
				loaded = false;
				notice = 'Não foi possível carregar o diário. Tente atualizar a lista.';
			}
		} finally {
			if (alive) busy = null;
		}
	}
	onMount(() => {
		alive = true;
		void refresh();
		return () => {
			alive = false;
		};
	});
	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (!writable || busy || !loaded || !startDate) return;
		const entry = parseDreamAtlasEntryInput({
			version: DREAM_ATLAS_ENTRY_VERSION,
			dreamDate,
			narrative,
			emotions: lines(emotions),
			associations: lines(associations),
			includeInSynthesis
		});
		if (!entry) {
			notice = 'Revise a data, o relato e as listas antes de guardar.';
			return;
		}
		if (!dreamAtlasDateWithinPeriod(startDate, entry.dreamDate)) {
			notice = 'Escolha uma data dentro do período deste Atlas.';
			return;
		}
		const entryId = editing?.id ?? pendingEntryId ?? crypto.randomUUID();
		const expectedRevision = editing?.revision ?? 0;
		if (!editing) pendingEntryId = entryId;
		busy = 'save';
		notice = '';
		try {
			const result = await request('save', {
				runId,
				entryId,
				expectedRevision,
				entry
			});
			if (
				!result ||
				typeof result !== 'object' ||
				!('revision' in result) ||
				!Number.isInteger(result.revision) ||
				Number(result.revision) <= expectedRevision
			)
				throw new Error('invalid_response');
			if (alive) {
				resetForm();
				notice = 'Registro guardado no seu diário privado.';
			}
			try {
				await fetchEntries();
			} catch {
				if (alive) {
					loaded = false;
					notice = 'Registro guardado. Atualize a lista para confirmar o estado atual.';
				}
			}
		} catch (error) {
			let refreshed = false;
			try {
				await fetchEntries();
				refreshed = true;
			} catch {
				if (alive) loaded = false;
			}
			if (alive) {
				const current = refreshed ? entries.find((item) => item.id === entryId) : null;
				const persisted =
					current &&
					current.revision > expectedRevision &&
					current.dreamDate === entry.dreamDate &&
					current.narrative === entry.narrative &&
					JSON.stringify(current.emotions) === JSON.stringify(entry.emotions) &&
					JSON.stringify(current.associations) === JSON.stringify(entry.associations) &&
					current.includeInSynthesis === entry.includeInSynthesis;
				if (persisted) {
					resetForm();
					notice = 'Registro guardado no seu diário privado.';
				} else {
					notice =
						error instanceof Error && error.message === 'atlas_unreleased'
							? 'Novos registros estão indisponíveis enquanto o Atlas não está liberado.'
							: refreshed
								? 'Gravação não confirmada. Confira a lista antes de tentar novamente.'
								: 'Gravação não confirmada. Atualize a lista antes de tentar novamente.';
				}
			}
		} finally {
			if (alive) busy = null;
		}
	}
	async function remove(entry: Entry) {
		if (synthetic || busy || !loaded || confirmDelete !== entry.id) return;
		busy = 'delete';
		notice = '';
		try {
			const result = await request('delete', { runId, entryId: entry.id });
			if (
				!result ||
				typeof result !== 'object' ||
				!('deleted' in result) ||
				result.deleted !== true
			)
				throw new Error('invalid_response');
			if (alive) {
				if (editing?.id === entry.id) resetForm();
				confirmDelete = null;
				notice = 'Registro excluído do diário.';
			}
			try {
				await fetchEntries();
			} catch {
				if (alive) {
					loaded = false;
					notice = 'Registro excluído. Atualize a lista para confirmar o estado atual.';
				}
			}
		} catch {
			let refreshed = false;
			try {
				await fetchEntries();
				refreshed = true;
			} catch {
				if (alive) loaded = false;
			}
			if (alive) {
				if (refreshed && !entries.some((item) => item.id === entry.id)) {
					if (editing?.id === entry.id) resetForm();
					confirmDelete = null;
					notice = 'Registro excluído do diário.';
				} else {
					notice = refreshed
						? 'Exclusão não confirmada. Confira a lista antes de agir novamente.'
						: 'Exclusão não confirmada. Atualize a lista antes de agir novamente.';
				}
			}
		} finally {
			if (alive) busy = null;
		}
	}
</script>

<section id="diario" aria-labelledby="diary-title" class="diary">
	<p class="eyebrow">Atlas dos Sonhos</p>
	<h2 id="diary-title">Diário privado do período</h2>
	<p>
		Registre apenas sonhos deste período de 30 dias. Cada relato fica ligado a esta versão do Atlas
		e só aparece para você. A inclusão em uma síntese futura é uma escolha por registro; nenhuma
		síntese é gerada ao guardar.
	</p>
	{#if synthetic}
		<p>Referência sintética: o diário privado não é carregado aqui.</p>
	{:else}
		{#if access !== 'AVAILABLE'}
			<p>
				Novos registros indisponíveis no estado atual de acesso ou liberação. Seus registros já
				guardados continuam disponíveis para leitura e exclusão.
			</p>
		{/if}
		{#if notice}<p role="status" class="notice">{notice}</p>{/if}
		<button type="button" onclick={refresh} disabled={!!busy}>Atualizar lista</button>
		{#if busy === 'read'}<p role="status">Carregando diário…</p>{/if}
		{#if loaded}
			{#if startDate && endDate}
				<p>
					Período deste Atlas: <time datetime={startDate}>{dateLabel(startDate)}</time> a
					<time datetime={endDate}>{dateLabel(endDate)}</time>.
				</p>
			{/if}
			{#if facts}
				<p>
					{facts.recordedCount} registros no diário; {facts.includedEntryIds.length} incluídos para uma
					possível síntese e {facts.excludedCount} excluídos dela.
				</p>
				{#if facts.recurrences.length}
					<h3>Termos informados em mais de um registro incluído</h3>
					<p>Repetição literal de termos que você informou; nenhuma interpretação foi feita.</p>
					<ul>
						{#each facts.recurrences as observation (`${observation.source}:${observation.label}`)}
							<li>
								{observation.source === 'reported-emotion'
									? 'Emoção relatada'
									: 'Associação pessoal'}:
								{observation.label} ({observation.entryIds.length} registros)
							</li>
						{/each}
					</ul>
				{/if}
			{/if}
			{#if entries.length === 0}<p>Nenhum sonho registrado neste período.</p>{/if}
			<ol class="entries">
				{#each entries as entry (entry.id)}
					<li>
						<h3>Sonho de <time datetime={entry.dreamDate}>{dateLabel(entry.dreamDate)}</time></h3>
						<p class="narrative">{entry.narrative}</p>
						{#if entry.emotions.length}<p>
								<strong>Emoções relatadas:</strong>
								{entry.emotions.join(' · ')}
							</p>{/if}
						{#if entry.associations.length}<p>
								<strong>Associações pessoais:</strong>
								{entry.associations.join(' · ')}
							</p>{/if}
						<p>
							{entry.includeInSynthesis
								? 'Incluído em futura síntese, se ela estiver disponível.'
								: 'Fora de futuras sínteses.'}
						</p>
						{#if writable}<button type="button" onclick={() => edit(entry)} disabled={!!busy}
								>Editar registro</button
							>{/if}
						{#if confirmDelete === entry.id}
							<p id={`delete-dream-${entry.id}`}>
								Esta exclusão remove definitivamente este relato do diário.
							</p>
							<button
								type="button"
								onclick={() => remove(entry)}
								disabled={!!busy}
								aria-describedby={`delete-dream-${entry.id}`}>Confirmar exclusão</button
							>
							<button type="button" onclick={() => (confirmDelete = null)} disabled={!!busy}
								>Manter relato</button
							>
						{:else}
							<button type="button" onclick={() => (confirmDelete = entry.id)} disabled={!!busy}
								>Excluir registro</button
							>
						{/if}
					</li>
				{/each}
			</ol>
			{#if writable}
				<form onsubmit={save}>
					<h3>{editing ? 'Editar sonho' : 'Novo sonho'}</h3>
					<label for="atlas-dream-date">Data do sonho</label>
					<input
						id="atlas-dream-date"
						type="date"
						bind:value={dreamDate}
						min={startDate ?? undefined}
						max={endDate ?? undefined}
						required
						disabled={!!busy}
					/>
					<label for="atlas-narrative">Seu relato</label>
					<textarea
						id="atlas-narrative"
						bind:value={narrative}
						maxlength="6000"
						required
						rows="8"
						disabled={!!busy}></textarea>
					<label for="atlas-emotions">Emoções relatadas, uma por linha (até oito)</label>
					<textarea id="atlas-emotions" bind:value={emotions} rows="3" disabled={!!busy}></textarea>
					<label for="atlas-associations">Suas associações pessoais, uma por linha (até oito)</label
					>
					<textarea id="atlas-associations" bind:value={associations} rows="3" disabled={!!busy}
					></textarea>
					<label class="check"
						><input type="checkbox" bind:checked={includeInSynthesis} disabled={!!busy} /> Incluir este
						relato em uma síntese futura, se disponível</label
					>
					<div class="form-actions">
						<button type="submit" disabled={!!busy}>Guardar registro</button>
						{#if editing}<button type="button" onclick={resetForm} disabled={!!busy}
								>Cancelar edição</button
							>{/if}
					</div>
				</form>
			{/if}
		{/if}
	{/if}
</section>

<style>
	.diary {
		margin-block: 2rem;
		padding-block: 2rem;
		border-block: 1px solid var(--atv-border);
	}
	.diary > p {
		max-width: 70ch;
	}
	.notice {
		padding: 1rem;
		border: 1px solid var(--atv-border);
	}
	.entries {
		padding-left: 1.25rem;
	}
	.entries li {
		padding: 1.25rem 0;
		border-bottom: 1px solid var(--atv-border);
	}
	.entries p {
		overflow-wrap: anywhere;
	}
	.narrative {
		white-space: pre-wrap;
	}
	form {
		display: grid;
		gap: 0.75rem;
		max-width: 45rem;
		margin-top: 2rem;
	}
	input,
	textarea {
		box-sizing: border-box;
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--atv-border);
		border-radius: 0.35rem;
		font: inherit;
	}
	.check {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}
	.check input {
		width: auto;
		margin-top: 0.3rem;
	}
	.form-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
	button {
		min-height: 44px;
		margin: 0.35rem 0.5rem 0.35rem 0;
		padding: 0.6rem 1rem;
		border: 1px solid var(--atv-border);
		border-radius: 0.35rem;
		background: var(--atv-surface);
		color: var(--atv-text);
		cursor: pointer;
	}
	button:focus-visible,
	input:focus-visible,
	textarea:focus-visible {
		outline: 2px solid var(--atv-focus);
		outline-offset: 2px;
	}
	button:disabled {
		cursor: wait;
		opacity: 0.6;
	}
</style>
