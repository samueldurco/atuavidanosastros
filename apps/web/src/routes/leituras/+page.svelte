<script lang="ts">
	import { SITE, universes } from '$lib/data/site';
	import VisualHeading from '$lib/components/VisualHeading.svelte';
	import V4Artwork from '$lib/components/V4Artwork.svelte';
	import { visualUniverse } from '$lib/data/visual-v4';
	let { data } = $props();
</script>

<svelte:head>
	<title>Leituras e experiências — {SITE.name}</title>
	<meta
		name="description"
		content="Explore os produtos digitais da ATVNA: mapa astral, previsões, relacionamentos, carreira, Tarot e sonhos. Confira o conteúdo e a disponibilidade de cada leitura."
	/>
	<link rel="canonical" href={`${SITE.url}/leituras`} />
</svelte:head>

<section class="section">
	<div class="container">
		<p class="eyebrow">Produtos digitais</p>
		<h1 class="h1">Leituras e experiências</h1>
		<p class="lead">
			Escolha um assunto e conheça as leituras para você. Cada página apresenta o conteúdo, os dados
			necessários e a disponibilidade do produto.
		</p>
		<nav class="topics" aria-label="Temas das leituras">
			<a href="/leituras" aria-current={!data.selected ? 'page' : undefined}>Todos os temas</a>
			{#each universes as universe (universe.slug)}
				<a
					href={`/leituras?tema=${universe.slug}`}
					aria-current={data.selected === universe.slug ? 'page' : undefined}>{universe.title}</a
				>
			{/each}
		</nav>
		{#each data.groups as group (group.slug)}
			<section
				class="product-group"
				data-universe={visualUniverse(group.slug)}
				aria-labelledby={`group-${group.slug}`}
			>
				<div class="v4-title-group with-object">
					<V4Artwork identity={group.slug} title />
					<VisualHeading
						title={group.title}
						identity={group.slug}
						theme
						level={2}
						id={`group-${group.slug}`}
					/>
				</div>
				<div class="grid grid-3">
					{#each group.products as product (product.id)}
						<article class="card product-card v4-paper-card">
							<div class="v4-paper-face" aria-hidden="true"></div>
							<V4Artwork identity={product.id} />
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
							<a href={data.trialAccess ? `/testar-produtos/${product.id}` : product.href}
								>{data.trialAccess ? `Testar ${product.name} grátis` : product.cta}
								<span aria-hidden="true">→</span></a
							>
						</article>
					{/each}
				</div>
			</section>
		{/each}
		<aside class="continuity" aria-label="Continuidade das leituras">
			<h2>ATV+</h2>
			<p>
				Conheça a proposta de acompanhamento das suas leituras e dos registros que você autorizar
				guardar.
			</p>
			<a href="/produtos/atv-plus">Conhecer o ATV+ →</a>
		</aside>
	</div>
</section>

<style>
	.topics {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-block: 2rem 3rem;
	}
	.topics a {
		padding: 0.65rem 1rem;
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-md);
		text-decoration: none;
	}
	.topics a[aria-current='page'] {
		background: var(--atv-action);
		color: #fff;
	}
	.product-group {
		margin-block: 3rem;
		scroll-margin-top: 6rem;
	}
	.product-card {
		display: flex;
		flex-direction: column;
		padding: 1.5rem;
	}
	.product-card h3 {
		font: 500 1.7rem/1.2 var(--atv-font-display);
		margin-block: 0.5rem;
	}
	.product-card > p:not(.eyebrow) {
		flex: 1;
		color: var(--atv-text-secondary);
	}
	.product-card a {
		margin-top: 1rem;
		font-weight: 600;
	}
	.continuity {
		margin-top: 4rem;
		padding: 2rem;
		border: 1px solid var(--atv-border);
	}
	.continuity h2 {
		font: 500 2rem var(--atv-font-display);
		margin-top: 0;
	}
</style>
