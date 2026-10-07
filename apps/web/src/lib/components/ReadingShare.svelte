<script lang="ts">
	import { trialResponse } from '$lib/trials/response';
	let { id }: { id: string } = $props();
	let consent = $state(false),
		busy = $state(false),
		link = $state(''),
		status = $state('');
	async function update(action: 'create-share' | 'revoke-share') {
		busy = true;
		status = '';
		try {
			const response = await fetch(`/api/private-trials/${id}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action, consent })
			});
			const value = await trialResponse<{ url?: string; message?: string }>(response);
			link = value.url ?? '';
			status =
				action === 'create-share'
					? 'Link criado. Ele expira em sete dias. Um novo link substitui o anterior.'
					: 'O link desta leitura foi desativado.';
		} catch (e) {
			status = e instanceof Error ? e.message : 'Não foi possível atualizar o link.';
		} finally {
			busy = false;
		}
	}
</script>

<section aria-labelledby="share-reading-title">
	<h2 id="share-reading-title">Conversem sobre a leitura</h2>
	<p>
		Crie um link para a outra pessoa abrir os capítulos sem entrar na sua conta. Quem receber o link
		poderá ler e copiar o conteúdo, incluindo nomes e situações mencionadas na interpretação. Suas
		anotações, avaliações e dados de acesso ficam na biblioteca privada.
	</p>
	<label
		><input type="checkbox" bind:checked={consent} /> Tenho autorização da outra pessoa e quero compartilhar
		o conteúdo desta leitura.</label
	>
	<div class="actions">
		<button disabled={busy || !consent} onclick={() => update('create-share')}
			>Criar link por sete dias</button
		><button disabled={busy} onclick={() => update('revoke-share')}
			>Desativar link desta leitura</button
		>
	</div>
	{#if link}<label
			>Seu link<input
				readonly
				value={link}
				onclick={(event) => event.currentTarget.select()}
			/></label
		>{/if}
	<p role="status">{status}</p>
</section>

<style>
	section {
		margin-block: 2rem;
		padding: 1.5rem;
		border: 1px solid var(--atv-border, #ddd);
		border-radius: 1rem;
	}
	h2 {
		font-family: var(--atv-font-display);
	}
	label {
		display: block;
		line-height: 1.6;
	}
	input[readonly] {
		width: 100%;
		padding: 0.8rem;
		margin-top: 0.5rem;
		box-sizing: border-box;
	}
	.actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-block: 1rem;
	}
	button {
		padding: 0.8rem 1rem;
		min-height: 44px;
	}
	p {
		line-height: 1.7;
	}
</style>
