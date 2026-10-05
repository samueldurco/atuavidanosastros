<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		createProductEmailHistory,
		type ProductEmailHistoryState
	} from '$lib/product-email-history';
	import {
		createProductEmailRequest,
		type ProductEmailRequestState
	} from '$lib/product-email-request';
	let {
		ownerId,
		runId,
		revision,
		reviewDigest,
		allowNew = false,
		disabled = false,
		synthetic = false,
		onBusyChange = () => {}
	}: {
		ownerId?: string;
		runId: string;
		revision: number;
		reviewDigest: string | null;
		allowNew?: boolean;
		disabled?: boolean;
		synthetic?: boolean;
		onBusyChange?: (active: boolean) => void;
	} = $props();
	let outcome = $state<ProductEmailRequestState>({ mode: 'new', message: '' });
	let client: ReturnType<typeof createProductEmailRequest> | undefined;
	let historyClient: ReturnType<typeof createProductEmailHistory> | undefined;
	let history = $state<ProductEmailHistoryState>({ mode: 'idle', message: '', receipts: [] });
	let historySelected = $state(false);
	let historyReady = $state(false);
	let consent = $state(false);
	let ready = $state(false);
	let busy = $state(false);
	let feedback: HTMLParagraphElement;
	let alive = true;
	onMount(() => {
		if (synthetic || !ownerId) return;
		historyClient = createProductEmailHistory({ ownerId, runId, fetch });
		history = historyClient.inspect();
		historyReady = history.mode !== 'blocked';
		try {
			client = createProductEmailRequest({
				ownerId,
				runId,
				revision,
				reviewDigest,
				storage: sessionStorage,
				fetch,
				randomUUID: () => crypto.randomUUID()
			});
			outcome = client.inspect();
			ready = true;
		} catch {
			outcome = {
				mode: 'blocked',
				message: 'A recuperação não está disponível nesta aba. Nenhuma alteração foi enviada.'
			};
		}
	});
	onDestroy(() => {
		alive = false;
	});
	async function act(action: 'perform' | 'recover' | 'cancel') {
		if (!client || !ready || historySelected || busy || disabled || synthetic) return;
		busy = true;
		onBusyChange(true);
		try {
			const result =
				action === 'perform' ? await client.perform(allowNew, consent) : await client[action]();
			if (!alive) return;
			outcome = result;
			consent = false;
		} finally {
			if (alive) {
				busy = false;
				onBusyChange(false);
				await tick();
				if (alive) feedback?.focus();
			}
		}
	}
	async function consult(receiptId?: string) {
		if (!historyClient || !historyReady || busy || disabled || synthetic) return;
		// Use one source of acknowledged state; do not reuse stale exact-key controls.
		historySelected = true;
		consent = false;
		busy = true;
		onBusyChange(true);
		try {
			const result = receiptId ? await historyClient.cancel(receiptId) : await historyClient.list();
			if (alive) history = result;
		} finally {
			if (alive) {
				busy = false;
				onBusyChange(false);
				await tick();
				if (alive) feedback?.focus();
			}
		}
	}
</script>

