<script lang="ts">
	import { mvpProductDesign } from '$lib/data/mvp-visual';
	let { productId, mode = 'card' }: { productId: string; mode?: 'card' | 'hero' } = $props();
	const design = $derived(mvpProductDesign(productId));
</script>

<div class="mvp-product-art" class:hero={mode === 'hero'}>
	{#if design}
		<!-- Static artwork exported from the approved MVP; no runtime or customer content. -->
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html design.art}
	{/if}
</div>

<style>
	.mvp-product-art {
		width: 100%;
		min-width: 0;
	}
	.hero {
		height: 100%;
		display: grid;
	}
	.hero :global(.product-art) {
		height: 100%;
		min-height: 430px;
		aspect-ratio: auto;
	}
	@media (max-width: 700px) {
		.hero :global(.product-art) {
			min-height: 0;
			height: auto;
			aspect-ratio: 600 / 440;
		}
	}
</style>
