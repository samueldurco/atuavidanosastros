<script lang="ts">
	import ShopShowcase from '$lib/components/ShopShowcase.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.name} na Loja dos Signos — A Tua Vida nos Astros</title>
	<meta name="robots" content="noindex,follow" />
	<meta
		name="description"
		content={`Conheça as aquarelas de ${data.name} em canecas, ecobags e garrafas da Loja dos Signos. Coleção em preparação.`}
	/>
	<link rel="canonical" href={`https://atuavidanosastros.com.br/loja/signo/${data.slug}`} />
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
