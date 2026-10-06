<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import EditorialArticle from '$lib/components/EditorialArticle.svelte';
	let { data } = $props();
</script>

<svelte:head>
	{#if !data.document && data.page}
		<title>{data.page.title} — A Tua Vida nos Astros</title>
		<meta name="description" content={data.page.description} />
		<link rel="canonical" href={`https://atuavidanosastros.com.br/${data.slug}`} />
	{/if}
</svelte:head>
{#if data.document}
	<EditorialArticle document={data.document} />
{:else if data.page}
	<section class="section">
		<div class="reading">
			<p class="eyebrow">{data.page.eyebrow}</p>
			<h1 class="h1">{data.page.title}</h1>
			<p class="lead">{data.page.description}</p>
			{#each data.sections as section (section.title)}
				<section class="topic-section">
					<h2>{section.title}</h2>
					{#each section.paragraphs as paragraph, index (index)}<p>{paragraph}</p>{/each}
				</section>
			{/each}
			{#if data.products.length}
				<section aria-labelledby="products-heading">
					<h2 id="products-heading">Escolha sua leitura</h2>
					<p>Confira o conteúdo e a disponibilidade de cada produto.</p>
					<div class="product-grid">
						{#each data.products as product (product.id)}
							<article class="card product-card">
								<p class="eyebrow">
									{data.trialAccess
										? 'Teste gratuito disponível'
										: product.state === 'ACTIVE'
											? 'Disponível'
											: product.state === 'PAUSED'
												? 'Indisponível no momento'
												: 'Em preparação'}
								</p>
								<h3>{product.name}</h3>
								<p>{product.summary}</p>
								<Button
									href={data.trialAccess ? `/testar-produtos/${product.id}` : product.href}
									variant="secondary"
									>{data.trialAccess ? `Testar ${product.name} grátis` : product.cta}</Button
								>
							</article>
						{/each}
					</div>
				</section>
			{:else}
				<Button href={data.page.href}>{data.page.cta}</Button>
			{/if}
			{#if data.slug === 'proposito'}
				<p class="free-tool">
					<Button href="/bussola-de-carreira">Calcular meu Meio do Céu grátis</Button>
				</p>
			{:else if data.slug === 'caderno'}
				<ul class="guide-links">
					<li><a href="/vocacao-no-mapa-astral">Vocação no mapa astral</a></li>
					<li><a href="/carreira-no-mapa-astral">Carreira no mapa astral</a></li>
					<li><a href="/casa-10">Casa 10: carreira e vida pública</a></li>
					<li><a href="/meio-do-ceu">O que é o Meio do Céu?</a></li>
				</ul>
			{/if}
		</div>
	</section>
{/if}

<style>
	.topic-section {
		margin-block: 2rem;
	}
	h2 {
		font: 500 1.8rem/1.25 var(--atv-font-display);
	}
	.topic-section p {
		line-height: 1.75;
	}
	.product-grid {
		display: grid;
		gap: 1rem;
		margin-block: 1.5rem;
	}
	.product-card {
		padding: 1.5rem;
	}
	.product-card h3 {
		font: 500 1.5rem/1.3 var(--atv-font-display);
		margin-block: 0.5rem;
	}
	.product-card p:not(.eyebrow) {
		color: var(--atv-text-secondary);
		line-height: 1.6;
	}
	.free-tool {
		margin-top: 2rem;
	}
	.guide-links li {
		margin-block: 1rem;
	}
	@media (min-width: 48rem) {
		.product-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
