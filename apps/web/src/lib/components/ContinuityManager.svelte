<script lang="ts">
	import { tick } from 'svelte';
	import { parseContinuitySelection, type ContinuitySelection } from '@atv/domain';
	import {
		continuityRequest,
		continuityUuid,
		parseContinuityView,
		selectionLabel,
		type ContinuityManagement,
		type ContinuityLibrarySource,
		type ManagedContinuityItem
	} from '$lib/continuity-management';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import type { ReaderContinuityReference } from '$lib/reader-continuity';

	let {
		sources = [],
		references = []
	}: { sources?: ContinuityLibrarySource[]; references?: ReaderContinuityReference[] } = $props();
	let snapshot = $state<ContinuityManagement | null>(null);
	let busy = $state(false);
	let failure = $state('');
	let status = $state('');
	let selected = $state<string[]>([]);
	let authorized = $state(false);
	let runId = $state('');
	let kind = $state<'reported' | 'result' | 'reference'>('reported');
	let referenceKey = $state('');
	const referenceOptions = $derived(references.filter((ref) => ref.runId === runId));
	let category = $state<Extract<ContinuitySelection, { kind: 'reported' }>['category']>('theme');
	let text = $state('');
	let relevance = $state<ManagedContinuityItem['relevance']>('unreviewed');
	let editing = $state<ManagedContinuityItem | null>(null);
	let deleting = $state<ManagedContinuityItem | null>(null);
	let deleteOpen = $state(false);
	let recoveryButton: HTMLDivElement;
	const candidates = $derived(
		sources.filter((s) => s.item_type === 'PRODUCT_RUN' && continuityUuid(s.source_id))
	);
	const scopeOptions = $derived([
		...new Set([...candidates.map((s) => s.source_id!), ...(snapshot?.consent.runIds ?? [])])
	]);
	const writable = $derived(
		!!snapshot?.enabled &&
			snapshot.consent.state === 'granted' &&
			!busy &&
			snapshot.consent.revision < 2147483647
	);
	const selection = $derived<ContinuitySelection | null>(
		editing && editing.selection.kind !== 'reported' && editing.selection.kind !== 'result'
			? editing.selection
			: kind === 'reference'
				? (referenceOptions.find((ref) => ref.key === referenceKey)?.selection ?? null)
				: kind === 'reported'
					? { kind, category, text }
					: { kind: 'result' }
	);
	const valid = $derived(
		writable &&
			snapshot?.consent.runIds.includes(runId) &&
			!!parseContinuitySelection($state.snapshot(selection)) &&
			(editing?.revision ?? 0) < 2147483647
	);
	function title(id: string) {
		return candidates.find((s) => s.source_id === id)?.title ?? `Leitura ${id}`;
	}
	function resetDraft() {
		editing = null;
		runId = '';
		text = '';
		kind = 'reported';
		referenceKey = '';
		category = 'theme';
		relevance = 'unreviewed';
		authorized = false;
	}
	async function read(message = 'Estado consultado. Revise suas escolhas antes de alterar.') {
		if (busy) return;
		busy = true;
		failure = '';
		status = '';
		snapshot = null;
		resetDraft();
		try {
			const value = parseContinuityView(await continuityRequest('read', {}));
			if (!value) throw new Error('invalid_snapshot');
			snapshot = value;
			selected = [...value.consent.runIds];
			status = message;
		} catch {
			failure =
				'Não foi possível consultar a continuidade. Nenhuma nova alteração será enviada até recuperar o estado.';
		} finally {
			busy = false;
		}
	}
	async function mutate(
		action: 'consent' | 'save' | 'delete',
		body: unknown,
		expectedRevision?: number
	) {
		if (busy || !snapshot) return;
		busy = true;
		failure = '';
		status = '';
		try {
			const value = await continuityRequest(action, body);
			if (
				!value ||
				typeof value !== 'object' ||
				(action === 'delete'
					? !('deleted' in value && typeof value.deleted === 'boolean')
					: !('revision' in value && value.revision === expectedRevision! + 1))
			)
				throw new Error('invalid_receipt');
		} catch {
			snapshot = null;
			resetDraft();
			busy = false;
			failure =
				'Não foi possível confirmar a alteração. Ela pode ter sido salva. Consulte o estado antes de decidir novamente; não reenviaremos automaticamente.';
			await tick();
			recoveryButton?.querySelector('button')?.focus();
			return;
		}
		busy = false;
		await read('Alteração confirmada. Estado atualizado; nenhuma leitura foi enviada a um modelo.');
		await tick();
		recoveryButton?.querySelector('button')?.focus();
	}
	function consent(granted: boolean) {
		if (
			!snapshot ||
			(granted && (!authorized || !snapshot.enabled || !selected.length || selected.length > 100))
		)
			return;
		const expectedRevision = snapshot.consent.revision;
		return mutate(
			'consent',
			{
				version: 'atv-continuity-consent/1',
				purpose: 'reading-context',
				expectedRevision,
				granted,
				runIds: granted ? [...selected] : []
			},
			expectedRevision
		);
	}
	function save() {
		if (!valid) return;
		const expectedRevision = editing?.revision ?? 0;
		return mutate(
			'save',
			{
				id: editing?.id ?? crypto.randomUUID(),
				runId,
				expectedRevision,
				relevance,
				selection: $state.snapshot(selection)
			},
			expectedRevision
		);
	}
	function edit(item: ManagedContinuityItem) {
		referenceKey = '';
		editing = item;
		runId = item.runId;
		relevance = item.relevance;
		if (item.selection.kind === 'reported') {
			kind = 'reported';
			category = item.selection.category;
			text = item.selection.text;
		} else {
			kind = 'result';
			text = '';
		}
	}
	async function remove() {
		const item = deleting;
		deleteOpen = false;
		deleting = null;
		await tick();
		if (item) await mutate('delete', { id: item.id });
	}
