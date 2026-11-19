<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { SvelteURL } from 'svelte/reactivity';
	import { isLaunchProductId } from '@atv/domain';
	import { SITE } from '$lib/data/site';
	import { mvpArt, mvpThemes } from '$lib/data/mvp-visual';
	import CatalogProductCard from '$lib/components/home/CatalogProductCard.svelte';
	import DigitalStoreNav from '$lib/components/DigitalStoreNav.svelte';
	let { data } = $props();
	let filtersOpen = $state(false);
	const filterUrl = $derived(page.shallow?.url ?? page.url);
	const query = $derived(filterUrl.searchParams.get('q') ?? '');
	const selected = $derived(
		data.groups.find((group) => group.slug === filterUrl.searchParams.get('tema'))?.slug ?? ''
	);
	const availability = $derived(
		['teste', 'preparacao'].includes(filterUrl.searchParams.get('acesso') ?? '')
			? filterUrl.searchParams.get('acesso')!
			: ''
	);
	const order = $derived(filterUrl.searchParams.get('ordem') ?? 'catalogo');
	const normalize = (value: string) =>
		value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLocaleLowerCase('pt-BR');
	const allProducts = $derived(
		data.groups.flatMap((group) =>
			group.products.map((product) => ({
				...product,
				theme: group.slug,
				universeTitle: group.title
			}))
		)
	);
	const products = $derived.by(() => {
		const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
		const result = allProducts.filter((product) => {
			const trial = Boolean(data.trialAccess) || isLaunchProductId(product.id);
			const text = normalize(`${product.name} ${product.summary} ${product.universeTitle}`);
			return (
				(!selected || product.theme === selected) &&
				(!availability ||
					(availability === 'teste' ? trial : !trial && product.state !== 'ACTIVE')) &&
				terms.every((term) => text.includes(term))
			);
		});
		if (order === 'az') result.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
		if (order === 'za') result.sort((a, b) => b.name.localeCompare(a.name, 'pt-BR'));
		if (order === 'testes')
			result.sort((a, b) => Number(isLaunchProductId(b.id)) - Number(isLaunchProductId(a.id)));
		return result;
	});
	const hasFilters = $derived(Boolean(query || selected || availability));
	function filterHref(key: string, value: string) {
		const url = new SvelteURL(filterUrl.href);
		if (value) url.searchParams.set(key, value);
		else url.searchParams.delete(key);
		url.hash = 'catalogo';
		return url.pathname + url.search + url.hash;
	}
	function setFilter(key: string, value: string) {
		void goto(filterHref(key, value), { shallow: true, replace: true, reset: false });
	}
</script>

<svelte:head>
	<title>Leituras digitais — {SITE.name}</title>
	<meta
		name="description"
		content="Encontre sua leitura digital de mapa astral, previsões, amor, carreira, Tarot ou sonhos. Explore os temas, veja amostras e conheça os testes gratuitos da ATVNA."
	/>
	<link rel="canonical" href={`${SITE.url}/leituras`} />
</svelte:head>

