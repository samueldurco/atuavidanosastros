<script lang="ts">
	import { onMount } from 'svelte';
	let { identified }: { identified: boolean } = $props();
	let ready = $state(false),
		granted = $state(false),
		owner = $state(''),
		busy = $state(false),
		message = $state('');
	let refresh = $state(0);
	let operation: AbortController | undefined;
	let loading: AbortController | undefined;
	onMount(() => {
		ready = true;
		const clear = () => {
			operation?.abort();
			loading?.abort();
			granted = false;
			owner = '';
			message = '';
			busy = false;
		};
		const reload = () => {
			clear();
			refresh += 1;
		};
		const visibility = () => {
			if (document.hidden) clear();
			else reload();
		};
		window.addEventListener('focus', reload);
		window.addEventListener('blur', clear);
		document.addEventListener('visibilitychange', visibility);
		return () => {
			clear();
			window.removeEventListener('focus', reload);
			window.removeEventListener('blur', clear);
			document.removeEventListener('visibilitychange', visibility);
		};
	});
	$effect(() => {
		void refresh;
		granted = false;
		owner = '';
		message = '';
		busy = false;
		if (!ready || !identified) return;
		const controller = new AbortController();
		loading = controller;
		void fetch('/api/free-tools/news-consent', {
			signal: controller.signal,
			cache: 'no-store',
			redirect: 'error'
		})
			.then(async (response) => {
				const data: unknown = response.ok ? await response.json() : null;
				if (controller.signal.aborted) return;
				if (data && typeof data === 'object' && 'owner' in data && typeof data.owner === 'string')
					owner = data.owner;
				else message = 'Não foi possível carregar esta opção. Seu PDF continua disponível.';
			})
			.catch(() => {
				if (!controller.signal.aborted)
					message = 'Não foi possível carregar esta opção. Seu PDF continua disponível.';
			});
		return () => {
			controller.abort();
			operation?.abort();
		};
	});
	async function save() {
		if (!identified || !owner || busy) return;
		const selected = granted,
			binding = owner;
		const controller = new AbortController();
		operation = controller;
		busy = true;
		message = '';
		try {
			const response = await fetch('/api/free-tools/news-consent', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ granted: selected, owner: binding }),
				cache: 'no-store',
				redirect: 'error',
				signal: controller.signal
			});
			if (controller.signal.aborted || binding !== owner) return;
			if (response.ok)
				message = selected
					? 'Escolha salva: você autorizou novidades por e-mail.'
					: 'Escolha salva: você não autorizou novidades por e-mail.';
			else if (response.status === 409 || response.status === 401) {
				owner = '';
				granted = false;
				message = 'Sua conta mudou ou expirou. Atualize a página para escolher novamente.';
			} else
				message =
					'Não foi possível confirmar sua escolha. Tente novamente; o PDF não depende desta opção.';
		} catch {
			if (!controller.signal.aborted)
				message =
					'Não foi possível confirmar sua escolha. Tente novamente; o PDF não depende desta opção.';
		} finally {
			if (!controller.signal.aborted) busy = false;
		}
	}
</script>

<div class="news-consent">
	<label>
		<input type="checkbox" bind:checked={granted} disabled={!identified || !owner || busy} />
		<span>Quero receber novidades da ATVNA por e-mail <small>(opcional)</small>.</span>
	</label>
	<p>
		Esta escolha é separada do PDF. Você pode recusar ou retirar a autorização desmarcando a opção e
		salvando.
	</p>
	{#if identified}
		<button type="button" class="text-link" disabled={!owner || busy} onclick={save}
			>{busy ? 'Salvando…' : 'Salvar minha escolha'}</button
		>
	{:else}
		<p>Confirme seu e-mail para salvar essa preferência, se desejar.</p>
	{/if}
	{#if message}<p role="status">{message}</p>{/if}
</div>

<style>
	.news-consent {
		margin: 1.25rem 0;
		padding: 1rem 0;
		border-block: 1px solid var(--atv-border);
		font-size: 0.85rem;
	}
	label {
		display: flex;
		align-items: flex-start;
		gap: 0.65rem;
		cursor: pointer;
		line-height: 1.6;
	}
	input {
		flex: 0 0 auto;
		width: 1.2rem;
		height: 1.2rem;
		margin-top: 0.1rem;
		accent-color: var(--atv-ink);
	}
	p {
		margin: 0.55rem 0;
		line-height: 1.6;
	}
	small {
		font-size: inherit;
	}
	button {
		min-height: 44px;
	}
	button:disabled {
		cursor: default;
		opacity: 0.65;
	}
</style>
