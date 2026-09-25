<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import Button from './ui/Button.svelte';
	import { createReprocessRequest, type ReprocessState } from '$lib/reprocess-request';
	let {
		runId,
		productId,
		allowed,
		disabled = false,
		synthetic = false,
		onBusyChange
	}: {
		runId: string;
		productId: string;
		allowed: boolean;
		disabled?: boolean;
		synthetic?: boolean;
		onBusyChange?: (busy: boolean) => void;
	} = $props();
	let client: ReturnType<typeof createReprocessRequest> | undefined;
	let outcome = $state<ReprocessState>({ mode: 'blocked', message: '' });
	let busy = $state(false);
	let feedback = $state<HTMLParagraphElement>();
	onMount(() => {
		if (synthetic) return;
		try {
			client = createReprocessRequest({
				runId,
				productId,
				storage: sessionStorage,
				fetch,
				randomUUID: () => crypto.randomUUID()
			});
			outcome = client.inspect();
		} catch {
			outcome = {
				mode: 'blocked',
				message: 'O armazenamento desta aba está indisponível. Nenhum pedido foi enviado.'
			};
		}
	});
	async function act() {
		if (!client || busy || disabled || synthetic || outcome.mode === 'blocked') return;
		busy = true;
		onBusyChange?.(true);
		outcome = await client.perform(allowed);
		if (outcome.href) {
			try {
				await goto(outcome.href, { invalidateAll: true });
			} catch {
				outcome = {
					mode: 'recover',
					message:
						'O pedido foi localizado, mas não foi possível abrir a Biblioteca. Consulte novamente; nenhum novo envio será feito.'
				};
			}
		}
		busy = false;
		onBusyChange?.(false);
		await tick();
		feedback?.focus();
	}
</script>

<div aria-busy={busy}>
	<Button
		variant="secondary"
		pending={busy}
		disabled={synthetic ||
			disabled ||
			busy ||
			outcome.mode === 'blocked' ||
			(outcome.mode === 'new' && !allowed)}
		onclick={act}
		>{outcome.mode === 'recover'
			? 'Consultar pedido original'
			: 'Reprocessar em nova versão'}</Button
	>
	{#if outcome.message}<p bind:this={feedback} tabindex="-1" role="status">
			{outcome.message}
		</p>{/if}
</div>

<style>
	p {
		max-width: 65ch;
		margin-block: 0.75rem;
	}
	p:focus-visible {
		outline: 3px solid var(--atv-focus);
		outline-offset: 3px;
	}
</style>
