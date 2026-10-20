<script lang="ts">
	import type { Snippet } from 'svelte';
	import BrandLogo from '../BrandLogo.svelte';
	let { children }: { children: Snippet } = $props();
</script>

<div class="journey-shell" data-journey-shell>
	<header class="journey-header">
		<div class="journey-brand" aria-label="A Tua Vida nos Astros"><BrandLogo onDark={false} /></div>
		<p>Uma etapa da sua jornada</p>
	</header>
	<main id="conteudo" tabindex="-1">{@render children()}</main>
	<footer class="journey-footer">A Tua Vida nos Astros · Sua leitura continua na Minha Área</footer>
</div>

<style>
	.journey-shell {
		min-height: 100vh;
		background: var(--atv-surface-page, #f8f5ef);
	}
	.journey-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.1rem var(--atv-page-margin, 5vw);
		border-bottom: 1px solid var(--atv-border, #dfd8cb);
	}
	.journey-brand {
		display: flex;
		align-items: center;
		width: clamp(9rem, 18vw, 14rem);
	}
	.journey-brand :global(svg) {
		width: 100%;
		height: auto;
	}
	.journey-header p,
	.journey-footer {
		font-size: 0.76rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--atv-text-secondary, #665e54);
	}
	.journey-footer {
		padding: 2rem var(--atv-page-margin, 5vw);
		text-align: center;
	}
	@media (max-width: 600px) {
		.journey-header p {
			max-width: 8rem;
			text-align: right;
		}
	}
</style>
