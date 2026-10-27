<script lang="ts">
	import ShopShowcase from '$lib/components/ShopShowcase.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.collection.name} — Loja dos Signos</title>
	<meta name="robots" content="noindex,follow" />
	<meta
		name="description"
		content={data.collection.slug === 'casal'
			? 'Dois signos em composições de afeto. Conheça as camisetas Namorados e Sinastria e os detalhes de cada estampa.'
			: `Conheça as aquarelas e os detalhes das peças da coleção ${data.collection.name}, na Loja dos Signos.`}
	/>
	<link rel="canonical" href={`https://atuavidanosastros.com.br${data.collection.href}`} />
</svelte:head>

<div class="container collection-page">
	<a class="back-link" href="/loja">← Loja dos Signos</a>
	<ShopShowcase showLink={false} headingLevel="h1" collection={data.collection} />
</div>

<style>
	.collection-page {
		padding-block: clamp(2rem, 5vw, 4rem);
	}
	.back-link {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		font-size: 0.9rem;
	}
</style>
