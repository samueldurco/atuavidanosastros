<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		heading,
		children,
		actions,
		contents = []
	}: {
		heading: Snippet;
		children: Snippet;
		actions?: Snippet;
		contents?: { id: string; label: string }[];
	} = $props();
</script>

<div class="reader-shell" data-shell="reading">
	{@render heading()}
	<div class="reader-grid">
		<nav aria-label="Índice do resultado" class="reader-index">
			<p class="eyebrow">Nesta leitura</p>
			<ol>
				{#each contents as item (item.id)}<li><a href={`#${item.id}`}>{item.label}</a></li>{/each}
			</ol>
		</nav>
		<div class="reader-content">{@render children()}</div>
		{#if actions}<aside class="reader-actions" aria-label="Ações do resultado">
				{@render actions()}
			</aside>{/if}
	</div>
</div>

<style>
	.reader-shell {
		width: min(100% - 2 * var(--atv-page-margin), var(--atv-container-public));
		margin-inline: auto;
		padding-block: clamp(2.5rem, 5vw, 5rem);
	}
	.reader-grid {
		display: grid;
		grid-template-columns: minmax(8rem, 0.7fr) minmax(0, 3fr) minmax(11rem, 0.9fr);
		gap: clamp(1.5rem, 3vw, 3rem);
		align-items: start;
	}
	.reader-index,
	.reader-actions {
		position: sticky;
		top: 2rem;
	}
	.reader-index ol {
		padding-left: 1.15rem;
		margin: 1rem 0;
	}
	.reader-index li {
		padding-left: 0.25rem;
	}
	.reader-index a {
		display: block;
		padding-block: 0.65rem;
		font-size: 0.875rem;
	}
	.reader-content {
		min-width: 0;
		max-width: var(--atv-container-reading);
	}
	@media (max-width: 1100px) {
		.reader-grid {
			grid-template-columns: minmax(0, 1fr) 13rem;
		}
		.reader-index {
			grid-column: 1 / -1;
			position: static;
			border-bottom: 1px solid var(--atv-border);
		}
		.reader-index ol {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem 2rem;
			margin-bottom: 1rem;
		}
	}
	@media (max-width: 767px) {
		.reader-grid {
			grid-template-columns: 1fr;
		}
		.reader-actions {
			position: static;
		}
	}
</style>
