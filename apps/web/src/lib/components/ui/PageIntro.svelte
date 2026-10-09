<script lang="ts">
	import VisualHeading from '../VisualHeading.svelte';
	import V4Artwork from '../V4Artwork.svelte';
	import type { Snippet } from 'svelte';
	let {
		eyebrow,
		title,
		description,
		identity,
		actions
	}: {
		eyebrow: string;
		title: string;
		description?: string;
		identity?: string;
		actions?: Snippet;
	} = $props();
</script>

<header class="page-intro">
	<div>
		<p class="eyebrow">{eyebrow}</p>
		<div class="v4-title-group" class:with-object={!!identity}>
			{#if identity}<V4Artwork {identity} title eager />{/if}
			<VisualHeading {title} identity={identity ?? title} />
		</div>
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
