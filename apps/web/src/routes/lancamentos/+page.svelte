<script lang="ts">
	import { productTrialHref } from '@atv/domain';
	import DigitalProductArtwork from '$lib/components/DigitalProductArtwork.svelte';
	import DigitalStoreNav from '$lib/components/DigitalStoreNav.svelte';
	import { SITE } from '$lib/data/site';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let search = $state('');
	let universe = $state('all');
	let phase = $state('all');
	let order = $state('editorial');
	const universeLabels: Record<string, string> = {
		'amor-relacoes': 'Amor e Relacionamentos',
		'meu-ceu': 'Mapa Astral',
		'proposito-prosperidade': 'Dinheiro e Carreira',
		'tarot-arcanos': 'Tarot'
	};
	const normalized = (value: string) =>
		value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLocaleLowerCase('pt-BR');
	const allProducts = $derived([...data.debut, ...data.next]);
	const availableUniverses = $derived(
		Object.entries(universeLabels).filter(([id]) =>
			allProducts.some((product) => product.universe === id)
		)
	);
	const visibleProducts = $derived.by(() => {
		const query = normalized(search.trim());
		const products = allProducts.filter(
			(product) =>
				(universe === 'all' || product.universe === universe) &&
				(phase === 'all' || product.phase === phase) &&
				(!query ||
					normalized([product.name, product.summary, ...product.receive].join(' ')).includes(query))
		);
		return order === 'az'
			? products.toSorted((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
			: products;
	});
	const filteredDebut = $derived(visibleProducts.filter((product) => product.phase === 'debut'));
	const filteredNext = $derived(visibleProducts.filter((product) => product.phase === 'next'));
	const hasFilters = $derived(Boolean(search.trim()) || universe !== 'all' || phase !== 'all');
	function clearFilters() {
		search = '';
		universe = 'all';
		phase = 'all';
	}
</script>

<svelte:head>
	<title>Lançamentos digitais — {SITE.name}</title>
	<meta
		name="description"
		content="Conheça as novas leituras digitais da ATVNA: casamento, recomeço amoroso, Tarot, intimidade, talento e conversas. Veja o que cada leitura inclui e confira os testes gratuitos na sua conta."
	/>
	<link rel="canonical" href={`${SITE.url}/lancamentos`} />
</svelte:head>

{#snippet productCard(product: PageData['debut'][number])}
	<article class="launch-product-card public-product-card" data-launch-product={product.id}>
		<a
			class="product-cover"
			href={product.href}
			aria-label={`Conhecer ${product.name}`}
			tabindex="-1"><DigitalProductArtwork productId={product.id} /></a
		>
		<div class="product-body">
			<p class="eyebrow product-universe">
				{universeLabels[product.universe] ?? 'Leitura digital'}
			</p>
			<h3><a href={product.href}>{product.name}</a></h3>
			<p class="product-summary">{product.summary}</p>
			<div class="product-access">
				<a
					class="sample-link"
					href={`${product.href}#amostra`}
					aria-label={`Ver uma amostra de ${product.name}`}
					>Ver uma amostra <span aria-hidden="true">↗</span></a
				>
				<a
					class="product-cta"
					href={productTrialHref(product.id)}
					aria-label={`Testar ${product.name} grátis`}
					>Testar grátis <span aria-hidden="true">↗</span></a
				>
			</div>
		</div>
	</article>
{/snippet}

<div class="mvp-public launch-catalog">
	<DigitalStoreNav active="launches" />
	<section class="launch-intro wrap" aria-labelledby="launch-title">
		<nav class="breadcrumb" aria-label="Caminho da página">
			<a href="/">Início</a><span aria-hidden="true">/</span><a href="/leituras"
				>Produtos digitais</a
			><span aria-hidden="true">/</span><span>Lançamentos</span>
		</nav>
		<div class="intro-grid">
			<div class="intro-copy">
				<p class="eyebrow">Novas leituras digitais · Testes gratuitos</p>
				<h1 id="launch-title">Uma situação sua.<br />Uma leitura para ela.</h1>
				<p class="lead">
					Datas, recomeços e conversas. Encontre uma leitura para o que você vive agora.
				</p>
				<div class="intro-actions">
					<a class="primary-link" href="#catalogo"
						>Explorar os lançamentos <span aria-hidden="true">↓</span></a
					>
				</div>
				<p class="intro-note">
					Testes gratuitos na sua conta. Venda das novas leituras em preparação.
				</p>
			</div>
			<div class="launch-showcase">
				<img
					class="intro-engraving"
					src="/brand/mvp/assets/revisao/micro-ramo.webp"
					alt=""
					width="240"
					height="240"
				/>
				<a
					class="showcase-product"
					href={data.debut[0].href}
					aria-label={`Conhecer ${data.debut[0].name}`}
					><DigitalProductArtwork productId={data.debut[0].id} /></a
				>
				<div class="showcase-content">
					<p class="eyebrow">Em destaque</p>
					<h2><a href={data.debut[0].href}>{data.debut[0].name}</a></h2>
					<p class="showcase-detail">Duas ou três datas reais. Uma comparação para escolher.</p>
					<a class="text-link" href={data.debut[0].href}
						>Ver por dentro <span aria-hidden="true">↗</span></a
					>
					<p class="showcase-note">Mockup ilustrativo · leitura digital</p>
				</div>
			</div>
		</div>
	</section>
	<section class="wrap catalog-section" id="catalogo" aria-labelledby="catalog-title">
		<div class="catalog-heading">
			<div>
				<p class="eyebrow">Novas leituras digitais</p>
				<h2 id="catalog-title">Explore os lançamentos</h2>
			</div>
			<p>
				{allProducts.length} leituras · Amostras em cada produto
			</p>
		</div>
		<div class="catalog-layout">
			<aside class="catalog-filters" aria-label="Filtros dos lançamentos">
				<div class="filter-field">
					<label for="launch-search">Buscar lançamentos</label><input
						id="launch-search"
						type="search"
						placeholder="Ex.: conversa, talento…"
						bind:value={search}
					/>
				</div>
				<div class="filter-field">
					<label for="launch-universe">Qual assunto?</label><select
						id="launch-universe"
						bind:value={universe}
						><option value="all">Todos os assuntos</option
						>{#each availableUniverses as [id, label] (id)}<option value={id}>{label}</option
							>{/each}</select
					>
				</div>
				<fieldset class="phase-options" aria-label="Fase dos lançamentos">
					<legend>Explore a coleção</legend><button
						type="button"
						aria-pressed={phase === 'all'}
						onclick={() => (phase = 'all')}>Todos <span>{allProducts.length}</span></button
					><button type="button" aria-pressed={phase === 'debut'} onclick={() => (phase = 'debut')}
						>As três primeiras <span>{data.debut.length}</span></button
					><button type="button" aria-pressed={phase === 'next'} onclick={() => (phase = 'next')}
						>Na sequência <span>{data.next.length}</span></button
					>
				</fieldset>
				{#if hasFilters}<button class="clear-filters" type="button" onclick={clearFilters}
						>Limpar filtros <span aria-hidden="true">×</span></button
					>{/if}
				<div class="format-note">
					<span aria-hidden="true">↗</span>
					<p>
						<strong>Um conteúdo seu, na sua conta.</strong> Confira a proposta, os dados necessários e
						uma amostra em cada página.
					</p>
				</div>
			</aside>
			<div class="catalog-results">
				<div class="results-toolbar">
					<p id="launch-results-count" role="status" aria-live="polite">
						{visibleProducts.length}
						{visibleProducts.length === 1 ? 'leitura encontrada' : 'leituras encontradas'}
					</p>
					<div class="order-field">
						<label for="launch-order">Ordenar por</label><select
							id="launch-order"
							bind:value={order}
							><option value="editorial">Ordem da coleção</option><option value="az"
								>Nome: A a Z</option
							></select
						>
					</div>
				</div>
				{#if visibleProducts.length === 0}
					<div class="empty-results">
						<h3>Vamos tentar outro assunto?</h3>
						<p>
							Nenhuma leitura corresponde a esta busca. Experimente uma palavra mais curta ou veja a
							coleção completa.
						</p>
						<button class="primary-link" type="button" onclick={clearFilters}
							>Ver todos os lançamentos <span aria-hidden="true">↗</span></button
						>
					</div>
				{:else if order === 'az'}
					<div class="launch-grid">
						{#each visibleProducts as product (product.id)}{@render productCard(product)}{/each}
					</div>
				{:else}
					{#if filteredDebut.length > 0}
						<section class="launch-section" id="estreia" aria-labelledby="debut-title">
							<div class="section-heading">
								<div>
									<p class="eyebrow">As três primeiras</p>
									<h3 id="debut-title">Começamos por aqui.</h3>
								</div>
							</div>
							<div class="launch-grid">
								{#each filteredDebut as product (product.id)}{@render productCard(product)}{/each}
							</div>
						</section>
					{/if}
					{#if filteredNext.length > 0}
						<section class="launch-section following" aria-labelledby="next-title">
							<div class="section-heading">
								<div>
									<p class="eyebrow">Na sequência</p>
									<h3 id="next-title">Outros temas da vida real.</h3>
								</div>
							</div>
							<div class="launch-grid">
								{#each filteredNext as product (product.id)}{@render productCard(product)}{/each}
							</div>
						</section>
					{/if}
				{/if}
			</div>
		</div>
	</section>
	<section class="wrap continuity" aria-labelledby="continuity-title">
		<img
			src="/brand/mvp/assets/revisao/micro-ramo.webp"
			alt=""
			width="120"
			height="120"
			loading="lazy"
		/>
		<div>
			<p class="eyebrow">Uma loja, diferentes formas de continuar</p>
			<h2 id="continuity-title">Qual é o seu tema de agora?</h2>
			<p>Explore uma leitura avulsa ou conheça os planos para acompanhar seus ciclos com ATV+.</p>
		</div>
		<div class="continuity-links">
			<a href="/leituras" class="text-link"
				>Ver leituras avulsas <span aria-hidden="true">↗</span></a
			><a href="/atv-mais" class="text-link">Conhecer ATV+ <span aria-hidden="true">↗</span></a>
		</div>
	</section>
</div>

<style>
	.launch-catalog {
		color: #183746;
		background: #f6efdf url('/brand/mvp/assets/papel-fino.webp');
		padding-bottom: 56px;
	}
	.launch-catalog .wrap {
		width: min(1280px, calc(100% - 64px));
		margin-inline: auto;
	}
	.launch-intro {
		padding-block: 8px 32px;
	}
	.breadcrumb {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		font:
			400 11px/1.5 'Onest',
			sans-serif;
		margin-bottom: 8px;
	}
	.breadcrumb a {
		color: inherit;
		text-decoration: none;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
	.intro-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		border: 1px solid #b9b6a7;
	}
	.intro-copy {
		min-width: 0;
		padding: 30px;
		background: #fff8e9 url('/brand/mvp/assets/papel-fino.webp');
	}
	.launch-catalog .eyebrow {
		font:
			600 10px/1.5 'Onest',
			sans-serif;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		margin: 0;
	}
	.intro-copy h1 {
		font:
			400 clamp(38px, 4.3vw, 56px)/1.04 'Newsreader',
			Georgia,
			serif;
		letter-spacing: -0.035em;
		margin: 16px 0;
	}
	.lead {
		max-width: 460px;
		font:
			400 14px/1.65 'Onest',
			sans-serif;
		margin: 0;
	}
	.intro-actions {
		display: flex;
		margin-top: 20px;
	}
	.launch-catalog .primary-link {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		min-height: 44px;
		padding: 10px 16px;
		border: 1px solid #183746;
		background: #183746;
		color: #fff8e9;
		text-decoration: none;
		font:
			500 12px/1.5 'Onest',
			sans-serif;
		cursor: pointer;
	}
	.launch-catalog .text-link {
		min-height: 44px;
		display: inline-flex;
		gap: 16px;
		align-items: center;
		padding-block: 8px;
		color: #183746;
		text-underline-offset: 4px;
		font:
			500 12px/1.5 'Onest',
			sans-serif;
	}
	.intro-note {
		font:
			400 11px/1.6 'Onest',
			sans-serif;
		margin: 14px 0 0;
		color: #526063;
	}
	.launch-showcase {
		min-width: 0;
		position: relative;
		isolation: isolate;
		display: grid;
		grid-template-columns: 1fr 0.85fr;
		align-items: center;
		gap: 20px;
		padding: 22px;
		background: #eed6c8 url('/brand/mvp/assets/papel-fino.webp');
		overflow: hidden;
	}
	.showcase-product {
		display: block;
		min-width: 0;
		text-decoration: none;
		position: relative;
		z-index: 1;
	}
	.showcase-product :global(.digital-artwork) {
		min-height: 270px;
		height: 270px;
		aspect-ratio: auto;
		background: transparent;
		padding: 10px;
		overflow: visible;
	}
	.showcase-product :global(.digital-artwork::before) {
		display: none;
	}
	.showcase-product :global(.folio) {
		height: 245px;
		width: 185px;
		padding: 12px;
	}
	.showcase-product :global(.folio-title) {
		font-size: 23px;
	}
	.showcase-product :global(.art-edition) {
		display: none;
	}
	.intro-engraving {
		position: absolute;
		width: 240px;
		height: 240px;
		object-fit: contain;
		right: -56px;
		bottom: -50px;
		opacity: 0.35;
		pointer-events: none;
		transform: rotate(-25deg);
	}
	.showcase-content {
		position: relative;
		z-index: 1;
		min-width: 0;
	}
	.showcase-content h2 {
		font:
			400 30px/1.08 'Newsreader',
			Georgia,
			serif;
		letter-spacing: -0.02em;
		margin: 12px 0;
	}
	.showcase-content h2 a {
		color: inherit;
		text-decoration: none;
	}
	.showcase-detail {
		font:
			400 12px/1.65 'Onest',
			sans-serif;
		margin: 0;
	}
	.showcase-note {
		font:
			400 9px/1.6 'Onest',
			sans-serif;
		margin: 8px 0 0;
	}
	.catalog-section,
	.launch-section {
		scroll-margin-top: 96px;
	}
	.catalog-heading {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 20px;
	}
	.catalog-heading h2,
	.continuity h2 {
		font:
			400 clamp(32px, 3vw, 40px)/1.12 'Newsreader',
			Georgia,
			serif;
		letter-spacing: -0.025em;
		margin: 8px 0 0;
	}
	.catalog-heading > p {
		font:
			400 12px/1.6 'Onest',
			sans-serif;
		margin: 0;
	}
	.catalog-layout {
		display: grid;
		grid-template-columns: 210px minmax(0, 1fr);
		align-items: start;
		gap: 24px;
	}
	.catalog-filters {
		min-width: 0;
		border: 1px solid #b8beb1;
		padding: 16px;
		background: #ebe8d8 url('/brand/mvp/assets/papel-fino.webp');
	}
	.filter-field {
		display: grid;
		gap: 6px;
		margin-bottom: 16px;
	}
	.filter-field label,
	.phase-options legend,
	.order-field label {
		font:
			500 11px/1.5 'Onest',
			sans-serif;
	}
	.filter-field input,
	.filter-field select,
	.order-field select {
		width: 100%;
		min-width: 0;
		min-height: 44px;
		color: #183746;
		background: #fff8e9;
		border: 1px solid #8c9994;
		border-radius: 0;
		padding: 9px;
		font:
			400 12px/1.5 'Onest',
			sans-serif;
	}
	.filter-field input::placeholder {
		color: #596365;
		opacity: 1;
	}
	.phase-options {
		display: grid;
		gap: 4px;
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	.phase-options legend {
		margin-bottom: 6px;
	}
	.phase-options button {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		width: 100%;
		min-height: 44px;
		border: 1px solid transparent;
		padding: 8px;
		background: transparent;
		color: #183746;
		cursor: pointer;
		text-align: left;
		font:
			400 11px/1.5 'Onest',
			sans-serif;
	}
	.phase-options button[aria-pressed='true'] {
		border-color: #183746;
		background: #183746;
		color: #fff8e9;
	}
	.phase-options button span {
		font-size: 10px;
	}
	.clear-filters {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		min-height: 44px;
		width: 100%;
		background: transparent;
		color: #183746;
		border: 0;
		border-bottom: 1px solid currentColor;
		padding: 8px 0;
		margin-top: 8px;
		cursor: pointer;
		font:
			500 11px/1.5 'Onest',
			sans-serif;
	}
	.format-note {
		display: flex;
		align-items: start;
		gap: 8px;
		border-top: 1px solid #c7bfac;
		padding-top: 16px;
		margin-top: 16px;
	}
	.format-note > span {
		font-size: 18px;
		line-height: 1.4;
	}
	.format-note p {
		font:
			400 10px/1.7 'Onest',
			sans-serif;
		margin: 0;
	}
	.format-note strong {
		display: block;
		font-weight: 500;
		margin-bottom: 4px;
	}
	.catalog-results {
		min-width: 0;
	}
	.results-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		border-block: 1px solid #b8beb1;
		margin-bottom: 20px;
		padding: 8px 0;
	}
	.results-toolbar > p {
		font:
			400 11px/1.5 'Onest',
			sans-serif;
		margin: 0;
	}
	.order-field {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.order-field select {
		width: auto;
	}
	.section-heading {
		margin-bottom: 16px;
	}
	.section-heading h3 {
		font:
			400 28px/1.12 'Newsreader',
			Georgia,
			serif;
		letter-spacing: -0.02em;
		margin: 5px 0 0;
	}
	.launch-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 16px;
	}
	.following {
		padding-top: 32px;
	}
	.launch-product-card {
		min-width: 0;
		height: 100%;
		display: flex;
		flex-direction: column;
		border: 1px solid #b8beb1;
		background: #fff8e9 url('/brand/mvp/assets/papel-fino.webp');
	}
	.product-cover {
		display: block;
		text-decoration: none;
		border-bottom: 1px solid #b8beb1;
		overflow: hidden;
	}
	.product-cover :global(.digital-artwork) {
		min-height: 260px;
		height: 260px;
		aspect-ratio: auto;
		padding: 16px;
	}
	.product-cover :global(.folio) {
		width: 175px;
		height: 225px;
		padding: 10px 12px;
	}
	.product-cover :global(.folio-title) {
		font-size: 20px;
	}
	.product-cover :global(.folio-caption) {
		font-size: 7px;
	}
	.product-cover :global(.folio-imprint) {
		font-size: 6px;
	}
	.product-cover :global(.folio-foot) {
		margin-top: 8px;
		padding-top: 6px;
		font-size: 5px;
	}
	.product-body {
		display: flex;
		flex-direction: column;
		align-items: start;
		flex: 1;
		min-width: 0;
		padding: 16px;
	}
	.launch-catalog .product-universe {
		font-size: 9px;
		letter-spacing: 0.08em;
	}
	.product-body h3 {
		font:
			400 27px/1.08 'Newsreader',
			Georgia,
			serif;
		letter-spacing: -0.02em;
		margin: 8px 0 10px;
		overflow-wrap: anywhere;
	}
	.product-body h3 a {
		color: inherit;
		text-decoration: none;
	}
	.product-body h3 a:hover {
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	.product-summary {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		overflow: hidden;
		font:
			400 12px/1.65 'Onest',
			sans-serif;
		margin: 0 0 12px;
	}
	.product-access {
		width: 100%;
		margin-top: auto;
		border-top: 1px solid #c7bfac;
		padding-top: 4px;
	}
	.sample-link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		min-height: 44px;
		padding-block: 8px;
		font:
			500 12px/1.4 'Onest',
			sans-serif;
		color: #183746;
		text-underline-offset: 4px;
	}
	.product-cta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		width: 100%;
		min-height: 44px;
		border: 1px solid #183746;
		background: #183746;
		color: #fff8e9;
		text-decoration: none;
		padding: 10px 12px;
		font:
			500 12px/1.4 'Onest',
			sans-serif;
	}
	.empty-results {
		padding: 32px 24px;
		border: 1px solid #b8beb1;
		background: #fff8e9 url('/brand/mvp/assets/papel-fino.webp');
	}
	.empty-results h3 {
		font:
			400 32px/1.2 'Newsreader',
			Georgia,
			serif;
		margin: 0 0 12px;
	}
	.empty-results p {
		max-width: 520px;
		font:
			400 13px/1.7 'Onest',
			sans-serif;
		margin: 0 0 20px;
	}
	.continuity {
		display: grid;
		grid-template-columns: 75px minmax(0, 1fr) auto;
		gap: 24px;
		align-items: center;
		margin-top: 48px;
		border-block: 1px solid #b8beb1;
		padding-block: 28px;
	}
	.continuity > img {
		width: 75px;
		height: 95px;
		object-fit: contain;
	}
	.continuity h2 {
		font-size: 32px;
	}
	.continuity p:not(.eyebrow) {
		max-width: 560px;
		font:
			400 12px/1.7 'Onest',
			sans-serif;
		margin: 10px 0 0;
	}
	.continuity-links {
		display: flex;
		flex-direction: column;
		align-items: start;
		gap: 4px;
	}
	.launch-catalog :is(a, button, input, select):focus-visible {
		outline: 2px solid #183746;
		outline-offset: 3px;
	}
	@media (max-width: 1180px) {
		.launch-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.launch-showcase {
			gap: 12px;
			padding: 18px;
		}
		.showcase-product :global(.folio) {
			width: 150px;
			height: 210px;
			padding: 10px;
		}
		.showcase-product :global(.folio-title) {
			font-size: 20px;
		}
		.showcase-product :global(.digital-artwork) {
			height: 230px;
			min-height: 230px;
		}
		.showcase-content h2 {
			font-size: 27px;
		}
	}
	@media (max-width: 900px) {
		.launch-catalog .wrap {
			width: calc(100% - 40px);
		}
		.intro-copy {
			padding: 24px;
		}
		.intro-copy h1 {
			font-size: 39px;
		}
		.launch-showcase {
			grid-template-columns: 1fr;
			gap: 8px;
			padding: 16px;
		}
		.showcase-content h2 {
			font-size: 25px;
			margin-block: 8px;
		}
		.showcase-product :global(.digital-artwork) {
			height: 185px;
			min-height: 185px;
		}
		.showcase-product :global(.folio) {
			width: 125px;
			height: 165px;
			padding: 8px;
		}
		.showcase-product :global(.folio-title) {
			font-size: 15px;
		}
		.showcase-product :global(.folio-caption) {
			font-size: 5px;
			margin-top: 4px;
		}
		.showcase-product :global(.folio-imprint) {
			font-size: 4px;
		}
		.showcase-product :global(.folio-foot) {
			font-size: 4px;
			margin-top: 6px;
			padding-top: 4px;
		}
		.showcase-product :global(.folio-engraving) {
			margin-block: 4px;
		}
		.showcase-content .eyebrow {
			font-size: 9px;
		}
		.showcase-note {
			font-size: 9px;
			margin-top: 0;
		}
		.catalog-layout {
			grid-template-columns: 1fr;
			gap: 16px;
		}
		.catalog-filters {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 12px;
			padding: 14px;
		}
		.filter-field {
			margin: 0;
		}
		.phase-options {
			grid-column: 1 / -1;
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 6px;
		}
		.phase-options legend {
			float: none;
		}
		.phase-options button {
			flex: 1;
			width: auto;
			border-color: #8c9994;
		}
		.format-note {
			display: none;
		}
		.clear-filters {
			margin: 0;
			grid-column: 1 / -1;
		}
		.continuity {
			grid-template-columns: 60px minmax(0, 1fr);
			gap: 18px;
		}
		.continuity > img {
			width: 60px;
		}
		.continuity-links {
			grid-column: 2;
			flex-direction: row;
			flex-wrap: wrap;
			gap: 8px 20px;
		}
	}
	@media (max-width: 620px) {
		.launch-catalog {
			padding-bottom: 36px;
		}
		.launch-catalog .wrap {
			width: calc(100% - 24px);
		}
		.launch-intro {
			padding-block: 0 24px;
		}
		.breadcrumb {
			font-size: 10px;
			margin-bottom: 0;
			gap: 6px;
		}
		.intro-grid {
			grid-template-columns: 1fr;
		}
		.intro-copy {
			padding: 20px;
		}
		.intro-copy h1 {
			font-size: clamp(34px, 9vw, 45px);
			margin-block: 12px;
		}
		.intro-copy .eyebrow {
			font-size: 9px;
			letter-spacing: 0.08em;
		}
		.lead {
			font-size: 13px;
			line-height: 1.6;
		}
		.intro-actions {
			margin-top: 16px;
		}
		.intro-note {
			margin-top: 10px;
			font-size: 10px;
		}
		.launch-showcase {
			grid-template-columns: 0.9fr 1fr;
			gap: 12px;
			padding: 14px;
			border-top: 1px solid #b9b6a7;
		}
		.showcase-content h2 {
			font-size: 23px;
		}
		.showcase-detail {
			font-size: 11px;
		}
		.showcase-product :global(.digital-artwork) {
			min-height: 175px;
			height: 175px;
			padding: 6px;
		}
		.showcase-product :global(.folio) {
			width: 118px;
			height: 155px;
			padding: 8px;
		}
		.showcase-product :global(.folio-title) {
			font-size: 15px;
		}
		.showcase-content .text-link {
			font-size: 11px;
			gap: 10px;
		}
		.showcase-note {
			font-size: 8px;
		}
		.intro-engraving {
			width: 180px;
			height: 180px;
			right: -70px;
			bottom: -40px;
		}
		.catalog-heading {
			display: block;
			margin-bottom: 14px;
		}
		.catalog-heading .eyebrow {
			font-size: 9px;
		}
		.catalog-heading h2 {
			font-size: 32px;
			margin-top: 5px;
		}
		.catalog-heading > p {
			margin-top: 6px;
			font-size: 11px;
		}
		.catalog-filters {
			padding: 12px;
			gap: 10px;
		}
		.filter-field {
			grid-column: 1 / -1;
			gap: 4px;
		}
		.filter-field input,
		.filter-field select,
		.order-field select {
			font-size: 16px;
		}
		.phase-options {
			gap: 4px;
		}
		.phase-options legend {
			font-size: 11px;
			margin-bottom: 4px;
		}
		.phase-options button {
			font-size: 11px;
			padding: 7px;
			gap: 4px;
		}
		.phase-options button span {
			font-size: 9px;
		}
		.results-toolbar {
			gap: 8px;
			margin-bottom: 16px;
			padding-block: 6px;
		}
		.results-toolbar > p {
			font-size: 10px;
		}
		.order-field {
			min-width: 0;
		}
		.order-field label {
			position: absolute;
			width: 1px;
			height: 1px;
			padding: 0;
			margin: -1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			white-space: nowrap;
			border: 0;
		}
		.order-field select {
			max-width: 160px;
			font-size: 12px;
		}
		.section-heading {
			margin-bottom: 12px;
		}
		.section-heading h3 {
			font-size: 26px;
		}
		.section-heading .eyebrow {
			font-size: 9px;
		}
		.launch-grid {
			gap: 12px;
		}
		.product-cover :global(.digital-artwork) {
			height: 220px;
			min-height: 220px;
			padding: 8px;
		}
		.product-cover :global(.folio) {
			width: 150px;
			height: 190px;
			padding: 8px;
		}
		.product-cover :global(.folio-title) {
			font-size: 16px;
		}
		.product-cover :global(.folio-caption) {
			font-size: 5px;
			margin-top: 4px;
		}
		.product-cover :global(.folio-imprint) {
			font-size: 4px;
		}
		.product-cover :global(.folio-foot) {
			font-size: 4px;
			margin-top: 6px;
			padding-top: 4px;
		}
		.product-cover :global(.folio-engraving) {
			margin-block: 4px;
		}
		.product-cover :global(.art-edition) {
			font-size: 5px;
			right: 8px;
			bottom: 7px;
		}
		.product-body {
			padding: 12px;
		}
		.launch-catalog .product-universe {
			font-size: 8px;
			line-height: 1.5;
			min-height: 24px;
		}
		.product-body h3 {
			font-size: 23px;
			margin-block: 6px 8px;
		}
		.product-summary {
			font-size: 12px;
			line-height: 1.6;
			margin-bottom: 10px;
		}
		.sample-link {
			font-size: 11px;
		}
		.product-cta {
			font-size: 12px;
			padding-inline: 9px;
		}
		.following {
			padding-top: 28px;
		}
		.empty-results {
			padding: 24px 18px;
		}
		.continuity {
			grid-template-columns: minmax(0, 1fr) 48px;
			gap: 12px;
			margin-top: 32px;
			padding-block: 24px;
		}
		.continuity > img {
			grid-column: 2;
			grid-row: 1;
			width: 48px;
			height: 75px;
		}
		.continuity > div:first-of-type {
			grid-column: 1;
			grid-row: 1;
		}
		.continuity h2 {
			font-size: 28px;
		}
		.continuity-links {
			grid-column: 1 / -1;
		}
	}
	@media (max-width: 389px) {
		.launch-grid {
			grid-template-columns: 1fr;
		}
		.product-cover :global(.digital-artwork) {
			height: 225px;
			min-height: 225px;
		}
		.product-cover :global(.folio) {
			width: 155px;
			height: 190px;
			padding: 10px;
		}
		.product-cover :global(.folio-title) {
			font-size: 18px;
		}
		.product-cover :global(.folio-caption) {
			font-size: 6px;
		}
		.product-body {
			padding: 16px;
		}
		.launch-catalog .product-universe {
			font-size: 9px;
			min-height: 0;
		}
		.product-body h3 {
			font-size: 27px;
		}
		.product-summary {
			font-size: 13px;
		}
		.sample-link {
			font-size: 12px;
		}
		.showcase-content h2 {
			font-size: 21px;
		}
		.showcase-product :global(.folio) {
			width: 100px;
			height: 145px;
			padding: 7px;
		}
		.showcase-product :global(.folio-title) {
			font-size: 13px;
		}
		.phase-options button {
			font-size: 10px;
			padding-inline: 5px;
		}
	}
</style>
