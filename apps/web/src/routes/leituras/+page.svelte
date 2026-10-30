<script lang="ts">
	import { SITE, universes } from '$lib/data/site';
	import DigitalShowcase from '$lib/components/home/DigitalShowcase.svelte';
	import CatalogProductCard from '$lib/components/home/CatalogProductCard.svelte';
	let { data } = $props();
	const count = $derived(data.groups.reduce((sum, group) => sum + group.products.length, 0));
</script>

<svelte:head>
	<title>Leituras digitais — {SITE.name}</title>
	<meta
		name="description"
		content="Explore os produtos digitais da ATVNA: mapa astral, previsões, relacionamentos, carreira, Tarot e sonhos. Confira o conteúdo e a disponibilidade de cada leitura."
	/>
	<link rel="canonical" href={`${SITE.url}/leituras`} />
</svelte:head>

<div class="mvp-public catalog-approved">
	<section class="catalog-intro wrap">
		<nav class="breadcrumb" aria-label="Caminho da página">
			<a href="/">Início</a><span aria-hidden="true">/</span><span>Produtos digitais</span>
		</nav>
		<div class="intro">
			<p class="eyebrow">Produtos digitais</p>
			<h1>Escolha sua próxima<br />descoberta.</h1>
			<p class="lead">
				Uma leitura para aprofundar um tema ou uma assinatura para acompanhar seus ciclos. Conheça o
				conteúdo e o formato de cada produto.
			</p>
		</div>
		<DigitalShowcase showDiscovery={false} />
	</section>
	<section class="wrap catalog-list" id="catalogo" aria-labelledby="catalog-heading">
		<div class="catalog-title">
			<div>
				<p class="eyebrow">Catálogo de leituras avulsas</p>
				<h2 id="catalog-heading">Encontre o seu tema.</h2>
			</div>
			<p>Explore os seis universos e confira a disponibilidade de cada leitura.</p>
		</div>
		<nav class="topics" aria-label="Temas das leituras">
			<a href="/leituras#catalogo" aria-current={!data.selected ? 'page' : undefined}
				>Todos os temas</a
			>
			{#each universes as universe (universe.slug)}<a
					href={'/leituras?tema=' + universe.slug + '#catalogo'}
					aria-current={data.selected === universe.slug ? 'page' : undefined}>{universe.title}</a
				>{/each}
		</nav>
		<p class="catalog-count" aria-live="polite">
			{count}
			{count === 1 ? 'leitura digital neste catálogo' : 'leituras digitais neste catálogo'}
		</p>
		<div class="catalog-grid">
			{#each data.groups as group (group.slug)}{#each group.products as product (product.id)}<CatalogProductCard
						{product}
						universe={group.title}
						trialAccess={Boolean(data.trialAccess)}
					/>{/each}{/each}
		</div>
	</section>
</div>

<style>
	.catalog-approved {
		background: #f4efdf url('/brand/mvp/assets/papel-fino.webp');
		padding-bottom: 88px;
		color: #173e4a;
	}
	.catalog-approved .wrap {
		width: min(1180px, calc(100% - 88px));
		margin-inline: auto;
	}
	.catalog-intro {
		padding-top: 28px;
	}
	.breadcrumb {
		display: flex;
		gap: 10px;
		font:
			400 10px/1.6 'Onest',
			Arial,
			sans-serif;
	}
	.breadcrumb a {
		color: inherit;
		text-decoration: none;
	}
	.intro {
		padding: 52px 0 48px;
		max-width: 870px;
	}
	.intro h1 {
		font:
			400 clamp(52px, 5vw, 76px)/0.99 'Newsreader',
			Georgia,
			serif;
		letter-spacing: -0.035em;
		margin: 20px 0 25px;
	}
	.intro .lead {
		max-width: 690px;
		font:
			400 16px/1.8 'Onest',
			Arial,
			sans-serif;
		margin: 0;
	}
	.catalog-title {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 30px;
		margin: 64px 0 25px;
	}
	.catalog-title h2 {
		font:
			500 44px/1.1 'Newsreader',
			Georgia,
			serif;
		margin: 10px 0 0;
	}
	.catalog-title > p {
		font:
			400 12px/1.7 'Onest',
			Arial,
			sans-serif;
		max-width: 340px;
		margin: 0;
	}
	.catalog-approved .eyebrow {
		font:
			600 10px/1.5 'Onest',
			Arial,
			sans-serif;
		text-transform: uppercase;
		letter-spacing: 0.17em;
		margin: 0;
	}
	.topics {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 25px 0 18px;
	}
	.topics a {
		min-height: 44px;
		padding: 12px 17px;
		display: inline-flex;
		align-items: center;
		border: 1px solid #9caa9e;
		font:
			400 11px/1.5 'Onest',
			Arial,
			sans-serif;
		color: inherit;
		text-decoration: none;
		background: transparent;
	}
	.topics a[aria-current='page'] {
		background: #173e4a;
		border-color: #173e4a;
		color: #fff7e7;
	}
	.catalog-count {
		font:
			400 11px/1.7 'Onest',
			Arial,
			sans-serif;
		margin: 0 0 26px;
	}
	.catalog-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 24px;
	}
	.catalog-list {
		scroll-margin-top: 100px;
	}
	@media (max-width: 1050px) {
		.catalog-approved .wrap {
			width: calc(100% - 52px);
		}
		.catalog-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 700px) {
		.catalog-approved .wrap {
			width: calc(100% - 36px);
		}
		.intro {
			padding: 36px 0;
		}
		.intro h1 {
			font-size: 49px;
		}
		.intro .lead {
			font-size: 14px;
		}
		.catalog-title {
			flex-direction: column;
			align-items: start;
			gap: 15px;
			margin-top: 46px;
		}
		.catalog-title h2 {
			font-size: 38px;
		}
		.catalog-grid {
			grid-template-columns: 1fr;
			gap: 24px;
		}
		.topics {
			gap: 6px;
		}
		.topics a {
			font-size: 10px;
			padding: 10px 12px;
		}
	}
</style>
