<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
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
	let consent = $state(false);
	let ready = $state(false);
	let busy = $state(false);
	let feedback: HTMLParagraphElement;
	let alive = true;
	onMount(() => {
		if (synthetic || !ownerId) return;
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
		if (!client || !ready || busy || disabled || synthetic) return;
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
</script>

<section id="email" aria-labelledby="email-title" aria-busy={busy}>
	<p class="eyebrow">Entrega e privacidade</p>
	<h2 id="email-title">Pedido de e-mail</h2>
	<p>
		Uma solicitação registrada não confirma envio nem entrega. Nenhum endereço ou conteúdo da
		leitura fica salvo nesta aba.
	</p>
	{#if !allowNew || synthetic || !ownerId}
		<p>
			Novos pedidos de e-mail estão indisponíveis. Se esta aba preservou a chave de um pedido desta
			versão, você pode consultar seu estado e cancelá-lo.
		</p>
	{/if}
	{#if outcome.mode === 'new'}
		{#if allowNew && !synthetic && ownerId}
			<label class="consent"
				><input type="checkbox" bind:checked={consent} disabled={disabled || busy || !ready} />
				<span
					>Solicito um e-mail sobre esta leitura para minha própria conta, conforme a política de
					entrega. Isso não autoriza marketing.</span
				>
			</label>
		{/if}
		<Button
			variant="secondary"
			disabled={!ready || !allowNew || !consent || disabled || synthetic || !reviewDigest}
			pending={busy}
			onclick={() => act('perform')}>Solicitar e-mail</Button
		>
	{:else if outcome.mode === 'recover' || outcome.mode === 'requested' || outcome.mode === 'cancelled'}
		<div class="controls">
			<Button
				variant="secondary"
				disabled={!ready || disabled || synthetic}
				pending={busy}
				onclick={() => act('recover')}>Consultar pedido original</Button
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
	<p
		class="feedback"
		bind:this={feedback}
		role="status"
		aria-live="polite"
		aria-atomic="true"
		tabindex="-1"
	>
		{busy ? 'Confirmando o estado do pedido…' : outcome.message}
	</p>
	<p class="privacy">
		A recuperação depende da chave guardada nesta aba para esta conta e versão. Fechar a aba ou
		limpar seus dados pode remover essa chave; abrir outra sessão não recupera pedidos
		automaticamente. Nenhuma consulta cria ou reativa um pedido.
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