</script>

<section class="continuity" aria-labelledby="continuity-heading" data-stitch="MEM-02 CMP-02 SH-02">
	<p class="eyebrow">Continuidade ATV+ · controles pessoais</p>
	<h2 id="continuity-heading">Você escolhe o que continua.</h2>
	<p>
		Guardar uma leitura na Biblioteca não autoriza seu uso como contexto. Aqui você revisa
		referências e notas próprias. Nada é inferido automaticamente; nenhum modelo está homologado.
	</p>
	<div bind:this={recoveryButton}>
		<Button variant="secondary" pending={busy} onclick={() => read()}
			>{busy
				? 'Consultando ou salvando…'
				: snapshot
					? 'Atualizar estado da continuidade'
					: 'Consultar continuidade'}</Button
		>
	</div>
	{#if failure}<p role="alert">{failure}</p>{/if}
	<p role="status">{status}</p>
	{#if snapshot}
		{#if !snapshot.enabled}<p class="notice">
				Continuidade indisponível para novas autorizações ou edições. Você ainda pode consultar,
				revogar e excluir seus registros.
			</p>{/if}
		<p>
			Autorização para contexto de leitura: <strong
				>{snapshot.consent.state === 'granted' ? 'concedida' : 'não concedida'}</strong
			>. Revogar impede uso futuro, mas não apaga as notas nem desfaz usos anteriores. Excluir uma
			nota não exclui o resultado original.
		</p>
		<fieldset disabled={busy || !snapshot.enabled || snapshot.consent.revision >= 2147483647}>
			<legend>Leituras que você permite usar como contexto</legend>
			<p>
				A disponibilidade de cada leitura será validada ao salvar. Itens antigos da Bússola não
				participam deste fluxo.
			</p>
			{#each scopeOptions as id (id)}<label class="choice"
					><input
						type="checkbox"
						value={id}
						bind:group={selected}
						onchange={() => (authorized = false)}
					/> <span>{title(id)}</span></label
				>{:else}<p>Nenhuma leitura de produto disponível para escolher.</p>{/each}
			<label class="choice"
				><input type="checkbox" bind:checked={authorized} /><span
					>Autorizo usar somente as leituras selecionadas como contexto de leitura (versão 1). Posso
					revogar a qualquer momento.</span
				></label
			>
			<Button
				disabled={!authorized || !selected.length || selected.length > 100}
				onclick={() => consent(true)}>Salvar autorização e escopo</Button
			>
		</fieldset>
		<Button
			variant="secondary"
			disabled={busy ||
				snapshot.consent.state !== 'granted' ||
				snapshot.consent.revision >= 2147483647}
			onclick={() => consent(false)}>Revogar autorização</Button
		>
		<section aria-labelledby="continuity-items">
			<h3 id="continuity-items">Suas referências e notas</h3>
			{#each snapshot.items as item (item.id)}
				<article>
					<h4>{title(item.runId)}</h4>
					<p class="note">{selectionLabel(item.selection)}</p>
					<p>
						{item.selection.kind === 'reported'
							? 'Relato seu, não um fato calculado.'
							: 'Referência escolhida; disponibilidade revalidada antes de qualquer uso.'}
					</p>
					<p>
						Relevância: {item.relevance === 'relevant'
							? 'relevante'
							: item.relevance === 'irrelevant'
								? 'não relevante'
								: 'não revisada'}.
					</p>
					<div class="actions">
						<Button
							variant="secondary"
							disabled={!writable || !snapshot.consent.runIds.includes(item.runId)}
							onclick={() => edit(item)}>Revisar registro</Button
						>
						<Button
							variant="tertiary"
							disabled={busy}
							onclick={() => {
								deleting = item;
								deleteOpen = true;
							}}>Excluir registro</Button
						>
					</div>
				</article>
			{:else}<p>Você ainda não guardou referências ou notas para continuidade.</p>{/each}
		</section>
		<form
			onsubmit={(event) => {
				event.preventDefault();
				void save();
			}}
		>
			<fieldset disabled={!writable}>
				<legend>{editing ? 'Revisar registro escolhido' : 'Guardar uma referência ou nota'}</legend>
				<Field id="continuity-run" label="Leitura de origem"
					>{#snippet children(describedBy)}<select
							id="continuity-run"
							bind:value={runId}
							onchange={() => (referenceKey = '')}
							disabled={!!editing}
							aria-describedby={describedBy}
							required
							><option value="">Escolha uma leitura autorizada</option
							>{#each snapshot?.consent.runIds ?? [] as id (id)}<option value={id}
									>{title(id)}</option
								>{/each}</select
						>{/snippet}</Field
				>
				{#if !editing || ['reported', 'result'].includes(editing.selection.kind)}
					<Field id="continuity-kind" label="Tipo de registro"
						>{#snippet children(describedBy)}<select
								id="continuity-kind"
								bind:value={kind}
								onchange={() => (referenceKey = '')}
								aria-describedby={describedBy}
								><option value="reported">Nota escrita por mim</option><option value="result"
									>Referência ao resultado</option
								>{#if !editing && referenceOptions.length}<option value="reference"
										>Seção ou ciclo desta leitura</option
									>{/if}</select
							>{/snippet}</Field
					>
					{#if kind === 'reference'}
						<Field
							id="continuity-reference"
							label="Referência da leitura"
							help="Escolha explicitamente. Hipóteses não são fatos; referências de ciclos dependem de validação no servidor."
						>
							{#snippet children(describedBy)}<select
									id="continuity-reference"
									bind:value={referenceKey}
									aria-describedby={describedBy}
									required
								>
									<option value="">Escolha uma seção ou ciclo</option>
									{#each referenceOptions as ref (ref.key)}<option value={ref.key}
											>{ref.label}</option
										>{/each}
								</select>{/snippet}
						</Field>
						{#if referenceKey}
							<p class="note">
								Referência escolhida: {referenceOptions.find((ref) => ref.key === referenceKey)
									?.label}
							</p>
						{/if}
					{:else if kind === 'reported'}
						<Field id="continuity-category" label="Categoria da nota"
							>{#snippet children(describedBy)}<select
									id="continuity-category"
									bind:value={category}
									aria-describedby={describedBy}
									><option value="theme">Tema</option><option value="event">Acontecimento</option
									><option value="recurrence">Recorrência percebida por mim</option><option
										value="preference">Preferência</option
									><option value="symbol">Símbolo</option><option value="change">Mudança</option
									></select
								>{/snippet}</Field
						>
						<Field
							id="continuity-text"
							label="Sua nota"
							help="Até 600 caracteres. Evite dados identificáveis de outras pessoas."
							>{#snippet children(describedBy)}<textarea
									id="continuity-text"
									bind:value={text}
									maxlength="600"
									rows="4"
									required
									aria-describedby={describedBy}></textarea>{/snippet}</Field
						>
					{/if}
				{:else}<p>
						{selectionLabel(editing.selection)}. Nesta tela você pode revisar sua relevância, sem
						alterar a fonte.
					</p>{/if}
				<Field id="continuity-relevance" label="Relevância para você"
					>{#snippet children(describedBy)}<select
							id="continuity-relevance"
							bind:value={relevance}
							aria-describedby={describedBy}
							><option value="unreviewed">Ainda não revisei</option><option value="relevant"
								>Relevante</option
							><option value="irrelevant">Não relevante</option></select
						>{/snippet}</Field
				>
				<p>
					Apenas registros marcados como relevantes podem ser selecionados para contexto, sempre sob
					consentimento e gates vigentes. Salvar não inicia uma interpretação.
				</p>
				<div class="actions">
					<Button type="submit" disabled={!valid}>Salvar registro revisado</Button
					>{#if editing}<Button variant="tertiary" onclick={resetDraft}>Cancelar revisão</Button
						>{/if}
				</div>
			</fieldset>
		</form>
	{/if}
</section>
<Dialog id="continuity-delete" title="Excluir registro de continuidade?" bind:open={deleteOpen}>
	{#if deleting}<p>Leitura: {title(deleting.runId)}</p>
		<p class="note">{selectionLabel(deleting.selection)}</p>{/if}
	<p>Esta nota ou referência será removida. O resultado original permanece na Biblioteca.</p>
	<div class="actions">
		<Button variant="secondary" onclick={() => (deleteOpen = false)}>Manter registro</Button><Button
			variant="destructive"
			disabled={busy}
			onclick={remove}>Confirmar exclusão do registro</Button
		>
	</div>
</Dialog>

<style>
	.continuity {
		margin-block: 3rem;
		padding: clamp(1rem, 3vw, 2rem);
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-md);
		background: var(--atv-surface-card);
		overflow-wrap: anywhere;
	}
	h2 {
		font: 500 clamp(2rem, 4vw, 2.875rem)/1.15 var(--atv-font-display);
		margin: 0.75rem 0;
	}
	h3 {
		font: 500 1.6rem var(--atv-font-display);
	}
	h4 {
		font-size: 1rem;
		margin: 0;
	}
	p {
		max-width: 45rem;
		line-height: 1.6;
	}
	fieldset {
		min-width: 0;
		margin-block: 1.5rem;
		padding: 1rem;
		border: 1px solid var(--atv-border);
		display: grid;
		gap: 1rem;
	}
	legend {
		padding-inline: 0.4rem;
		font-weight: 600;
	}
	.choice {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		min-height: 44px;
		padding-block: 0.5rem;
		cursor: pointer;
	}
	.choice input {
		flex: 0 0 auto;
		width: 1.2rem;
		height: 1.2rem;
		margin-top: 0.15rem;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
	article {
		padding-block: 1.5rem;
		border-top: 1px solid var(--atv-border);
	}
	.note {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.notice {
		padding: 1rem;
		background: var(--atv-surface-muted);
		border-left: 3px solid var(--atv-text-primary);
	}
</style>
