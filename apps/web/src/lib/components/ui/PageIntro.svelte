<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		eyebrow,
		title,
		description,
		actions
	}: { eyebrow: string; title: string; description?: string; actions?: Snippet } = $props();
</script>

<header class="page-intro">
	<div>
		<p class="eyebrow">{eyebrow}</p>
		<h1>{title}</h1>
		{#if description}<p class="intro-description">{description}</p>{/if}
	</div>
	{#if actions}<div class="intro-actions">{@render actions()}</div>{/if}
</header>

<style>
	.page-intro {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		justify-content: space-between;
		align-items: flex-end;
		padding-bottom: 2rem;
		margin-bottom: 2rem;
		border-bottom: 1px solid var(--atv-border);
	}
	.page-intro > div:first-child {
		flex: 1 1 24rem;
		min-width: 0;
	}
	h1 {
		margin: 0;
		font: 500 clamp(2.25rem, 4vw, 3.75rem)/1.1 var(--atv-font-display);
		letter-spacing: -0.025em;
	}
	.intro-description {
		margin: 1rem 0 0;
		max-width: 45rem;
		font: 400 1.1875rem/1.6 var(--atv-font-editorial);
		color: var(--atv-text-secondary);
	}
	.intro-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
</style>