<section id="email" aria-labelledby="email-title" aria-busy={busy}>
	<p class="eyebrow">E-mail</p>
	<h2 id="email-title">Lembrete por e-mail</h2>
	<p>
		Peça um e-mail com o link da Biblioteca. Você pode acompanhar o pedido abaixo. O envio ainda
		precisa ser confirmado.
	</p>
	{#if !allowNew || synthetic || !ownerId}
		<p>
			Novos pedidos de e-mail estão indisponíveis. Você pode consultar os pedidos desta leitura,
			inclusive de revisões anteriores, e cancelar os que ainda estiverem registrados.
		</p>
	{/if}
	{#if !historySelected && outcome.mode === 'new'}
		{#if allowNew && !synthetic && ownerId}
			<label class="consent"
				><input type="checkbox" bind:checked={consent} disabled={disabled || busy || !ready} />
				<span
					>Quero receber um e-mail com o link desta leitura na minha conta. Esta autorização vale
					apenas para esse pedido.</span
				>
			</label>
		{/if}
		<Button
			variant="secondary"
			disabled={!ready || !allowNew || !consent || disabled || synthetic || !reviewDigest}
			pending={busy}
			onclick={() => act('perform')}>Solicitar e-mail</Button
		>
	{:else if !historySelected && (outcome.mode === 'recover' || outcome.mode === 'requested' || outcome.mode === 'cancelled')}
		<div class="controls">
			<Button
				variant="secondary"
				disabled={!ready || disabled || synthetic}
				pending={busy}
				onclick={() => act('recover')}>Consultar pedido</Button
			>
			{#if outcome.mode === 'requested'}
				<Button
					variant="tertiary"
					disabled={!ready || disabled || synthetic}
					pending={busy}
					onclick={() => act('cancel')}>Cancelar pedido</Button
				>
			{/if}
		</div>
	{/if}
	<div class="history-controls">
		<Button
			variant="secondary"
			disabled={!historyReady || disabled || synthetic}
			pending={busy}
			onclick={() => consult()}>Ver pedidos de e-mail</Button
		>
	</div>
	{#if historySelected && history.mode === 'ready' && history.receipts.length === 0}
		<p class="history-empty">Você ainda não pediu um lembrete para esta leitura.</p>
	{:else if historySelected && history.mode === 'ready' && history.receipts.length > 0}
		<ul class="receipts" aria-label="Pedidos de e-mail desta leitura">
			{#each history.receipts as receipt (receipt.id)}
				<li>
					<div>
						<h3>Revisão {receipt.revision}</h3>
						<p>{receipt.state === 'CANCELLED' ? 'Pedido cancelado' : 'Solicitação registrada'}</p>
					</div>
					{#if receipt.state === 'REQUESTED'}
						<Button
							variant="tertiary"
							disabled={disabled || synthetic}
							pending={busy}
							onclick={() => consult(receipt.id)}
							>Cancelar pedido da revisão {receipt.revision}</Button
						>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
	<p
		class="feedback"
		bind:this={feedback}
		role="status"
		aria-live="polite"
		aria-atomic="true"
		tabindex="-1"
	>
		{busy ? 'Confirmando o estado do pedido…' : historySelected ? history.message : outcome.message}
	</p>
	<p class="privacy">
		A consulta usa sua conta autenticada e não depende da chave desta aba. Os recibos são exibidos
		apenas durante esta visita, sem serem guardados no navegador. Nada é consultado automaticamente.
		Nenhuma consulta cria, reativa ou envia um pedido.
	</p>
</section>

<style>
	section {
		scroll-margin-top: 2rem;
		margin-bottom: 3rem;
		border-top: 1px solid var(--atv-border);
		padding-top: 2rem;
		overflow-wrap: anywhere;
	}
	h2 {
		margin: 0 0 1.5rem;
	}
	.controls {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.history-controls {
		margin-top: 1rem;
	}
	.receipts {
		list-style: none;
		padding: 0;
		margin: 1.5rem 0;
	}
	.receipts li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.75rem;
		border-top: 1px solid var(--atv-border);
		padding-block: 1rem;
	}
	.receipts h3 {
		margin: 0;
		font-size: 1rem;
	}
	.receipts p {
		margin: 0.25rem 0 0;
	}
	.consent {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		min-height: 44px;
		padding-block: 0.75rem;
		cursor: pointer;
	}
	input {
		flex-shrink: 0;
		width: 1.25rem;
		height: 1.25rem;
		margin-top: 0.2rem;
		accent-color: var(--atv-text-primary);
	}
	.feedback:empty {
		margin: 0;
	}
	.feedback {
		font-weight: 500;
	}
	.privacy {
		font-size: 0.85rem;
		color: var(--atv-text-secondary);
	}
</style>
