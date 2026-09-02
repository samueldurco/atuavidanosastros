<script lang="ts">
	import { browser } from '$app/environment';
	let visible = $state(false);
	if (browser) visible = !localStorage.getItem('atv-analytics-consent');
	function choose(value: 'granted' | 'denied') {
		localStorage.setItem('atv-analytics-consent', value);
		visible = false;
		if (value === 'granted') location.reload();
	}
</script>

{#if visible}<aside class="consent" aria-label="Preferências de cookies">
		<div>
			<strong>Você escolhe o que mede a sua visita.</strong>
			<p>
				Usamos armazenamento essencial para o site funcionar. Analytics só é carregado se você
				aceitar; não enviamos dados natais ou informações pessoais ao GA4.
			</p>
			<a href="/cookies">Conheça a política de cookies</a>
		</div>
		<div class="actions">
			<button class="secondary" onclick={() => choose('denied')}>Recusar analytics</button><button
				onclick={() => choose('granted')}>Aceitar analytics</button
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