<div class="mvp-public reading-store">
	<div class="store-wrap">
		<nav class="breadcrumb" aria-label="Caminho da página">
			<a href="/">Início</a><span aria-hidden="true">/</span><span>Produtos digitais</span>
		</nav>
		<DigitalStoreNav active="readings" />
		<section class="store-hero" aria-labelledby="store-title">
			<div class="hero-copy">
				<p class="eyebrow">A tua vida, em novas páginas</p>
				<h1 id="store-title">Escolha sua próxima descoberta.</h1>
				<p class="hero-description">
					Do seu mapa aos seus próximos passos. Encontre uma leitura para o assunto que importa para
					você agora.
				</p>
				<form
					class="catalog-search"
					role="search"
					action="/leituras"
					onsubmit={(event) => {
						event.preventDefault();
						document
							.getElementById('catalogo')
							?.scrollIntoView({ behavior: 'smooth', block: 'start' });
					}}
				>
					<label class="sr-only" for="reading-search">Buscar leituras</label>
					<svg
						viewBox="0 0 24 24"
						width="21"
						height="21"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg
					>
					<input
						id="reading-search"
						name="q"
						type="search"
						placeholder="Busque por leitura ou assunto"
						value={query}
						oninput={(event) => setFilter('q', event.currentTarget.value)}
					/>
					<button type="submit" aria-label="Ver resultados da busca"
						>Buscar <span aria-hidden="true">↗</span></button
					>
				</form>
				<p class="hero-note">{allProducts.length} leituras · 6 temas · Amostras para conhecer</p>
			</div>
			<div class="hero-art" aria-hidden="true">
				<img
					src="/brand/mvp/assets/catalogo/livro-celeste-v1.webp"
					width="480"
					height="320"
					alt=""
					fetchpriority="high"
				/><span>Astrologia, Tarot e sonhos.<br />Um olhar mais perto de você.</span>
			</div>
		</section>
		<nav class="departments" aria-label="Temas das leituras">
			<a href={filterHref('tema', '')} aria-current={!selected ? 'page' : undefined}
				><span class="all-mark" aria-hidden="true">✦</span><span
					>Todos os temas<small>{allProducts.length} leituras</small></span
				></a
			>
			{#each data.groups as group (group.slug)}
				<a
					href={filterHref('tema', group.slug)}
					aria-label={group.title}
					aria-current={selected === group.slug ? 'page' : undefined}
					style:--department-ink={mvpThemes[group.slug as keyof typeof mvpThemes].ink}
				>
					<img
						src={mvpArt(mvpThemes[group.slug as keyof typeof mvpThemes].art)}
						alt=""
						width="42"
						height="42"
						loading="lazy"
					/>
					<span>{group.title}<small>{group.products.length} leituras</small></span>
				</a>
			{/each}
		</nav>
		<section id="catalogo" class="catalog" aria-labelledby="catalog-heading">
			<div class="catalog-toolbar">
				<div>
					<p class="eyebrow">Catálogo de leituras avulsas</p>
					<h2 id="catalog-heading">
						{selected
							? data.groups.find((group) => group.slug === selected)?.title
							: 'Todas as leituras'}
					</h2>
					<p class="result-count" role="status">
						{products.length}
						{products.length === 1 ? 'leitura encontrada' : 'leituras encontradas'}{query
							? ` para “${query}”`
							: ''}
					</p>
				</div>
				<div class="catalog-controls">
					<button
						class="filter-toggle"
						aria-expanded={filtersOpen}
						aria-controls="catalog-filters"
						onclick={() => (filtersOpen = !filtersOpen)}
						>Filtros <span aria-hidden="true">{filtersOpen ? '−' : '+'}</span></button
					><label class="order-label"
						>Ordenar por<select
							aria-label="Ordenar leituras"
							value={order}
							onchange={(event) => setFilter('ordem', event.currentTarget.value)}
							><option value="catalogo">Ordem do catálogo</option><option value="az"
								>Nome: A a Z</option
							><option value="za">Nome: Z a A</option><option value="testes"
								>Testes gratuitos primeiro</option
							></select
						></label
					>
				</div>
			</div>
			<div class="catalog-layout">
				<aside id="catalog-filters" class:open={filtersOpen} aria-label="Filtros das leituras">
					<div class="filter-heading">
						<h3>Encontre sua leitura</h3>
						{#if hasFilters}<a href="/leituras#catalogo">Limpar</a>{/if}
					</div>
					<div class="filter-section">
						<h4>Por assunto</h4>
						<nav aria-label="Filtrar por assunto">
							<a href={filterHref('tema', '')} aria-current={!selected ? 'page' : undefined}
								><span>Todos os temas</span><span>{allProducts.length}</span></a
							>{#each data.groups as group (group.slug)}<a
									href={filterHref('tema', group.slug)}
									aria-current={selected === group.slug ? 'page' : undefined}
									><span>{group.title}</span><span>{group.products.length}</span></a
								>{/each}
						</nav>
					</div>
					<fieldset class="filter-section">
						<legend>Disponibilidade</legend
						>{#each [['', 'Todas as leituras'], ['teste', 'Com teste gratuito'], ['preparacao', 'Em preparação']] as option (option[0])}<label
								class="availability-option"
								><input
									type="radio"
									name="acesso"
									value={option[0]}
									checked={availability === option[0]}
									onchange={() => setFilter('acesso', option[0])}
								/>{option[1]}</label
							>{/each}
					</fieldset>
					<div class="sample-help">
						<span aria-hidden="true">✦</span>
						<h4>Quer ver como é?</h4>
						<p>Cada produto tem uma amostra com dados fictícios para você conhecer o conteúdo.</p>
					</div>
					<button
						class="apply-filters"
						onclick={() => {
							filtersOpen = false;
							document.getElementById('catalog-heading')?.scrollIntoView({ block: 'start' });
						}}>Ver {products.length} leituras</button
					>
				</aside>
				<div class="catalog-results">
					{#if hasFilters}<div class="active-filters" aria-label="Filtros aplicados">
							{#if query}<button onclick={() => setFilter('q', '')}
									>Busca: {query}<span aria-hidden="true">×</span><span class="sr-only"
										>Remover busca</span
									></button
								>{/if}{#if selected}<a href={filterHref('tema', '')}
									>{data.groups.find((group) => group.slug === selected)?.title}<span
										aria-hidden="true">×</span
									><span class="sr-only">Remover tema</span></a
								>{/if}{#if availability}<button onclick={() => setFilter('acesso', '')}
									>{availability === 'teste' ? 'Com teste gratuito' : 'Em preparação'}<span
										aria-hidden="true">×</span
									><span class="sr-only">Remover disponibilidade</span></button
								>{/if}
						</div>{/if}
					{#if products.length}<div class="catalog-grid">
							{#each products as product (product.id)}<CatalogProductCard
									{product}
									universe={product.universeTitle}
									trialAccess={Boolean(data.trialAccess)}
								/>{/each}
						</div>{:else}<div class="empty-results">
							<p class="eyebrow">Vamos tentar de outro jeito?</p>
							<h3>Nenhuma leitura encontrada.</h3>
							<p>
								Busque por um assunto mais amplo, como amor, carreira ou sonhos, ou remova os
								filtros.
							</p>
							<a class="store-button" href="/leituras#catalogo"
								>Ver todas as leituras <span aria-hidden="true">↗</span></a
							>
						</div>{/if}
				</div>
			</div>
		</section>
		<section class="subscription-banner" aria-labelledby="subscription-title">
			<img src={mvpArt('fases-lunares')} width="190" height="110" alt="" loading="lazy" />
			<div>
				<p class="eyebrow">Para acompanhar seus ciclos</p>
				<h2 id="subscription-title">Sua próxima leitura pode ser um hábito.</h2>
				<p>Conheça os planos do ATV+ e o que cada assinatura reúne.</p>
			</div>
			<a class="store-button" href="/atv-mais">Conhecer o ATV+ <span aria-hidden="true">↗</span></a>
		</section>
	</div>
</div>

<style>
	.reading-store {
		background: #f6efdf url('/brand/mvp/assets/papel-fino.webp');
		color: #183746;
		padding: 24px 0 72px;
	}
	.store-wrap {
		width: min(1320px, calc(100% - 64px));
		margin-inline: auto;
	}
	.breadcrumb {
		display: flex;
		gap: 10px;
		font:
			400 11px/1.5 'Onest',
			Arial,
			sans-serif;
		margin-bottom: 20px;
	}
	.breadcrumb a {
		color: inherit;
		text-decoration: none;
	}
	.eyebrow {
		margin: 0;
		font:
			600 9px/1.5 'Onest',
			Arial,
			sans-serif;
		text-transform: uppercase;
		letter-spacing: 0.15em;
	}
	.store-hero {
		position: relative;
		display: grid;
		grid-template-columns: 1.5fr 1fr;
		align-items: center;
		gap: 30px;
		padding: 26px 40px;
		background: #e5e9dc;
		border: 1px solid #a8b4a3;
		overflow: hidden;
	}
	.store-hero::before {
		content: '';
		position: absolute;
		inset: 0;
		background: url('/brand/mvp/assets/papel-fino.webp') center/cover;
		mix-blend-mode: multiply;
		opacity: 0.35;
		pointer-events: none;
	}
	.hero-copy,
	.hero-art {
		position: relative;
	}
	h1 {
		font:
			400 clamp(38px, 4vw, 56px)/1.02 'Newsreader',
			Georgia,
			serif;
		letter-spacing: -0.035em;
		max-width: 560px;
		margin: 12px 0 15px;
	}
	.hero-description {
		font:
			400 13px/1.75 'Onest',
			Arial,
			sans-serif;
		max-width: 500px;
		margin: 0 0 22px;
	}
	.catalog-search {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		border: 1px solid #183746;
		background: #fffaf0;
		padding-left: 15px;
	}
	.catalog-search svg {
		flex-shrink: 0;
	}
	.catalog-search input {
		min-width: 0;
		flex: 1;
		height: 50px;
		background: transparent;
		border: 0;
		border-radius: 0;
		color: #183746;
		font:
			400 12px 'Onest',
			Arial,
			sans-serif;
		padding: 0;
	}
	.catalog-search input::placeholder {
		color: #596365;
		opacity: 1;
	}
	.catalog-search:focus-within {
		outline: 2px solid #a36632;
		outline-offset: 3px;
	}
	.catalog-search button {
		align-self: stretch;
		padding: 0 18px;
		border: 0;
		border-left: 1px solid #183746;
		color: #fff8e9;
		background: #183746;
		font:
			500 11px 'Onest',
			Arial,
			sans-serif;
		cursor: pointer;
	}
	.catalog-search button span {
		margin-left: 9px;
	}
	.hero-note {
		font:
			400 9px/1.5 'Onest',
			Arial,
			sans-serif;
		margin: 10px 0 0;
	}
	.hero-art {
		text-align: center;
	}
	.hero-art img {
		width: min(100%, 350px);
		height: auto;
		margin: auto;
		display: block;
	}
	.hero-art span {
		display: block;
		font:
			italic 400 16px/1.2 'Newsreader',
			Georgia,
			serif;
		margin-top: 4px;
	}
	.departments {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		margin: 20px 0 32px;
		border: 1px solid #c7bfac;
		background: #fff8e966;
	}
	.departments a {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 16px 10px;
		color: var(--department-ink, #183746);
		text-decoration: none;
		border-right: 1px solid #c7bfac;
		border-bottom: 3px solid transparent;
		font:
			500 11px/1.45 'Onest',
			Arial,
			sans-serif;
		min-width: 0;
	}
	.departments a:last-child {
		border-right: 0;
	}
	.departments a[aria-current='page'],
	.departments a:hover {
		background: #d5d9c64d;
	}
	.departments a[aria-current='page'] {
		border-bottom-color: currentColor;
	}
	.departments img {
		object-fit: contain;
		flex-shrink: 0;
		width: 38px;
		height: 42px;
		mix-blend-mode: multiply;
	}
	.departments small {
		display: block;
		color: #596365;
		font-size: 9px;
		margin-top: 4px;
		font-weight: 400;
	}
	.all-mark {
		font:
			400 32px 'Newsreader',
			Georgia,
			serif;
		width: 38px;
		text-align: center;
		flex-shrink: 0;
	}
	.catalog {
		scroll-margin-top: 105px;
	}
	.catalog-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 20px;
		padding-bottom: 24px;
	}
	h2 {
		font:
			400 36px/1.1 'Newsreader',
			Georgia,
			serif;
		letter-spacing: -0.025em;
		margin: 8px 0;
	}
	.result-count {
		font:
			400 11px/1.5 'Onest',
			Arial,
			sans-serif;
		color: #596365;
		margin: 0;
		overflow-wrap: anywhere;
	}
	.catalog-controls {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.order-label {
		font:
			400 10px/1.5 'Onest',
			Arial,
			sans-serif;
		color: #596365;
	}
	select {
		display: block;
		margin-top: 5px;
		border: 1px solid #9caa9e;
		border-radius: 0;
		padding: 0 32px 0 12px;
		min-height: 44px;
		color: #183746;
		background: #fff8e9;
		font:
			400 11px 'Onest',
			Arial,
			sans-serif;
		max-width: 100%;
	}
	.catalog-layout {
		display: grid;
		grid-template-columns: 210px minmax(0, 1fr);
		gap: 28px;
		align-items: start;
	}
	aside {
		border-top: 2px solid #183746;
		padding-top: 18px;
	}
	.filter-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.filter-heading h3 {
		font:
			500 18px/1.2 'Newsreader',
			Georgia,
			serif;
		margin: 0;
	}
	.filter-heading > a {
		font:
			400 10px 'Onest',
			Arial,
			sans-serif;
		color: inherit;
		padding: 10px 0;
	}
	.filter-section {
		margin: 24px 0 0;
		padding: 0 0 20px;
		border: 0;
		border-bottom: 1px solid #c7bfac;
		min-width: 0;
	}
	.filter-section h4,
	.filter-section legend {
		font:
			600 10px/1.5 'Onest',
			Arial,
			sans-serif;
		margin: 0 0 12px;
		padding: 0;
	}
	.filter-section nav {
		display: flex;
		flex-direction: column;
	}
	.filter-section nav a {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 10px 8px;
		min-height: 44px;
		font:
			400 11px/1.5 'Onest',
			Arial,
			sans-serif;
		color: inherit;
		text-decoration: none;
	}
	.filter-section nav a span:last-child {
		color: #596365;
		font-size: 10px;
	}
	.filter-section nav a[aria-current='page'] {
		background: #d5d9c680;
		font-weight: 600;
		border-left: 2px solid #183746;
	}
	.availability-option {
		display: flex;
		align-items: center;
		gap: 9px;
		min-height: 44px;
		font:
			400 11px/1.5 'Onest',
			Arial,
			sans-serif;
		cursor: pointer;
	}
	.availability-option input {
		accent-color: #183746;
		width: 16px;
		height: 16px;
		margin: 0;
	}
	.sample-help {
		margin-top: 24px;
		padding: 20px 16px;
		background: #e5e9dc;
		border: 1px solid #b8beb1;
	}
	.sample-help > span {
		font-size: 24px;
	}
	.sample-help h4 {
		font:
			500 22px/1.1 'Newsreader',
			Georgia,
			serif;
		margin: 12px 0;
	}
	.sample-help p {
		font:
			400 11px/1.7 'Onest',
			Arial,
			sans-serif;
		margin: 0;
	}
	.catalog-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 20px;
	}
	.catalog-results {
		min-width: 0;
	}
	.active-filters {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		margin: 0 0 18px;
	}
	.active-filters a,
	.active-filters button {
		display: flex;
		align-items: center;
		gap: 12px;
		border: 1px solid #9caa9e;
		background: #fff8e9;
		color: #183746;
		text-decoration: none;
		padding: 8px 12px;
		min-height: 44px;
		font:
			400 10px/1.4 'Onest',
			Arial,
			sans-serif;
		cursor: pointer;
		max-width: 100%;
		overflow-wrap: anywhere;
	}
	.active-filters span[aria-hidden] {
		margin-left: auto;
		font-size: 17px;
	}
	.empty-results {
		border: 1px solid #c7bfac;
		text-align: center;
		padding: 70px 28px;
	}
	.empty-results h3 {
		font:
			400 36px/1.15 'Newsreader',
			Georgia,
			serif;
		margin: 16px 0;
	}
	.empty-results > p:not(.eyebrow) {
		font:
			400 13px/1.7 'Onest',
			Arial,
			sans-serif;
		max-width: 430px;
		margin: 0 auto 24px;
	}
	.store-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 24px;
		background: #183746;
		color: #fff8e9;
		border: 1px solid #183746;
		padding: 14px 20px;
		min-height: 46px;
		text-decoration: none;
		font:
			500 11px/1.5 'Onest',
			Arial,
			sans-serif;
	}
	.subscription-banner {
		display: grid;
		grid-template-columns: 155px 1fr auto;
		align-items: center;
		gap: 28px;
		border: 1px solid #9e8c65;
		background:
			linear-gradient(#102c3de8, #183746ed),
			url('/brand/mvp/assets/papel-fino.webp') center / 520px;
		color: #fff8e9;
		padding: 28px 36px;
		margin-top: 48px;
	}
	.subscription-banner img {
		width: 100%;
		height: 100px;
		object-fit: contain;
		background: #f6efdf url('/brand/mvp/assets/papel-fino.webp') center / 240px;
		padding: 8px;
		border: 1px solid #c9b682;
	}
	.subscription-banner .eyebrow {
		color: #f0d08e;
	}
	.subscription-banner .store-button {
		background: #f6efdf;
		color: #183746;
		border-color: #f0d08e;
	}
	.subscription-banner h2 {
		font-size: 30px;
		max-width: 600px;
	}
	.subscription-banner p:not(.eyebrow) {
		font:
			400 12px/1.6 'Onest',
			Arial,
			sans-serif;
		margin: 8px 0 0;
	}
	.filter-toggle,
	.apply-filters {
		display: none;
	}
	.sr-only {
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
	:where(a, button, input, select):focus-visible {
		outline: 2px solid #a36632;
		outline-offset: 3px;
	}
	@media (min-width: 1600px) {
		.store-wrap {
			width: min(1380px, calc(100% - 80px));
		}
	}
	@media (max-width: 1150px) {
		.departments {
			grid-template-columns: repeat(7, 155px);
			overflow-x: auto;
		}
		.catalog-layout {
			grid-template-columns: 180px minmax(0, 1fr);
			gap: 20px;
		}
		.catalog-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.store-hero {
			padding: 26px;
		}
	}
	@media (max-width: 800px) {
		.store-wrap {
			width: calc(100% - 36px);
		}
		.store-hero {
			grid-template-columns: 1fr 190px;
			gap: 10px;
			padding: 24px;
		}
		h1 {
			font-size: 40px;
		}
		.hero-description {
			font-size: 12px;
		}
		.hero-art span {
			font-size: 14px;
		}
		.catalog-layout {
			grid-template-columns: minmax(0, 1fr);
		}
		aside {
			display: none;
		}
		aside.open {
			display: block;
			border: 1px solid #9caa9e;
			padding: 20px;
			background: #fff8e9;
		}
		.filter-toggle,
		.apply-filters {
			display: inline-flex;
			align-items: center;
			justify-content: space-between;
			gap: 20px;
			border: 1px solid #9caa9e;
			min-height: 44px;
			padding: 10px 14px;
			color: #183746;
			background: #fff8e9;
			font:
				500 11px 'Onest',
				Arial,
				sans-serif;
			cursor: pointer;
		}
		.apply-filters {
			display: flex;
			width: 100%;
			justify-content: center;
			margin-top: 20px;
			background: #183746;
			color: #fff8e9;
		}
		.sample-help {
			display: none;
		}
		.subscription-banner {
			grid-template-columns: 90px 1fr;
			gap: 20px;
			padding: 25px;
		}
		.subscription-banner .store-button {
			grid-column: 2;
			justify-self: start;
		}
	}
	@media (max-width: 600px) {
		.reading-store {
			padding-top: 18px;
		}
		.store-wrap {
			width: calc(100% - 28px);
		}
		.breadcrumb {
			font-size: 10px;
			margin-bottom: 16px;
		}
		.store-hero {
			display: block;
			padding: 20px;
		}
		.hero-copy {
			z-index: 1;
		}
		h1 {
			font-size: 36px;
			max-width: 340px;
			margin-top: 12px;
		}
		.hero-description {
			max-width: 100%;
			font-size: 12px;
			margin-bottom: 14px;
		}
		.hero-art {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 10px;
			margin-top: 14px;
			padding-top: 10px;
			border-top: 1px solid #9caa9e77;
		}
		.hero-art img {
			width: 95px;
			margin: 0;
		}
		.hero-art span {
			font-size: 15px;
			text-align: left;
		}
		.catalog-search {
			padding-left: 10px;
			gap: 8px;
		}
		.catalog-search input {
			height: 48px;
			font-size: 11px;
		}
		.catalog-search button {
			padding: 0 12px;
		}
		.catalog-search button span {
			display: none;
		}
		.hero-note {
			font-size: 8px;
		}
		.departments {
			margin: 16px 0 24px;
			grid-template-columns: repeat(7, 145px);
		}
		.departments a {
			padding: 12px 8px;
		}
		.departments img {
			width: 33px;
			height: 38px;
		}
		.catalog-toolbar {
			display: block;
			padding-bottom: 20px;
		}
		h2 {
			font-size: 32px;
		}
		.catalog-controls {
			margin-top: 18px;
			align-items: end;
			justify-content: space-between;
		}
		.order-label {
			flex: 1;
			max-width: 215px;
		}
		select {
			width: 100%;
		}
		.filter-toggle {
			min-width: 105px;
		}
		.catalog-grid {
			grid-template-columns: minmax(0, 1fr);
			gap: 22px;
		}
		.subscription-banner {
			grid-template-columns: 1fr;
			padding: 25px;
			margin-top: 32px;
			gap: 15px;
		}
		.subscription-banner img {
			width: 110px;
			height: 65px;
		}
		.subscription-banner .store-button {
			grid-column: auto;
		}
		.subscription-banner h2 {
			font-size: 30px;
		}
	}
</style>
