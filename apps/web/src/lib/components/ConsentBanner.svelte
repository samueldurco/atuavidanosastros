<script lang="ts">
	import { browser } from '$app/environment';
	import { onNavigate } from '$app/navigation';
	import { changeAnalyticsConsent } from '$lib/analytics/consent';
	import { onMount } from 'svelte';
	let visible = $state(false);
	if (browser) visible = !localStorage.getItem('atv-analytics-consent');
	onNavigate(({ from }) => {
		if (from) document.documentElement.setAttribute('data-atv-internal-navigation', '');
	});
	onMount(() => {
		const reopen = () => {
			visible = true;
		};
		const close = () => {
			visible = false;
		};
		window.addEventListener('atv-cookie-preferences', reopen);
		window.addEventListener('atv-analytics-consent-change', close);
		return () => {
			window.removeEventListener('atv-cookie-preferences', reopen);
			window.removeEventListener('atv-analytics-consent-change', close);
		};
	});
</script>

{#if visible}<aside class="consent" aria-label="Preferências de cookies">
		<div>
			<strong>Cookies e estatísticas de uso</strong>
			<p>
				Usamos cookies essenciais para o site funcionar. Com sua permissão, também medimos o uso das
				páginas. Seus dados de nascimento não entram nessas estatísticas.
			</p>
			<a href="/privacidade">Privacidade e cookies</a>
		</div>
		<div class="actions">
			<button class="secondary" onclick={() => changeAnalyticsConsent('denied')}
				>Recusar opcionais</button
			><button onclick={() => changeAnalyticsConsent('granted')}>Aceitar opcionais</button>
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
		max-height: calc(100dvh - 2rem);
		overflow-y: auto;
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
