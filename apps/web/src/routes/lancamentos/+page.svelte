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
			{#if product.subtitle}<p class="product-subtitle">{product.subtitle}</p>{/if}
			<p class="product-summary">{product.summary}</p>
			<div class="product-includes">
				<p>Por dentro da leitura</p>
				<ul>
					{#each product.receive.slice(0, 2) as item (item)}<li>{item}</li>{/each}
				</ul>
			</div>
			<a class="sample-link" href={`${product.href}#amostra`}
				>Ver uma amostra <span aria-hidden="true">↗</span></a
			>
			<div class="product-access">
				<p class="trial-status"><span aria-hidden="true">✦</span> Teste gratuito disponível</p>
				<p class="product-format">Leitura digital na sua conta</p>
				<a
					class="product-cta"
					href={productTrialHref(product.id)}
					aria-label={`Testar ${product.name} grátis`}
					>Testar gratuitamente <span aria-hidden="true">↗</span></a
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
					Uma data para escolher. Um recomeço para pensar. Uma conversa que merece cuidado. Encontre
					a leitura que conversa com o que você vive agora e veja o que ela inclui.
				</p>
				<div class="intro-actions">
					<a class="primary-link" href="#catalogo"
						>Explorar os lançamentos <span aria-hidden="true">↓</span></a
					><a class="text-link" href="#estreia"
						>Conhecer as três primeiras <span aria-hidden="true">↗</span></a
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
				<div class="showcase-caption">
					<span class="eyebrow">Em destaque</span><span>01 / Novas leituras</span>
				</div>
				<a
					class="showcase-product"
					href={data.debut[0].href}
					aria-label={`Conhecer ${data.debut[0].name}`}
					><DigitalProductArtwork productId={data.debut[0].id} /></a
				>
				<div class="showcase-detail">
					<span aria-hidden="true">I · II · III</span>
					<p>Duas ou três datas reais.<br /><strong>Uma comparação para escolher.</strong></p>
				</div>
				<p class="showcase-note">Apresentação ilustrativa · entrega digital</p>
			</div>
		</div>
	</section>
	<section class="wrap catalog-section" id="catalogo" aria-labelledby="catalog-title">
		<div class="catalog-heading">
			<div>
				<p class="eyebrow">A novidade pode ter a ver com você</p>
				<h2 id="catalog-title">Explore os lançamentos</h2>
			</div>
			<p>
				{allProducts.length} propostas para situações da vida real.<br />Veja o conteúdo antes de
				escolher.
			</p>
		</div>
		<div class="catalog-layout">
			<aside class="catalog-filters" aria-label="Filtros dos lançamentos">
				<div class="filter-heading">
					<h3>Encontre sua leitura</h3>
					<span aria-hidden="true">✦</span>
				</div>
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
								<p>
									Uma comparação de datas, uma leitura de um episódio passado e uma previsão de 30
									dias.
								</p>
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
								<p>
									Desejo, convivência, emoções, dinheiro ou estilo. Conheça o conteúdo de cada
									leitura.
								</p>
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
		padding-bottom: 80px;
	}
	.launch-catalog .wrap {
		width: min(1280px, calc(100% - 88px));
		margin-inline: auto;
	}
	.launch-intro {
		padding-top: 20px;
		padding-bottom: 60px;
	}
	.breadcrumb {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		font:
			400 11px/1.7 'Onest',
			sans-serif;
		margin-bottom: 24px;
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
		grid-template-columns: 1.1fr 1fr;
		border: 1px solid #b9b6a7;
	}
	.intro-copy {
		min-width: 0;
		padding: 54px 42px;
		background: #fff8e9 url('/brand/mvp/assets/papel-fino.webp');
		align-self: stretch;
	}
	.launch-catalog .eyebrow {
		font:
			600 10px/1.6 'Onest',
			sans-serif;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		margin: 0;
	}
	.intro-copy h1 {
		font:
			400 clamp(42px, 4.5vw, 66px)/1.04 'Newsreader',
			Georgia,
			serif;
		letter-spacing: -0.035em;
		margin: 22px 0;
	}
	.lead {
		max-width: 520px;
		font:
			400 15px/1.85 'Onest',
			sans-serif;
		margin: 0;
	}
	.intro-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 16px 24px;
		margin-top: 30px;
	}
	.launch-catalog .primary-link {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		min-height: 48px;
		padding: 14px 20px;
		border: 1px solid #183746;
		background: #183746;
		color: #fff8e9;
		text-decoration: none;
		font:
			500 12px/1.6 'Onest',
			sans-serif;
		cursor: pointer;
	}
	.launch-catalog .text-link {
		min-height: 44px;
		display: inline-flex;
		gap: 20px;
		align-items: center;
		padding-block: 10px;
		border-bottom: 1px solid currentColor;
		color: #183746;
		text-decoration: none;
		font:
			500 12px/1.6 'Onest',
			sans-serif;
	}
	.intro-note {
		font:
			400 11px/1.8 'Onest',
			sans-serif;
		max-width: 420px;
		margin: 24px 0 0;
		color: #526063;
	}
	.launch-showcase {
		min-width: 0;
		position: relative;
		isolation: isolate;
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 24px 30px 20px;
		background: #eed6c8 url('/brand/mvp/assets/papel-fino.webp');
		overflow: hidden;
	}
	.showcase-caption {
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 6px 16px;
		z-index: 1;
		font:
			400 9px/1.7 'Onest',
			sans-serif;
	}
	.showcase-product {
		display: block;
		min-width: 0;
		text-decoration: none;
		position: relative;
		z-index: 1;
		margin: 12px 24px 0;
	}
	.showcase-product :global(.digital-artwork) {
		min-height: 325px;
		height: 325px;
		aspect-ratio: auto;
		background: transparent;
		padding: 15px;
		overflow: visible;
	}
	.showcase-product :global(.digital-artwork::before) {
		display: none;
	}
	.showcase-product :global(.folio) {
		height: 295px;
		width: 225px;
	}
	.showcase-product :global(.art-edition) {
		display: none;
	}
	.intro-engraving {
		position: absolute;
		width: 280px;
		height: 280px;
		object-fit: contain;
		right: -58px;
		bottom: 45px;
		opacity: 0.55;
		pointer-events: none;
		transform: rotate(-25deg);
	}
	.showcase-detail {
		position: relative;
		z-index: 1;
		display: flex;
		gap: 18px;
		align-items: center;
		border-block: 1px solid #b6a397;
		margin-top: 16px;
		padding: 15px 0;
	}
	.showcase-detail > span {
		font:
			400 25px/1.2 'Newsreader',
			Georgia,
			serif;
		letter-spacing: 0.04em;
		white-space: nowrap;
		color: #863b45;
	}
	.showcase-detail p {
		font:
			400 11px/1.8 'Onest',
			sans-serif;
		margin: 0;
	}
	.showcase-detail strong {
		font-weight: 500;
	}
	.showcase-note {
		font:
			400 9px/1.7 'Onest',
			sans-serif;
		margin: 12px 0 0;
	}
	.catalog-section {
		scroll-margin-top: 96px;
	}
	.catalog-heading {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 24px;
		margin-bottom: 30px;
	}
	.catalog-heading h2,
	.continuity h2 {
		font:
			400 clamp(34px, 3.5vw, 46px)/1.12 'Newsreader',
			Georgia,
			serif;
		letter-spacing: -0.025em;
		margin: 12px 0 0;
	}
	.catalog-heading > p {
		font:
			400 12px/1.9 'Onest',
			sans-serif;
		margin: 0;
	}
	.catalog-layout {
		display: grid;
		grid-template-columns: 218px minmax(0, 1fr);
		align-items: start;
		gap: 28px;
	}
	.catalog-filters {
		min-width: 0;
		border: 1px solid #b8beb1;
		padding: 18px;
		background: #ebe8d8 url('/brand/mvp/assets/papel-fino.webp');
	}
	.filter-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding-bottom: 20px;
		border-bottom: 1px solid #c7bfac;
		margin-bottom: 24px;
	}
	.filter-heading h3 {
		font:
			400 24px/1.15 'Newsreader',
			Georgia,
			serif;
		margin: 0;
	}
	.filter-heading > span {
		color: #845425;
	}
	.filter-field {
		display: grid;
		gap: 9px;
		margin-bottom: 22px;
	}
	.filter-field label,
	.phase-options legend,
	.order-field label {
		font:
			500 11px/1.7 'Onest',
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
		padding: 10px;
		font:
			400 11px/1.7 'Onest',
			sans-serif;
	}
	.filter-field input::placeholder {
		color: #596365;
		opacity: 1;
	}
	.phase-options {
		display: grid;
		gap: 6px;
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	.phase-options legend {
		margin-bottom: 10px;
	}
	.phase-options button {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		width: 100%;
		min-height: 44px;
		border: 1px solid transparent;
		padding: 10px;
		background: transparent;
		color: #183746;
		cursor: pointer;
		text-align: left;
		font:
			400 11px/1.7 'Onest',
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
		padding: 10px 0;
		margin-top: 12px;
		cursor: pointer;
		font:
			500 11px/1.7 'Onest',
			sans-serif;
	}
	.format-note {
		display: flex;
		align-items: start;
		gap: 9px;
		border-top: 1px solid #c7bfac;
		padding-top: 22px;
		margin-top: 24px;
	}
	.format-note > span {
		font-size: 18px;
		line-height: 1.4;
	}
	.format-note p {
		font:
			400 10px/1.9 'Onest',
			sans-serif;
		margin: 0;
	}
	.format-note strong {
		display: block;
		font-weight: 500;
		margin-bottom: 6px;
	}
	.catalog-results {
		min-width: 0;
	}
	.results-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		border-block: 1px solid #b8beb1;
		margin-bottom: 28px;
		padding: 11px 0;
	}
	.results-toolbar > p {
		font:
			400 11px/1.7 'Onest',
			sans-serif;
		margin: 0;
	}
	.order-field {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.order-field select {
		width: auto;
	}
	.launch-section {
		scroll-margin-top: 96px;
	}
	.section-heading {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 24px;
		margin-bottom: 24px;
	}
	.section-heading h3 {
		font:
			400 32px/1.15 'Newsreader',
			Georgia,
			serif;
		letter-spacing: -0.02em;
		margin: 9px 0 0;
	}
	.section-heading > p {
		max-width: 265px;
		font:
			400 11px/1.85 'Onest',
			sans-serif;
		margin: 0;
	}
	.launch-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 18px;
	}
	.following {
		padding-top: 56px;
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
		min-height: 305px;
		padding-inline: 18px;
	}
	.product-body {
		display: flex;
		flex-direction: column;
		align-items: start;
		flex: 1;
		min-width: 0;
		padding: 22px 19px 18px;
	}
	.launch-catalog .product-universe {
		font-size: 8px;
		letter-spacing: 0.1em;
		min-height: 26px;
	}
	.product-body h3 {
		font:
			400 27px/1.1 'Newsreader',
			Georgia,
			serif;
		letter-spacing: -0.02em;
		margin: 8px 0 14px;
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
	.product-subtitle {
		font:
			500 10px/1.7 'Onest',
			sans-serif;
		margin: -7px 0 12px;
	}
	.product-summary {
		font:
			400 12px/1.85 'Onest',
			sans-serif;
		margin: 0 0 20px;
	}
	.product-includes {
		width: 100%;
		padding-top: 15px;
		border-top: 1px solid #c7bfac;
	}
	.product-includes > p {
		font:
			500 10px/1.7 'Onest',
			sans-serif;
		margin: 0 0 9px;
	}
	.product-includes ul {
		padding-left: 14px;
		margin: 0;
		font:
			400 10px/1.85 'Onest',
			sans-serif;
	}
	.product-includes li {
		padding-left: 2px;
		margin-bottom: 6px;
	}
	.sample-link {
		display: inline-flex;
		align-items: center;
		gap: 14px;
		min-height: 44px;
		margin-top: 8px;
		margin-bottom: 15px;
		padding-block: 10px;
		font:
			500 11px/1.7 'Onest',
			sans-serif;
		color: #183746;
		text-underline-offset: 5px;
	}
	.product-access {
		width: 100%;
		margin-top: auto;
		padding-top: 18px;
		border-top: 1px solid #c7bfac;
	}
	.trial-status {
		font:
			500 9px/1.7 'Onest',
			sans-serif;
		margin: 0 0 6px;
	}
	.trial-status span {
		color: #4d6231;
		padding-right: 3px;
	}
	.product-format {
		font:
			400 9px/1.7 'Onest',
			sans-serif;
		margin: 0 0 16px;
		color: #526063;
	}
	.product-cta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		width: 100%;
		min-height: 46px;
		border: 1px solid #183746;
		background: #183746;
		color: #fff8e9;
		text-decoration: none;
		padding: 11px 12px;
		font:
			500 11px/1.7 'Onest',
			sans-serif;
	}
	.empty-results {
		padding: 48px 28px;
		border: 1px solid #b8beb1;
		background: #fff8e9 url('/brand/mvp/assets/papel-fino.webp');
	}
	.empty-results h3 {
		font:
			400 34px/1.2 'Newsreader',
			Georgia,
			serif;
		margin: 0 0 16px;
	}
	.empty-results p {
		max-width: 520px;
		font:
			400 13px/1.9 'Onest',
			sans-serif;
		margin: 0 0 24px;
	}
	.continuity {
		display: grid;
		grid-template-columns: 95px minmax(0, 1fr) auto;
		gap: 32px;
		align-items: center;
		margin-top: 72px;
		border-block: 1px solid #b8beb1;
		padding-block: 36px;
	}
	.continuity > img {
		width: 95px;
		height: 110px;
		object-fit: contain;
	}
	.continuity h2 {
		font-size: 34px;
	}
	.continuity p:not(.eyebrow) {
		max-width: 560px;
		font:
			400 12px/1.9 'Onest',
			sans-serif;
		margin: 12px 0 0;
	}
	.continuity-links {
		display: flex;
		flex-direction: column;
		align-items: start;
		gap: 12px;
	}
	.launch-catalog :is(a, button, input, select):focus-visible {
		outline: 2px solid #183746;
		outline-offset: 4px;
	}
	@media (max-width: 1180px) {
		.intro-copy {
			padding: 40px 30px;
		}
		.launch-showcase {
			padding-inline: 22px;
		}
		.showcase-product {
			margin-inline: 0;
		}
		.catalog-layout {
			grid-template-columns: 200px minmax(0, 1fr);
			gap: 22px;
		}
		.launch-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.section-heading {
			display: block;
		}
		.section-heading > p {
			max-width: 420px;
			margin-top: 12px;
		}
	}
	@media (max-width: 900px) {
		.launch-catalog .wrap {
			width: calc(100% - 48px);
		}
		.intro-copy {
			padding: 32px 24px;
		}
		.intro-copy h1 {
			font-size: 44px;
		}
		.lead {
			font-size: 13px;
		}
		.launch-showcase {
			padding-inline: 16px;
		}
		.showcase-product :global(.folio) {
			height: 280px;
			width: 215px;
		}
		.showcase-detail {
			gap: 10px;
		}
		.showcase-detail > span {
			font-size: 21px;
		}
		.catalog-layout {
			grid-template-columns: 1fr;
		}
		.catalog-filters {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 20px;
			padding: 20px;
		}
		.filter-heading,
		.filter-field {
			margin: 0;
		}
		.filter-heading {
			grid-column: 1 / -1;
			padding-bottom: 14px;
		}
		.phase-options {
			grid-column: 1 / -1;
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
		}
		.phase-options legend {
			float: left;
			width: 100%;
		}
		.phase-options button {
			width: auto;
			flex: 1;
			gap: 12px;
			border-color: #8c9994;
		}
		.format-note {
			display: none;
		}
		.clear-filters {
			margin: 0;
		}
		.continuity {
			grid-template-columns: 75px minmax(0, 1fr);
			gap: 22px;
		}
		.continuity > img {
			width: 75px;
		}
		.continuity-links {
			grid-column: 2;
			flex-direction: row;
			flex-wrap: wrap;
			gap: 12px 24px;
		}
	}
	@media (max-width: 620px) {
		.launch-catalog {
			padding-bottom: 48px;
		}
		.launch-catalog .wrap {
			width: calc(100% - 32px);
		}
		.launch-intro {
			padding-top: 12px;
			padding-bottom: 36px;
		}
		.breadcrumb {
			gap: 8px;
			margin-bottom: 16px;
			font-size: 10px;
		}
		.intro-grid {
			grid-template-columns: 1fr;
		}
		.intro-copy {
			padding: 30px 23px;
		}
		.intro-copy h1 {
			font-size: clamp(38px, 10.5vw, 54px);
		}
		.lead {
			font-size: 14px;
		}
		.intro-actions {
			align-items: start;
			flex-direction: column;
			gap: 10px;
			margin-top: 24px;
		}
		.launch-showcase {
			padding: 20px 24px 17px;
			border-top: 1px solid #b9b6a7;
		}
		.showcase-product {
			margin-block: 8px 0;
		}
		.showcase-product :global(.digital-artwork) {
			min-height: 300px;
			height: 300px;
		}
		.showcase-product :global(.folio) {
			height: 280px;
			width: 215px;
		}
		.showcase-detail {
			margin-top: 12px;
			gap: 16px;
		}
		.showcase-detail > span {
			font-size: 24px;
		}
		.catalog-heading {
			display: block;
			margin-bottom: 24px;
		}
		.catalog-heading > p {
			margin-top: 14px;
		}
		.catalog-filters {
			grid-template-columns: 1fr;
			gap: 18px;
			padding: 18px;
		}
		.filter-heading,
		.phase-options {
			grid-column: auto;
		}
		.phase-options {
			display: grid;
			gap: 6px;
		}
		.phase-options legend {
			float: none;
		}
		.phase-options button {
			width: 100%;
		}
		.results-toolbar {
			align-items: start;
			flex-direction: column;
			gap: 12px;
			padding-block: 14px;
			margin-bottom: 24px;
		}
		.order-field {
			width: 100%;
			justify-content: space-between;
		}
		.order-field select {
			max-width: 180px;
		}
		.launch-grid {
			grid-template-columns: 1fr;
			gap: 22px;
		}
		.product-cover :global(.digital-artwork) {
			min-height: 330px;
		}
		.product-body {
			padding: 24px;
		}
		.launch-catalog .product-universe {
			min-height: 0;
			font-size: 9px;
		}
		.product-body h3 {
			font-size: 32px;
		}
		.product-summary {
			font-size: 14px;
		}
		.product-includes > p,
		.product-includes ul {
			font-size: 12px;
		}
		.trial-status,
		.product-format {
			font-size: 10px;
		}
		.product-cta {
			font-size: 12px;
		}
		.following {
			padding-top: 40px;
		}
		.empty-results {
			padding: 28px 22px;
		}
		.continuity {
			grid-template-columns: minmax(0, 1fr) 56px;
			gap: 18px 12px;
			margin-top: 48px;
			padding-block: 28px;
		}
		.continuity > img {
			grid-column: 2;
			grid-row: 1;
			width: 56px;
			height: 85px;
		}
		.continuity > div:first-of-type {
			grid-column: 1;
			grid-row: 1;
		}
		.continuity h2 {
			font-size: 30px;
		}
		.continuity-links {
			grid-column: 1 / -1;
			flex-direction: column;
			gap: 10px;
		}
	}
</style>
