<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import MvpProductCard from '$lib/components/MvpProductCard.svelte';
	import EditorialArticle from '$lib/components/EditorialArticle.svelte';
	import { mvpArt, mvpTheme, mvpThemes } from '$lib/data/mvp-visual';
	let { data } = $props();
	const theme = $derived(mvpTheme(data.slug));
</script>

<svelte:head>
	{#if !data.document && data.page}<title>{data.page.title} — A Tua Vida nos Astros</title><meta
			name="description"
			content={data.page.description}
		/><link rel="canonical" href={'https://atuavidanosastros.com.br/' + data.slug} />{/if}
</svelte:head>
{#if data.document}
	<EditorialArticle document={data.document} related={data.related} />
{:else if data.page}
	<div class="mvp-public">
		<div class:themed={data.products.length > 0} class="theme-{theme}">
			{#if data.products.length}
				<section class="universe-hero">
					<div class="universe-hero-surface">
						<div class="universe-hero-copy">
							<p class="eyebrow">{data.page.eyebrow}</p>
							<h1>{data.page.title}</h1>
							<p class="lead">{data.page.description}</p>
							<a class="button primary" href="#leituras"
								>Conhecer as leituras <span aria-hidden="true">↗</span></a
							>
						</div>
						<div class="universe-hero-emblem" aria-hidden="true">
							<img src={mvpArt(mvpThemes[theme].art)} alt="" width="550" height="420" />
						</div>
					</div>
				</section>
			{:else}
				<header class="section">
					<div class="reading">
						<p class="eyebrow">{data.page.eyebrow}</p>
						<h1>{data.page.title}</h1>
						<p class="lead">{data.page.description}</p>
					</div>
				</header>
			{/if}
			<div class="section">
				<div class="reading">
					{#each data.sections as section (section.title)}<section class="topic-section">
							<h2>{section.title}</h2>
							{#each section.paragraphs as paragraph, index (index)}<p>{paragraph}</p>{/each}
						</section>{/each}
					{#if !data.products.length}<Button href={data.page.href}>{data.page.cta}</Button>{/if}
					{#if data.slug === 'proposito'}<p class="free-tool">
							<Button href="/bussola-de-carreira">Calcular meu Meio do Céu grátis</Button>
						</p>
					{:else if data.slug === 'caderno'}<ul class="guide-links">
							<li><a href="/vocacao-no-mapa-astral">Vocação no mapa astral</a></li>
							<li><a href="/carreira-no-mapa-astral">Carreira no mapa astral</a></li>
							<li><a href="/casa-10">Casa 10: carreira e vida pública</a></li>
							<li><a href="/meio-do-ceu">O que é o Meio do Céu?</a></li>
						</ul>{/if}
				</div>
			</div>
			{#if data.products.length}
				<section class="section universe-readings" id="leituras" aria-labelledby="products-heading">
					<div class="wrap">
						<p class="eyebrow">Aprofunde o assunto</p>
						<h2 id="products-heading">Escolha sua leitura</h2>
						<p>Confira o conteúdo e a disponibilidade de cada produto.</p>
						<div class="grid grid-3 product-grid">
							{#each data.products as product (product.id)}<MvpProductCard
									{product}
									trialAccess={Boolean(data.trialAccess)}
								/>{/each}
						</div>
					</div>
				</section>
			{/if}
		</div>
	</div>
{/if}

<style>
	.topic-section {
		margin-block: 2rem;
	}
	.topic-section p {
		line-height: 1.75;
	}
	.product-grid {
		margin-block: 1.5rem;
	}
	.free-tool {
		margin-top: 2rem;
	}
	.guide-links li {
		margin-block: 1rem;
	}
</style>
