<script lang="ts">
	import { SITE, universes } from '$lib/data/site';
	import MvpProductCard from '$lib/components/MvpProductCard.svelte';
	import MvpProductArt from '$lib/components/MvpProductArt.svelte';
	import { interestNavigation } from '$lib/data/public-navigation';
	import { freeTools } from '$lib/data/free-tools';
	import { mvpArt, mvpTheme, mvpThemes } from '$lib/data/mvp-visual';
	let { data } = $props();
	const count = $derived(data.groups.reduce((sum, group) => sum + group.products.length, 0));
</script>

<svelte:head>
	<title>Leituras e experiências — {SITE.name}</title>
	<meta
		name="description"
		content="Explore os produtos digitais da ATVNA: mapa astral, previsões, relacionamentos, carreira, Tarot e sonhos. Confira o conteúdo e a disponibilidade de cada leitura."
	/>
	<link rel="canonical" href={`${SITE.url}/leituras`} />
</svelte:head>

<div class="mvp-public">
	<section class="section catalog-intro">
		<div class="wrap">
			<p class="eyebrow">Produtos digitais</p>
			<h1>Leituras e experiências</h1>
			<p class="lead">
				Escolha um assunto e conheça as leituras para você. Cada página apresenta o conteúdo, os
				dados necessários e a disponibilidade do produto.
			</p>
			<p>
				Quer começar gratuitamente? <a href="/ferramentas/ascendente">Descubra seu Ascendente</a> ou
				<a href="/ferramentas">explore as ferramentas grátis</a>. Você recebe o resultado antes de
				criar a conta.
			</p>
			<nav class="topics" aria-label="Temas das leituras">
				<a href="/leituras" aria-current={!data.selected ? 'page' : undefined}>Todos os temas</a>
				{#each universes as universe (universe.slug)}<a
						href={'/leituras?tema=' + universe.slug}
						aria-current={data.selected === universe.slug ? 'page' : undefined}>{universe.title}</a
					>{/each}
			</nav>
			<p class="catalog-count" aria-live="polite">
				{count}
				{count === 1 ? 'leitura neste catálogo' : 'leituras neste catálogo'}
			</p>
		</div>
	</section>
	<div class="public-catalog-groups">
		{#each data.groups as group (group.slug)}
			{@const theme = mvpTheme(group.slug)}
			{@const topic = interestNavigation.find(
				(item) => item.productUniverse === group.productUniverse
			)}
			<section class="universe-catalog-group theme-{theme}" aria-labelledby={'group-' + group.slug}>
				<div class="wrap">
					<header class="catalog-group-header">
						<div>
							<p class="eyebrow">{group.eyebrow}</p>
							<h2 id={'group-' + group.slug}>{group.title}</h2>
							<p>{group.description}</p>
							<div class="topic-path">
								<a href={group.href}>Explorar este tema <span aria-hidden="true">↗</span></a>
								{#each freeTools.filter((tool) => tool.topicId === topic?.id) as tool (tool.id)}<a
										href={tool.href}>{tool.label} grátis <span aria-hidden="true">↗</span></a
									>{/each}
							</div>
						</div>
						<img
							src={mvpArt(mvpThemes[theme].art)}
							alt=""
							width="240"
							height="180"
							loading="lazy"
						/>
					</header>
					<div class="grid grid-3">
						{#each group.products as product (product.id)}<MvpProductCard
								{product}
								trialAccess={Boolean(data.trialAccess)}
							/>{/each}
					</div>
				</div>
			</section>
		{/each}
	</div>
	<aside class="wrap section continuity" aria-label="Continuidade das leituras">
		<div class="paper continuity-inner">
			<div>
				<p class="eyebrow">Suas leituras, em continuidade</p>
				<h2>ATV+</h2>
				<p>
					Conheça a proposta de acompanhamento das suas leituras e dos registros que você autorizar
					guardar.
				</p>
				<a class="text-link" href="/produtos/atv-plus"
					>Conhecer o ATV+ <span aria-hidden="true">→</span></a
				>
			</div>
			<MvpProductArt productId="atv-plus" />
		</div>
	</aside>
</div>

<style>
	.catalog-intro {
		background: url('/brand/mvp/assets/papel-fino.webp') center/cover;
		padding-bottom: 2rem;
	}
	.catalog-intro .lead,
	.catalog-intro p {
		max-width: 780px;
	}
	.topics {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
		margin-block: 2rem;
	}
	.topics a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0.65rem 1rem;
		border: 1px solid var(--atv-border);
		text-decoration: none;
		background: #fff8;
	}
	.topics a[aria-current='page'] {
		background: var(--atv-action);
		color: #fff;
	}
	.catalog-count {
		font-size: 0.85rem;
	}
	.catalog-group-header {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 220px;
		gap: 2rem;
		align-items: center;
		margin-bottom: 2rem;
	}
	.catalog-group-header h2 {
		color: var(--universe-color);
		margin-bottom: 0.75rem;
	}
	.catalog-group-header img {
		width: 100%;
		height: 180px;
		object-fit: contain;
	}
	.catalog-group-header p {
		max-width: 650px;
	}
	.topic-path {
		display: flex;
		flex-wrap: wrap;
		column-gap: 1.5rem;
	}
	.topic-path a {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}
	.continuity-inner {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		align-items: center;
		padding: 2rem;
	}
	@media (max-width: 700px) {
		.catalog-group-header {
			grid-template-columns: 1fr;
			gap: 0;
		}
		.catalog-group-header img {
			display: none;
		}
		.continuity-inner {
			grid-template-columns: 1fr;
			padding: 1.5rem;
		}
	}
</style>
