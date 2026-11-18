<script lang="ts">
	import { onMount } from 'svelte';
	import { shopPreviews } from '$lib/data/shop-products';
	import type { ShopCollection } from '$lib/data/shop-collections';
	import { isShopCommerceEligible } from '$lib/data/shop-commerce';
	import { shopDepartments, type ShopDepartment } from '$lib/data/shop-departments';
	import { signNames } from '$lib/data/site';
	import {
		catalogPageSize,
		catalogPrice,
		filterCatalog,
		formatCatalogPrice,
		type CatalogOrder
	} from '$lib/data/shop-catalog';
	import ShopCollectionsNav from './ShopCollectionsNav.svelte';
	let {
		collection,
		department,
		showSignCollections = false,
		ariesOnly = false,
		commerceEnabled = false
	}: {
		collection?: ShopCollection;
		department?: ShopDepartment;
		showSignCollections?: boolean;
		ariesOnly?: boolean;
		commerceEnabled?: boolean;
	} = $props();
	let query = $state('');
	let sign = $state('');
	let partner = $state('');
	let category = $state('');
	let available = $state(false);
	let order = $state<CatalogOrder>('featured');
	let limit = $state(catalogPageSize);
	let ready = $state(false);
	let filterDialog: HTMLDialogElement;
	let mobileFilterButton: HTMLButtonElement;
	onMount(() => {
		ready = true;
		const desktop = window.matchMedia('(min-width: 761px)');
		const closeOnDesktop = () => {
			if (desktop.matches && filterDialog.open) filterDialog.close();
		};
		desktop.addEventListener('change', closeOnDesktop);
		return () => desktop.removeEventListener('change', closeOnDesktop);
	});
	function reset() {
		query = '';
		sign = '';
		partner = '';
		category = '';
		available = false;
		order = 'featured';
		limit = catalogPageSize;
	}
	$effect(() => {
		void collection?.slug;
		void department?.id;
		reset();
	});
	$effect(() => {
		void query;
		void sign;
		void partner;
		void category;
		void available;
		void order;
		limit = catalogPageSize;
	});
	const title = $derived(collection?.name ?? department?.label ?? 'Loja dos Signos');
	const source = $derived(
		(collection?.products ?? shopPreviews).filter(
			(piece) => !department || department.categories.includes(piece.category)
		)
	);
	const categories = $derived(
		[...new Set(source.map((piece) => piece.category))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
	);
	const canBuy = (slug: string) => commerceEnabled && isShopCommerceEligible(slug, ariesOnly);
	const pieces = $derived(
		filterCatalog(source, { query, sign, partner, category, available }, order, canBuy)
	);
	const activeCount = $derived(
		Number(!!sign) + Number(!!partner) + Number(!!category) + Number(available)
	);
	const hasFilters = $derived(!!query || activeCount > 0);
	const hasPairs = $derived(source.some((piece) => piece.subjectKind === 'canonical_pair'));
</script>

{#snippet filters(id: string)}
	<label for={`${id}-sign`}>{collection?.slug === 'casal' ? 'Seu signo' : 'Signo'}</label>
	<select id={`${id}-sign`} bind:value={sign} onchange={() => (partner = '')} disabled={!ready}>
		<option value="">Todos os signos</option>
		{#each Object.values(signNames) as name (name)}<option value={name}>{name}</option>{/each}
	</select>
	{#if hasPairs && sign}
		<label for={`${id}-partner`}>Signo do par</label>
		<select id={`${id}-partner`} bind:value={partner} disabled={!ready}>
			<option value="">Qualquer combinação</option>
			{#each Object.values(signNames) as name (name)}<option value={name}>{name}</option>{/each}
		</select>
	{/if}
	<label for={`${id}-category`}>Tipo de peça</label>
	<select id={`${id}-category`} bind:value={category} disabled={!ready}>
		<option value="">Todas as peças</option>
		{#each categories as name (name)}<option value={name}>{name}</option>{/each}
	</select>
	{#if commerceEnabled}
		<label class="availability"
			><input type="checkbox" bind:checked={available} disabled={!ready} /> Só com compra online</label
		>
	{/if}
	{#if hasFilters}<button class="clear-filters" type="button" onclick={reset}
			>Limpar filtros e busca</button
		>{/if}
{/snippet}

<section class="shop-catalog" aria-labelledby="shop-showcase-title">
	<div class="catalog-top">
		<div>
			<p class="eyebrow">ATVNA · arte zodiacal</p>
			<h1 id="shop-showcase-title">{title}</h1>
		</div>
		<form
			class="catalog-search"
			role="search"
			aria-label="Buscar na Loja dos Signos"
			onsubmit={(event) => event.preventDefault()}
		>
			<label class="sr-only" for="shop-search">Buscar peça ou signo</label>
			<input
				id="shop-search"
				type="search"
				bind:value={query}
				disabled={!ready}
				placeholder="Busque uma peça, um signo…"
			/>
			<button type="submit" aria-label="Buscar" disabled={!ready}
				><svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.7"
					aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg
				></button
			>
		</form>
	</div>
	<nav class="shop-departments" aria-label="Categorias da Loja dos Signos">
		<a href="/loja" aria-current={!collection && !department ? 'page' : undefined}>Todas as peças</a
		>
		{#each shopDepartments as item (item.id)}<a
				href={item.href}
				aria-current={department?.id === item.id ? 'page' : undefined}>{item.label}</a
			>{/each}
	</nav>
	<div class="catalog-banner">
		<picture
			><source
				media="(max-width: 640px)"
				srcset="/brand/shop/storefront-20261118/celestial-garden-small.webp"
			/><img
				src="/brand/shop/storefront-20261118/celestial-garden.webp"
				alt=""
				width="1800"
				height="600"
				fetchpriority="high"
			/></picture
		>
		<div class="banner-copy">
			<p class="eyebrow">Os astros no seu dia a dia</p>
			<h2>
				{collection?.slug === 'casal'
					? 'Dois signos. Uma história.'
					: 'Seu signo, em forma de arte.'}
			</h2>
			<p>
				{department?.description ??
					(collection?.slug === 'casal'
						? 'Aquarelas de encontros para vestir e presentear.'
						: 'Aquarelas zodiacais para vestir, levar com você e dar de presente.')}
			</p>
			<a href="#vitrine">Explorar as peças <span aria-hidden="true">↓</span></a>
		</div>
	</div>
	<div class="catalog-services">
		<span><b aria-hidden="true">✧</b> Artes com identidade ATVNA</span><a href="/loja/frete"
			>Frete e prazo pelo seu CEP <span aria-hidden="true">↗</span></a
		><a href="/loja/devolucoes">Trocas e devoluções <span aria-hidden="true">↗</span></a>
	</div>
	<ShopCollectionsNav current={collection?.slug} {showSignCollections} compact />
	<div class="catalog-layout" id="vitrine">
		<aside class="catalog-filters" aria-label="Filtrar peças">
			<div class="filter-title">
				<h2>Encontre sua peça</h2>
				<span aria-hidden="true">☷</span>
			</div>
			{@render filters('desktop')}
			<p class="filter-note">Escolha um signo para ver também as composições com outros signos.</p>
		</aside>
		<div class="catalog-results">
			<div class="shop-toolbar">
				<div>
					<p class="eyebrow">A coleção</p>
					<p class="result-count" aria-live="polite" aria-atomic="true">
						<strong>{pieces.length}</strong>
						{pieces.length === 1 ? 'peça' : 'peças'}{commerceEnabled ? '' : ' em preparação'}
					</p>
				</div>
				<button
					class="mobile-filter-button"
					bind:this={mobileFilterButton}
					type="button"
					disabled={!ready}
					onclick={() => filterDialog.showModal()}
					>Filtros{activeCount ? ` (${activeCount})` : ''}
					<span aria-hidden="true">☷</span></button
				>
				<label class="sort-label"
					>Ordenar por<select bind:value={order} disabled={!ready}
						><option value="featured">Destaques</option>{#if commerceEnabled}<option
								value="price-asc">Menor preço</option
							><option value="price-desc">Maior preço</option>{/if}<option value="name"
							>Nome: A a Z</option
						></select
					></label
				>
			</div>
			{#if hasFilters}<div class="active-filters" aria-label="Filtros aplicados">
					{#if query}<button onclick={() => (query = '')}
							>Busca: {query} <span aria-hidden="true">×</span><span class="sr-only">
								Remover busca</span
							></button
						>{/if}{#if sign}<button
							onclick={() => {
								sign = '';
								partner = '';
							}}
							>{sign} <span aria-hidden="true">×</span><span class="sr-only">
								Remover signo</span
							></button
						>{/if}{#if partner}<button onclick={() => (partner = '')}
							>Par: {partner} <span aria-hidden="true">×</span><span class="sr-only">
								Remover signo do par</span
							></button
						>{/if}{#if category}<button onclick={() => (category = '')}
							>{category} <span aria-hidden="true">×</span><span class="sr-only">
								Remover tipo de peça</span
							></button
						>{/if}{#if available}<button onclick={() => (available = false)}
							>Compra online <span aria-hidden="true">×</span><span class="sr-only">
								Remover disponibilidade</span
							></button
						>{/if}
				</div>{/if}
			<div class="shop-pieces">
				{#each pieces.slice(0, limit) as piece, index (piece.slug)}
					{@const price = canBuy(piece.slug) ? catalogPrice(piece.slug) : undefined}
					<article class="shop-card">
						<a
							class="product-image"
							href={`/loja/peca/${piece.slug}`}
							aria-label={`Ver ${piece.title}`}
							><img
								src={piece.colors[0].images[0].src}
								alt={piece.colors[0].images[0].alt}
								width={piece.imageSize ?? 1200}
								height={piece.imageSize ?? 1200}
								loading={index < 3 ? 'eager' : 'lazy'}
								decoding="async"
							/><span class="preview-label" class:online={canBuy(piece.slug)}
								>{canBuy(piece.slug) ? 'Compra online' : 'Em preparação'}</span
							></a
						>
						<div class="product-copy">
							<p class="piece-category">{piece.category} · {piece.sign}</p>
							<h2><a href={`/loja/peca/${piece.slug}`}>{piece.title}</a></h2>
							<p class="piece-colors">{piece.colors.map((color) => color.name).join(' / ')}</p>
							<div class="card-end">
								{#if price !== undefined}<p class="piece-price">
										<span>A partir de</span><strong>{formatCatalogPrice(price)}</strong><small
											>Frete calculado por CEP</small
										>
									</p>{:else}<p class="piece-status">
										{canBuy(piece.slug)
											? 'Consulte a compra na página da peça'
											: 'Uma prévia do que vem por aí'}
									</p>{/if}<a class="piece-link" href={`/loja/peca/${piece.slug}`}
									>Ver peça <span aria-hidden="true">↗</span></a
								>
							</div>
						</div>
					</article>
				{/each}
			</div>
			{#if pieces.length === 0}<div class="catalog-empty">
					<span aria-hidden="true">✧</span>
					<h2>Nenhuma peça por aqui.</h2>
					<p>Tente outro signo, tipo de peça ou termo de busca.</p>
					<button class="button secondary" onclick={reset}>Limpar filtros e busca</button>
				</div>{:else}<div class="catalog-pagination">
					<p>Mostrando {Math.min(limit, pieces.length)} de {pieces.length} peças</p>
					{#if limit < pieces.length}<button
							class="button secondary"
							disabled={!ready}
							onclick={() => (limit += catalogPageSize)}
							>Carregar mais peças <span aria-hidden="true">↓</span></button
						>{/if}
				</div>{/if}
		</div>
	</div>
	<p class="catalog-disclosure">
		{commerceEnabled
			? 'As peças com compra online estão sinalizadas. Confira as opções, o preço final e a disponibilidade na página da peça. Vendemos uma peça por pedido. As demais peças continuam em preparação.'
			: 'Imagens de apresentação da coleção. A coleção ainda não está à venda.'}
	</p>
</section>

<dialog
	class="filter-dialog"
	bind:this={filterDialog}
	aria-labelledby="mobile-filters-title"
	onclose={() => mobileFilterButton?.focus()}
>
	<div class="dialog-heading">
		<h2 id="mobile-filters-title">Filtrar peças</h2>
		<button type="button" aria-label="Fechar filtros" onclick={() => filterDialog.close()}>×</button
		>
	</div>
	<div class="dialog-fields">{@render filters('mobile')}</div>
	<button class="button dialog-apply" onclick={() => filterDialog.close()}
		>Ver {pieces.length} {pieces.length === 1 ? 'peça' : 'peças'}</button
	>
</dialog>

<style>
	.shop-catalog {
		--catalog-line: #c7bfac;
		color: var(--atv-ink);
	}
	.catalog-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1.5rem;
		padding-block: 1.25rem;
	}
	.eyebrow {
		margin: 0 0 0.4rem;
		font-size: 0.68rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-weight: 600;
	}
	h1 {
		margin: 0;
		font: 500 clamp(2rem, 3.8vw, 3rem)/1.1 var(--atv-font-display);
	}
	.catalog-search {
		display: flex;
		width: min(48%, 32rem);
		background: #fff8e9;
		border: 1px solid #9b9587;
		border-radius: 4px;
		overflow: hidden;
	}
	.catalog-search input {
		width: 100%;
		min-width: 0;
		border: 0;
		background: transparent;
		padding: 0.85rem 1rem;
		color: #183746;
		font: inherit;
		font-size: 0.9rem;
	}
	.catalog-search button {
		width: 52px;
		flex-shrink: 0;
		border: 0;
		background: #183746;
		color: #fff8e9;
		cursor: pointer;
	}
	.catalog-search svg {
		width: 23px;
		vertical-align: middle;
	}
	.shop-departments {
		display: flex;
		gap: 1.5rem;
		overflow-x: auto;
		border-block: 1px solid var(--catalog-line);
		margin-bottom: 1.25rem;
	}
	.shop-departments a {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		min-height: 48px;
		font-size: 0.83rem;
		text-decoration: none;
		border-bottom: 3px solid transparent;
		padding-top: 3px;
	}
	.shop-departments a[aria-current] {
		border-bottom-color: #a36632;
		font-weight: 700;
	}
	.catalog-banner {
		position: relative;
		overflow: hidden;
		isolation: isolate;
		background: #102c3d;
		border-radius: 5px;
	}
	.catalog-banner picture {
		position: absolute;
		inset: 0;
		z-index: -2;
	}
	.catalog-banner img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
	}
	.catalog-banner::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background: linear-gradient(90deg, #102c3df5 0%, #102c3de8 25%, #102c3d85 50%, transparent 70%);
	}
	.banner-copy {
		padding: clamp(1.25rem, 2.2vw, 2rem);
		width: min(55%, 37rem);
		color: #fff8e9;
	}
	.banner-copy .eyebrow {
		color: #f0c99c;
	}
	.banner-copy h2 {
		margin: 0.5rem 0 0.6rem;
		font: 500 clamp(1.8rem, 2.6vw, 2.4rem)/1.06 var(--atv-font-display);
		text-wrap: balance;
	}
	.banner-copy > p:not(.eyebrow) {
		max-width: 24rem;
		font-size: 0.88rem;
		line-height: 1.6;
		margin: 0;
	}
	.banner-copy a {
		display: inline-flex;
		align-items: center;
		gap: 1.5rem;
		min-height: 44px;
		margin-top: 0.7rem;
		font-size: 0.83rem;
		color: #fff8e9;
		text-underline-offset: 5px;
	}
	.catalog-services {
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.5rem 1.5rem;
		border-bottom: 1px solid var(--catalog-line);
		padding: 0.7rem 0;
		font-size: 0.75rem;
	}
	.catalog-services span,
	.catalog-services a {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 32px;
	}
	.catalog-services b {
		font-size: 1.3rem;
		color: #8d5428;
	}
	.catalog-services a {
		text-decoration: none;
	}
	.catalog-layout {
		display: grid;
		grid-template-columns: 210px minmax(0, 1fr);
		gap: 1.75rem;
		scroll-margin-top: 1.5rem;
	}
	.catalog-filters {
		align-self: start;
		border-top: 2px solid #183746;
		padding-top: 1rem;
	}
	.filter-title {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}
	.filter-title h2 {
		font: 600 0.9rem var(--atv-font-body, sans-serif);
		margin: 0;
	}
	.catalog-filters label,
	.dialog-fields > label {
		display: block;
		font-size: 0.8rem;
		font-weight: 600;
		margin: 1.2rem 0 0.5rem;
	}
	.catalog-filters select,
	.dialog-fields select,
	.sort-label select {
		min-height: 44px;
		max-width: 100%;
		width: 100%;
		padding: 0.6rem 0.5rem;
		border: 1px solid #aaa18e;
		border-radius: 3px;
		background: #fff8e9;
		color: #183746;
		font: inherit;
		font-size: 0.82rem;
	}
	.catalog-filters .availability,
	.dialog-fields .availability {
		display: flex;
		gap: 0.55rem;
		align-items: center;
		min-height: 44px;
		line-height: 1.5;
	}
	.availability input {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
		accent-color: #183746;
	}
	.clear-filters {
		min-height: 44px;
		border: 0;
		background: none;
		color: #183746;
		text-decoration: underline;
		text-underline-offset: 4px;
		text-align: left;
		cursor: pointer;
		padding: 0;
		font: inherit;
		font-size: 0.78rem;
	}
	.filter-note {
		padding-top: 1rem;
		border-top: 1px solid var(--catalog-line);
		font-size: 0.75rem;
		line-height: 1.7;
		color: #596365;
	}
	.shop-toolbar {
		display: flex;
		align-items: end;
		gap: 1rem;
		justify-content: space-between;
		margin-bottom: 1.1rem;
	}
	.result-count {
		margin: 0;
		font-size: 0.83rem;
	}
	.result-count strong {
		font-size: 1.1rem;
		font-weight: 600;
	}
	.sort-label {
		display: grid;
		gap: 0.35rem;
		font-size: 0.7rem;
	}
	.sort-label select {
		min-width: 155px;
	}
	.mobile-filter-button {
		display: none;
	}
	.active-filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 1rem;
	}
	.active-filters button {
		min-height: 44px;
		border: 1px solid #aaa18e;
		background: #e8e3d3;
		color: #183746;
		border-radius: 3px;
		padding: 0.5rem 0.7rem;
		font: inherit;
		font-size: 0.75rem;
		cursor: pointer;
		overflow-wrap: anywhere;
	}
	.active-filters button > span[aria-hidden] {
		margin-left: 0.65rem;
		font-size: 1rem;
	}
	.shop-pieces {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1.1rem;
	}
	.shop-card {
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border: 1px solid var(--catalog-line);
		border-radius: 4px;
		background: #fffaf0;
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	}
	.shop-card:hover {
		border-color: #a36632;
		box-shadow: 0 6px 20px #1837460d;
	}
	.product-image {
		display: block;
		position: relative;
		background: #f4f0e8;
		aspect-ratio: 1;
		overflow: hidden;
	}
	.product-image img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		transition: transform 0.25s;
	}
	.product-image:hover img {
		transform: scale(1.025);
	}
	.preview-label {
		position: absolute;
		left: 0.6rem;
		bottom: 0.6rem;
		padding: 0.35rem 0.5rem;
		font-size: 0.62rem;
		font-weight: 600;
		background: #fff8e9;
		color: #596365;
		border: 1px solid #c7bfac;
		border-radius: 2px;
	}
	.preview-label.online {
		background: #183746;
		border-color: #183746;
		color: #fff8e9;
	}
	.product-copy {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		border-top: 1px solid #e5ddcd;
	}
	.piece-category {
		margin: 0 0 0.55rem;
		font-size: 0.66rem;
		color: #596365;
		line-height: 1.5;
	}
	.product-copy h2 {
		font: 500 1.35rem/1.15 var(--atv-font-display);
		margin: 0;
	}
	.product-copy h2 a {
		color: #183746;
		text-decoration: none;
	}
	.piece-colors {
		font-size: 0.7rem;
		color: #596365;
		line-height: 1.5;
		margin: 0.6rem 0 1rem;
	}
	.card-end {
		margin-top: auto;
	}
	.piece-price {
		display: grid;
		margin: 0 0 0.8rem;
	}
	.piece-price > span,
	.piece-price small {
		font-size: 0.65rem;
		line-height: 1.5;
		color: #596365;
	}
	.piece-price strong {
		font-size: 1.4rem;
		color: #183746;
		font-weight: 600;
		letter-spacing: -0.035em;
	}
	.piece-status {
		color: #596365;
		font-size: 0.72rem;
		line-height: 1.5;
		margin: 0 0 0.8rem;
	}
	.piece-link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 44px;
		padding: 0.6rem 0.8rem;
		border: 1px solid #183746;
		border-radius: 3px;
		color: #183746;
		text-decoration: none;
		font-size: 0.8rem;
		font-weight: 600;
	}
	.shop-card:has(.online) .piece-link {
		color: #fff8e9;
		background: #183746;
	}
	.catalog-pagination {
		text-align: center;
		padding: 1.8rem 0;
	}
	.catalog-pagination p {
		font-size: 0.78rem;
		color: #596365;
	}
	.catalog-empty {
		text-align: center;
		padding: 3rem 1rem;
		border: 1px solid var(--catalog-line);
	}
	.catalog-empty > span {
		font-size: 2rem;
	}
	.catalog-empty h2 {
		font: 500 2rem var(--atv-font-display);
	}
	.catalog-empty p {
		font-size: 0.85rem;
		line-height: 1.6;
	}
	.catalog-disclosure {
		border-top: 1px solid var(--catalog-line);
		padding: 1.25rem 0;
		font-size: 0.78rem;
		line-height: 1.8;
		color: #596365;
	}
	.filter-dialog {
		width: min(90vw, 420px);
		max-height: 90dvh;
		margin: auto;
		padding: 1.25rem;
		border: 1px solid #c7bfac;
		border-radius: 6px;
		background: #fff8e9;
		color: #183746;
		overscroll-behavior: contain;
	}
	.filter-dialog::backdrop {
		background: #102c3db3;
	}
	.dialog-heading {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: center;
	}
	.dialog-heading h2 {
		margin: 0;
		font: 500 1.8rem var(--atv-font-display);
	}
	.dialog-heading button {
		width: 44px;
		height: 44px;
		flex-shrink: 0;
		border: 1px solid #c7bfac;
		background: transparent;
		color: #183746;
		border-radius: 3px;
		font-size: 1.6rem;
		cursor: pointer;
	}
	.dialog-apply {
		width: 100%;
		margin-top: 1.5rem;
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
	button:focus-visible,
	a:focus-visible,
	select:focus-visible,
	input:focus-visible {
		outline: 3px solid #a36632;
		outline-offset: 3px;
	}
	@media (min-width: 761px) {
		.filter-dialog {
			display: none;
		}
	}
	@media (max-width: 1000px) {
		.catalog-layout {
			grid-template-columns: 175px minmax(0, 1fr);
			gap: 1rem;
		}
		.shop-pieces {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.banner-copy {
			width: 62%;
		}
	}
	@media (max-width: 760px) {
		.catalog-top {
			align-items: stretch;
			flex-direction: column;
			gap: 0.7rem;
			padding-block: 0.8rem;
		}
		.catalog-top .eyebrow {
			display: none;
		}
		.catalog-search {
			width: 100%;
		}
		.shop-departments {
			gap: 1.25rem;
			margin-bottom: 1rem;
		}
		.catalog-layout {
			display: block;
		}
		.catalog-filters {
			display: none;
		}
		.mobile-filter-button {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 0.6rem;
			min-height: 44px;
			padding: 0.6rem 0.7rem;
			color: #183746;
			background: #fff8e9;
			border: 1px solid #aaa18e;
			border-radius: 3px;
			font: inherit;
			font-size: 0.78rem;
		}
		.shop-toolbar {
			flex-wrap: wrap;
			gap: 0.8rem;
			align-items: end;
		}
		.shop-toolbar > div:first-child {
			width: 100%;
		}
		.sort-label {
			margin-left: auto;
			flex-grow: 1;
			max-width: 60%;
		}
		.sort-label select {
			min-width: 0;
		}
		.catalog-banner {
			min-height: 200px;
		}
		.catalog-banner img {
			object-position: 67% center;
		}
		.catalog-banner::after {
			background: linear-gradient(90deg, #102c3df5 0%, #102c3dd9 42%, #102c3d22 100%);
		}
		.banner-copy {
			width: 77%;
			max-width: 25rem;
			padding: 1.1rem;
		}
		.banner-copy h2 {
			font-size: 1.8rem;
		}
		.banner-copy .eyebrow {
			font-size: 0.59rem;
		}
		.banner-copy > p:not(.eyebrow) {
			font-size: 0.77rem;
		}
		.catalog-services {
			gap: 0.1rem 1rem;
			padding-block: 0.6rem;
			font-size: 0.68rem;
		}
		.catalog-services > span {
			display: none;
		}
		.shop-pieces {
			gap: 0.7rem;
		}
		.product-copy {
			padding: 0.75rem;
		}
		.product-copy h2 {
			font-size: 1.2rem;
		}
		.piece-category {
			font-size: 0.6rem;
		}
		.piece-price strong {
			font-size: 1.25rem;
		}
		.piece-link {
			font-size: 0.75rem;
			padding-inline: 0.6rem;
		}
		.preview-label {
			left: 0.4rem;
			bottom: 0.4rem;
			font-size: 0.55rem;
			padding: 0.3rem 0.4rem;
		}
	}
	@media (max-width: 360px) {
		.banner-copy {
			width: 90%;
			padding: 1.2rem;
		}
		.product-copy {
			padding: 0.6rem;
		}
		.product-copy h2 {
			font-size: 1.05rem;
		}
		.piece-colors {
			font-size: 0.64rem;
		}
		.piece-price strong {
			font-size: 1.13rem;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.shop-card,
		.product-image img {
			transition: none;
		}
	}
</style>
