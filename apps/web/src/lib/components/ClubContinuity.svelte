<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { trialResponse } from '$lib/trials/response';
	import type { ClubItem, ClubState, ClubPreparation } from '$lib/trials/club-continuity';
	let {
		initial,
		readings
	}: {
		initial: { state: ClubState; preparation: ClubPreparation } | null;
		readings: { id: string; title: string; chapters: string[] }[];
	} = $props();
	let current = $state(untrack(() => initial));
	let items = $state<ClubItem[]>(
		untrack(
			() =>
				initial?.state.items.map(({ id, readingId, selection }) => ({
					id,
					readingId,
					selection
				})) ?? []
		)
	);
	let readingId = $state(''),
		kind = $state('result'),
		category = $state('theme'),
		note = $state(''),
		section = $state('');
	let consent = $state(false),
		ready = $state(false),
		busy = $state(false),
		message = $state('');
	const selected = $derived(readings.find((r) => r.id === readingId));
	onMount(() => {
		ready = true;
	});
	function add() {
		if (
			!selected ||
			items.length >= 12 ||
			(kind === 'reported' && !note.trim()) ||
			(kind === 'hypothesis' && section === '')
		)
			return;
		const selection: ClubItem['selection'] =
			kind === 'reported'
				? { kind: 'reported', category: category as 'theme', text: note }
				: kind === 'hypothesis'
					? { kind: 'hypothesis', sectionIndex: Number(section) }
					: { kind: 'result' };
		items = [...items, { id: crypto.randomUUID(), readingId, selection }];
		readingId = '';
		note = '';
		section = '';
		consent = false;
		message = 'Item escolhido. Confira a lista e autorize para salvar.';
	}
	async function save(granted: boolean) {
		if (!current || busy || (granted && (!consent || !items.length))) return;
		busy = true;
		message = '';
		try {
			const response = await fetch('/api/private-trials/continuity', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					revision: current.state.revision,
					granted,
					items: granted ? items : []
				})
			});
			const body = await trialResponse<{
				state: ClubState;
				preparation: ClubPreparation;
				message?: string;
			}>(response);
			if (!response.ok)
				throw Error(
					body.message ?? 'Não foi possível salvar. Suas escolhas continuam nesta página.'
				);
			current = body;
			items = body.state.items.map(({ id, readingId, selection }) => ({
				id,
				readingId,
				selection
			}));
			consent = false;
			message = granted
				? 'Suas escolhas e sua autorização foram salvas. Nenhuma nova leitura foi gerada.'
				: 'Autorização removida. Todos os itens deste contexto foram apagados.';
		} catch (e) {
			message = e instanceof Error ? e.message : 'Não foi possível salvar. Tente novamente.';
		} finally {
			busy = false;
		}
	}
</script>

