<script lang="ts">
	import ShopCatalog from '$lib/components/ShopCatalog.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.name} na Loja dos Signos — A Tua Vida nos Astros</title>
	<meta name="robots" content="noindex,follow" />
	<meta
		name="description"
		content={`Conheça as aquarelas de ${data.name} em canecas, ecobags e garrafas da Loja dos Signos. Confira as condições de compra na página de cada peça.`}
	/>
	<link rel="canonical" href={`https://atuavidanosastros.com.br/loja/signo/${data.slug}`} />
</svelte:head>

<div class="container collection-page">
	<a class="back-link" href="/loja">← Loja dos Signos</a>
	<ShopCatalog
		collection={data.collection}
		ariesOnly={data.ariesOnly}
		commerceEnabled={data.shopCommerceEnabled}
	/>
</div>

<style>
	.collection-page {
		padding-block: 1rem 4rem;
		max-width: 1320px;
	}
	.back-link {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		font-size: 0.9rem;
	}
</style>
