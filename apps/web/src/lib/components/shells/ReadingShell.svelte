<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		heading,
		children,
		actions,
		layout = 'reading',
		contents = []
	}: {
		heading: Snippet;
		children: Snippet;
		actions?: Snippet;
		layout?: 'reading' | 'atlas';
		contents?: { id: string; label: string }[];
	} = $props();
</script>

<div class="reader-shell" class:atlas={layout === 'atlas'} data-shell="reading">
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
	.atlas .reader-grid {
		grid-template-columns: minmax(0, 1fr) 16rem;
	}
	.atlas .reader-content {
		grid-column: 1;
		grid-row: 2;
		max-width: none;
	}
	.atlas .reader-index {
		grid-column: 2;
		grid-row: 2;
		position: static;
		padding: 1.25rem;
		border: 1px solid var(--atv-border);
		background: var(--atv-surface-card);
	}
	.atlas .reader-actions {
		grid-column: 1 / -1;
		grid-row: 1;
		position: static;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--atv-border);
	}
	@media (max-width: 1100px) {
		.atlas .reader-grid {
			grid-template-columns: minmax(0, 1fr);
		}
		.atlas .reader-index {
			grid-column: 1;
			grid-row: 2;
		}
		.atlas .reader-index ol {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 0 2rem;
		}
		.atlas .reader-content {
			grid-row: 3;
		}
	}
	@media (max-width: 767px) {
		.reader-grid {
			grid-template-columns: 1fr;
		}
		.reader-actions {
			position: static;
		}
		.atlas .reader-index ol {
			grid-template-columns: 1fr;
		}
	}
</style>
