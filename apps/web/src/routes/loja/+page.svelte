<script lang="ts">
	import ShopShowcase from '$lib/components/ShopShowcase.svelte';
</script>

<svelte:head>
	<title>Produtos físicos · Loja dos Signos — A Tua Vida nos Astros</title>
	<meta
		name="description"
		content="Produtos físicos da Loja dos Signos: conheça as primeiras artes para pôsteres inspirados no zodíaco e nas fases da Lua. Coleção em preparação."
	/>
	<link rel="canonical" href="https://atuavidanosastros.com.br/loja" />
</svelte:head>

<div class="container shop-page">
	<p class="catalog-alternative">
		Procura mapas astrais, previsões, Tarot ou interpretação de sonhos? <a href="/leituras"
			>Ver o catálogo de leituras digitais</a
		>.
	</p>
	<ShopShowcase showLink={false} headingLevel="h1" />
	<aside class="shop-reading" aria-labelledby="shop-reading-title">
		<div>
			<p class="eyebrow">Enquanto a coleção ganha forma</p>
			<h2 id="shop-reading-title">Conheça os símbolos por trás das artes.</h2>
			<p>
				Na Revista ATVNA, você encontra artigos sobre o mapa astral, os ciclos da Lua e outros
				temas.
			</p>
		</div>
		<a href="/revista">Ler a Revista ATVNA <span aria-hidden="true">→</span></a>
	</aside>
</div>

<style>
	.shop-page {
		padding-top: clamp(1rem, 3vw, 3rem);
		padding-bottom: clamp(3rem, 6vw, 6rem);
	}
	.catalog-alternative {
		max-width: 48rem;
		line-height: 1.6;
	}
	.shop-reading {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 1.5rem 3rem;
		border-top: 1px solid var(--atv-border);
		padding-top: 2.5rem;
	}
	.shop-reading h2 {
		font: 500 clamp(1.6rem, 3vw, 2.5rem)/1.15 var(--atv-font-display);
		margin: 0;
		max-width: 30rem;
	}
	.shop-reading p:last-child {
		max-width: 36rem;
		line-height: 1.7;
	}
	.shop-reading a {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 44px;
	}
</style>