<section class="continuity card" aria-labelledby="continuity-heading">
	<p class="eyebrow">Continuidade escolhida por você</p>
	<h2 id="continuity-heading">O que você quer retomar?</h2>
	<p>
		Escolha leituras anteriores ou etapas de uma jornada. Você pode guardar o título, um capítulo
		específico ou um tema que você mesmo percebeu. Nenhuma memória é deduzida do seu histórico.
	</p>
	<p>
		Esta etapa prepara seu contexto privado. Nenhuma nova interpretação será gerada. Leituras
		anteriores continuam sendo interpretações; temas e recorrências são relatos seus.
	</p>
	{#if !current}<p role="status">
			O acompanhamento ainda está indisponível. Suas leituras continuam na Biblioteca.
		</p>
	{:else}
		{#if current.state.available}
			<div class="curation">
				<label
					>Leitura ou jornada<select
						bind:value={readingId}
						onchange={() => {
							section = '';
						}}
						><option value="">Escolha uma leitura</option
						>{#each readings as reading (reading.id)}<option value={reading.id}
								>{reading.title}</option
							>{/each}</select
					></label
				>
				<label
					>O que guardar<select bind:value={kind}
						><option value="result">Título da leitura</option><option value="hypothesis"
							>Um capítulo da leitura</option
						><option value="reported">Um tema ou relato meu</option></select
					></label
				>
				{#if kind === 'hypothesis'}<label
						>Capítulo escolhido<select bind:value={section}
							><option value="">Escolha um capítulo</option
							>{#each selected?.chapters ?? [] as title, index (index)}<option value={String(index)}
									>{title}</option
								>{/each}</select
						></label
					>
				{:else if kind === 'reported'}<label
						>Tipo de relato<select bind:value={category}
							><option value="theme">Tema</option><option value="recurrence"
								>Recorrência percebida por mim</option
							><option value="event">Acontecimento relatado</option><option value="preference"
								>Preferência</option
							><option value="symbol">Símbolo</option><option value="change"
								>Mudança percebida por mim</option
							></select
						></label
					><label>Seu relato<textarea bind:value={note} rows="3" maxlength="600"></textarea></label
					>{/if}
				<button
					onclick={add}
					disabled={!ready ||
						busy ||
						!selected ||
						items.length >= 12 ||
						(kind === 'reported' && !note.trim()) ||
						(kind === 'hypothesis' && section === '')}>Adicionar à seleção</button
				>
			</div>
		{/if}
		<h3>Sua seleção · {items.length} de 12 itens</h3>
		{#if items.length}<ol>
				{#each items as item (item.id)}<li>
						<a href={`/testar-produtos/leituras/${item.readingId}`}
							>{readings.find((r) => r.id === item.readingId)?.title ?? 'Leitura selecionada'}</a
						>
						<p>
							{item.selection.kind === 'reported'
								? item.selection.text
								: item.selection.kind === 'hypothesis'
									? `Capítulo ${item.selection.sectionIndex + 1}`
									: 'Título da leitura'}
						</p>
						<button
							class="secondary"
							onclick={() => {
								items = items.filter((i) => i.id !== item.id);
								consent = false;
							}}
							disabled={busy}
							aria-label={`Retirar item ${items.indexOf(item) + 1} da seleção`}
							>Retirar da seleção</button
						>
					</li>{/each}
			</ol>{:else}<p>Nenhum item selecionado. Seu histórico não é incluído automaticamente.</p>{/if}
		{#if current.state.available}<label class="consent"
				><input type="checkbox" bind:checked={consent} disabled={!ready || busy} /><span
					>Autorizo guardar somente estes itens para preparar meu contexto de continuidade no ATV+.
					Posso remover a autorização e apagar os itens quando quiser. Um uso futuro exigirá nova
					conferência das fontes e desta autorização.</span
				></label
			><button onclick={() => save(true)} disabled={!ready || busy || !consent || !items.length}
				>Salvar seleção autorizada</button
			>{/if}
		<button
			class="secondary revoke"
			onclick={() => save(false)}
			disabled={!ready || busy || !current.state.granted}
			>Remover autorização e apagar contexto</button
		>
		{#if current.state.granted}
			<p class="saved">
				Há uma autorização salva. As alterações acima só passam a valer depois de salvar.
			</p>
			{#if current.preparation.status === 'prepared'}<details>
					<summary>Conferir o contexto salvo</summary>
					<ul>
						{#each current.preparation.context.items as item (item.alias)}<li>
								<strong
									>{item.origin === 'user-reported'
										? 'Relato seu'
										: 'Interpretação anterior'}</strong
								>
								<p>{item.text}</p>
							</li>{/each}
					</ul>
				</details>
			{:else}<p>
					O contexto salvo não pode ser preparado agora. Uma fonte pode estar indisponível ou o
					conjunto exceder o limite. Revise a seleção ou remova a autorização.
				</p>{/if}
		{/if}
	{/if}
	<p role="status" aria-live="polite">{message}</p>
</section>

<style>
	.continuity {
		padding: clamp(1rem, 4vw, 2rem);
		margin: 2.5rem auto;
		max-width: 850px;
		box-sizing: border-box;
	}
	.curation,
	label {
		display: grid;
		gap: 0.6rem;
	}
	.curation {
		gap: 1rem;
		margin: 1.5rem 0;
	}
	p,
	li {
		line-height: 1.7;
		overflow-wrap: anywhere;
	}
	a {
		color: inherit;
		text-underline-offset: 0.2em;
	}
	select,
	textarea {
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
		font: inherit;
		padding: 0.7rem;
		color: #182c29;
		background: white;
		border: 1px solid #85765f;
		border-radius: 0.4rem;
	}
	button {
		font: inherit;
		padding: 0.7rem 1rem;
		border: 1px solid #243d39;
		border-radius: 0.5rem;
		background: #243d39;
		color: white;
		white-space: normal;
	}
	button:disabled {
		opacity: 0.6;
	}
	.secondary {
		background: white;
		color: #243d39;
	}
	.revoke {
		display: block;
		margin-top: 1rem;
	}
	.consent {
		display: flex;
		align-items: flex-start;
		margin: 1.5rem 0;
	}
	input {
		flex: 0 0 auto;
		margin-top: 0.3rem;
		width: 1.15rem;
		height: 1.15rem;
	}
	li {
		margin-bottom: 1rem;
	}
	ol,
	ul {
		padding-left: 1.4rem;
	}
	details {
		margin: 1rem 0;
	}
	summary {
		cursor: pointer;
		padding: 0.7rem 0;
	}
	.saved {
		font-weight: 600;
	}
</style>
