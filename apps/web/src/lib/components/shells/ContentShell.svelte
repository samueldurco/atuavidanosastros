<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		kind,
		children
	}: { kind: 'product' | 'reading' | 'commercial' | 'store' | 'backoffice'; children: Snippet } =
		$props();
</script>

<div class={`content-shell ${kind}`} data-shell={kind}>{@render children()}</div>

<style>
	.content-shell {
		width: min(100% - 2 * var(--atv-page-margin), var(--atv-container-public));
		margin-inline: auto;
		padding-block: clamp(3rem, 6vw, 6rem);
	}
	.reading {
		max-width: var(--atv-container-reading);
		font-family: var(--atv-font-editorial);
	}
	.product,
	.backoffice {
		max-width: var(--atv-container-member);
	}
	.backoffice {
		padding-block: 2rem;
	}
</style>
