<script lang="ts">
	import type { LayoutProps } from './$types';
	import ShopSellerInformation from '$lib/components/ShopSellerInformation.svelte';
	let { data, children }: LayoutProps = $props();
</script>

{@render children()}

{#if data.shopSeller}
	<div class="container seller-container">
		<ShopSellerInformation seller={data.shopSeller} />
	</div>
{/if}

<style>
	.seller-container {
		padding-bottom: clamp(2rem, 5vw, 4rem);
	}
</style>
