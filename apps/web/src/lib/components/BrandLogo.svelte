<script lang="ts">
	import { page } from '$app/state';
	import { visualContext } from '$lib/data/visual-v4';
	let { compact = false, onDark }: { compact?: boolean; onDark?: boolean } = $props();
	const dark = $derived(
		onDark ??
			!visualContext(
				page.url.pathname,
				page.url.search,
				page.data.product?.id || page.data.saved?.product_id || page.data.run?.productId
			).universe
	);
	const tone = $derived(dark ? 'escuro' : 'claro');
</script>

<picture class:compact>
	{#if !compact}<source
			media="(min-width: 1000px)"
			srcset={`/brand/v4/MARCA/KIT_A_V001/vetores/atvna-horizontal-${tone}.svg`}
		/>{/if}
	<img
		src={`/brand/v4/MARCA/KIT_A_V001/vetores/atvna-compacta-${tone}.svg`}
		alt="A Tua Vida nos Astros"
		width="480"
		height="142"
	/>
</picture>

<style>
	picture {
		display: block;
		width: 100%;
	}
	img {
		display: block;
		width: 100%;
		height: auto;
	}
</style>
