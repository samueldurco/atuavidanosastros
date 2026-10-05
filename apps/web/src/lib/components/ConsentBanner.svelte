<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	let visible = $state(false);
	if (browser) visible = !localStorage.getItem('atv-analytics-consent');
	onMount(() => {
		const reopen = () => {
			visible = true;
		};
		window.addEventListener('atv-cookie-preferences', reopen);
		return () => window.removeEventListener('atv-cookie-preferences', reopen);
	});
	function choose(value: 'granted' | 'denied') {
		const previous = localStorage.getItem('atv-analytics-consent');
		localStorage.setItem('atv-analytics-consent', value);
		visible = false;
		// The first refusal has no analytics running and must preserve the current task.
		// Reload only when enabling analytics or stopping a previously granted session.
		if (previous !== value && (value === 'granted' || previous === 'granted')) location.reload();
	}
</script>

{#if visible}<aside class="consent" aria-label="Preferências de cookies">
		<div>
			<strong>Cookies e estatísticas de uso</strong>
			<p>
				Usamos cookies essenciais para o site funcionar. Com sua permissão, também medimos o uso das
				páginas. Seus dados de nascimento não entram nessas estatísticas.
			</p>
			<a href="/cookies">Conheça a política de cookies</a>
		</div>
		<div class="actions">
			<button class="secondary" onclick={() => choose('denied')}>Recusar opcionais</button><button
				onclick={() => choose('granted')}>Aceitar opcionais</button
			>
		</div>
	</aside>{/if}

<style>
	.consent {
		position: fixed;
		z-index: 60;
		left: 1rem;
		right: 1rem;
		bottom: 1rem;
		max-width: 70rem;
		margin: auto;
		background: var(--atv-surface-card);
		color: var(--atv-text-primary);
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-lg);
		box-shadow: 0 24px 70px rgb(3 23 68 / 22%);
		padding: 1.25rem;
		display: flex;
		justify-content: space-between;
		gap: 2rem;
		align-items: end;
	}
	.consent p {
		margin: 0.35rem 0;
		font-size: 0.9rem;
		max-width: 48rem;
	}
	.consent a {
		font-size: 0.8rem;
	}
	.actions {
		display: flex;
		gap: 0.75rem;
		flex-shrink: 0;
	}
	button {
		min-height: 44px;
		border: 1px solid var(--atv-action);
		border-radius: var(--atv-radius-pill);
		background: var(--atv-action);
		color: #fff;
		padding: 0.7rem 1rem;
		font-weight: 650;
	}
	.secondary {
		background: transparent;
		color: var(--atv-action);
	}
	@media (max-width: 760px) {
		.consent {
			flex-direction: column;
			align-items: stretch;
		}
		.actions {
			flex-direction: column-reverse;
		}
	}
</style>
