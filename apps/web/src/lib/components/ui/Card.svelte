<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		eyebrow,
		title,
		children,
		variant = 'editorial'
	}: {
		eyebrow?: string;
		title: string;
		children?: Snippet;
		variant?: 'editorial' | 'product' | 'attention' | 'data' | 'result';
	} = $props();
</script>

<article class={`card atv-card ${variant}`}>
	{#if eyebrow}<p class="eyebrow">{eyebrow}</p>{/if}
	<h2>{title}</h2>
	{#if children}<div class="card-content">{@render children()}</div>{/if}
</article>

<style>
	.atv-card {
		padding: clamp(1.25rem, 3vw, 2rem);
		box-shadow: none;
	}
	h2 {
		margin: 0;
		font: 500 clamp(1.5rem, 2.5vw, 2rem)/1.2 var(--atv-font-display);
	}
	.card-content {
		margin-top: 1rem;
	}
	.attention {
		border-top: 3px solid var(--atv-gold-500);
	}
	.data {
		background: var(--atv-surface-muted);
		font-variant-numeric: tabular-nums;
	}
	.data h2 {
		font: 600 1rem var(--atv-font-ui);
	}
	.result {
		border-inline-start: 3px solid var(--atv-action);
	}
</style>
