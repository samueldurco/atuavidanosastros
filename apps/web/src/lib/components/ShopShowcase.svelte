<script lang="ts">
	import { onMount } from 'svelte';
	import { shopPreviews } from '$lib/data/shop-products';
	import type { ShopCollection } from '$lib/data/shop-collections';
	import ShopCollectionsNav from './ShopCollectionsNav.svelte';
	let {
		showLink = true,
		headingLevel = 'h2',
		collection
	}: {
		showLink?: boolean;
		headingLevel?: 'h1' | 'h2';
		collection?: ShopCollection;
	} = $props();
	let sign = $state('Todos');
	let category = $state('Todas');
	let filtersReady = $state(false);
	onMount(() => {
		filtersReady = true;
	});
	$effect(() => {
		void collection?.slug;
		sign = 'Todos';
		category = 'Todas';
	});
	const source = $derived(collection?.products ?? shopPreviews);
	const signs = $derived(['Todos', ...new Set(source.map((piece) => piece.sign))]);
	const categories = $derived(['Todas', ...new Set(source.map((piece) => piece.category))]);
	const pieces = $derived(
		showLink
			? source.slice(0, 3)
			: source.filter(
					(piece) =>
						(sign === 'Todos' || piece.sign === sign) &&
						(category === 'Todas' || piece.category === category)
				)
	);
</script>

<section class="shop-showcase" aria-labelledby="shop-showcase-title">
	<div class="shop-heading">
		<div>
			<p class="eyebrow">Produtos físicos · aquarelas zodiacais</p>
			<svelte:element this={headingLevel} id="shop-showcase-title"
				>{collection?.name ?? 'Loja dos Signos'}</svelte:element
			>
		</div>
		<p>
			{#if collection?.slug === 'acessorios'}
				Aquarelas para acompanhar seus dias. Explore canecas, ecobags e garrafas, com uma composição
				própria para cada peça.
			{:else if collection?.slug === 'casal'}
				Dois signos em uma aquarela de afeto. Composições integradas para celebrar encontros, com
				uma peça em cada compra.
			{:else if collection}
				Os símbolos de {collection.name} em diferentes aquarelas. Descubra as peças e os detalhes de cada
				estampa.
			{:else}
				Seu signo no que você veste e leva consigo. Conheça a coleção e veja os detalhes de cada
				estampa.
			{/if}
		</p>
	</div>
	{#if !showLink}
		<ShopCollectionsNav current={collection?.slug ?? ''} />
		<div class="shop-toolbar">
			{#if signs.length > 2}
				<label class="mobile-sign-filter" class:compact-filter={signs.length > 14}>
					{collection?.slug === 'casal' ? 'Combinação de signos' : 'Signo'}
					<select bind:value={sign} disabled={!filtersReady}>
						{#each signs as option (option)}
							<option value={option}
								>{option === 'Todos'
									? collection?.slug === 'casal'
										? 'Todas as combinações'
										: 'Todos os signos'
									: option}</option
							>
						{/each}
					</select>
				</label>
				{#if signs.length <= 14}
					<div
						class="sign-filter"
						role="group"
						aria-label={collection?.slug === 'casal'
							? 'Filtrar peças por combinação'
							: 'Filtrar peças por signo'}
					>
						{#each signs as option (option)}
							<button
								type="button"
								disabled={!filtersReady}
								aria-pressed={sign === option}
								onclick={() => (sign = option)}
								>{option === 'Todos'
									? collection?.slug === 'casal'
										? 'Todas as combinações'
										: 'Todos os signos'
									: option}</button
							>
						{/each}
					</div>
				{/if}
			{/if}
			{#if categories.length > 2}
				<label class="category-filter">
					Tipo de peça
					<select bind:value={category} disabled={!filtersReady}>
						{#each categories as option (option)}
							<option value={option}>{option === 'Todas' ? 'Todas as peças' : option}</option>
						{/each}
					</select>
				</label>
			{/if}
			<p aria-live="polite">
				{pieces.length}
				{pieces.length === 1 ? 'peça em preparação' : 'peças em preparação'}
			</p>
		</div>
	{/if}
	<div class="shop-pieces">
		{#each pieces as piece (piece.slug)}
			<article class="shop-card">
				<a
					class="product-image"
					href={`/loja/peca/${piece.slug}`}
					aria-label={`Ver ${piece.title}`}
				>
					<img
						src={piece.colors[0].images[0].src}
						alt={piece.colors[0].images[0].alt}
						width={piece.imageSize ?? 1200}
						height={piece.imageSize ?? 1200}
						loading="lazy"
					/>
					<span class="preview-label">Prévia da coleção</span>
				</a>
				<div class="product-copy">
					<p class="eyebrow">{piece.sign} · {piece.category}</p>
					<svelte:element this={headingLevel === 'h1' ? 'h2' : 'h3'}
						><a href={`/loja/peca/${piece.slug}`}>{piece.title}</a></svelte:element
					>
					<p class="colors">{piece.colors.map((color) => color.name).join(' / ')}</p>
					<div class="card-end">
						<span>Em preparação</span><a href={`/loja/peca/${piece.slug}`}
							>Ver peça <span aria-hidden="true">↗</span></a
						>
					</div>
				</div>
			</article>
		{/each}
	</div>
	<div class="shop-end">
		<p>
			Imagens de apresentação geradas pelo fabricante para esta coleção. A coleção ainda não está à
			venda.
		</p>
		{#if showLink}<a class="button secondary" href="/loja"
				>Conhecer a Loja dos Signos <span aria-hidden="true">↗</span></a
			>{/if}
	</div>
</section>

<style>
	.shop-showcase {
		padding-block: clamp(2rem, 5vw, 4rem);
	}
	.shop-heading {
		display: grid;
		grid-template-columns: 1fr 0.85fr;
		gap: 2rem;
		align-items: end;
		margin-bottom: 2rem;
	}
	.shop-heading :is(h1, h2) {
		font: 500 clamp(2.6rem, 6vw, 5.5rem)/0.98 var(--atv-font-display);
		margin: 0;
		letter-spacing: -0.04em;
	}
	.shop-heading > p {
		max-width: 34rem;
		font: 400 1.2rem/1.6 var(--atv-font-editorial);
		margin: 0;
	}
	.shop-toolbar {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin: 2rem 0;
		padding-block: 1rem;
		border-block: 1px solid var(--atv-border);
	}
	.shop-toolbar > p {
		font-size: 0.85rem;
		margin: 0;
	}
	.category-filter {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.6rem;
		font-size: 0.9rem;
	}
	.category-filter select,
	.mobile-sign-filter select {
		min-height: 44px;
		max-width: 100%;
		padding: 0.6rem 2rem 0.6rem 0.9rem;
		border: 1px solid var(--atv-border);
		border-radius: 0.4rem;
		background: #fff8e9;
		color: var(--atv-text, inherit);
		font: inherit;
	}
	.mobile-sign-filter {
		display: none;
	}
	.mobile-sign-filter.compact-filter {
		display: grid;
		gap: 0.6rem;
		min-width: 0;
		max-width: 100%;
		font-size: 0.9rem;
	}
	.sign-filter {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.sign-filter button {
		min-height: 44px;
		padding: 0.6rem 1rem;
		border: 1px solid var(--atv-border);
		border-radius: 2rem;
		color: var(--atv-text, inherit);
		background: transparent;
		font: inherit;
		cursor: pointer;
	}
	.sign-filter button[aria-pressed='true'] {
		color: #fff8e9;
		background: #183746;
		border-color: #183746;
	}
	.shop-pieces {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: clamp(1rem, 3vw, 3rem);
	}
	.shop-card {
		min-width: 0;
	}
	.product-image {
		position: relative;
		display: block;
		overflow: hidden;
		background: #fff;
		border: 1px solid var(--atv-border);
	}
	.product-image img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 1;
		object-fit: contain;
	}
	.preview-label {
		position: absolute;
		inset: 1rem auto auto 1rem;
		padding: 0.4rem 0.65rem;
		background: #f6efdf;
		color: #183746;
		font-size: 0.75rem;
	}
	.product-copy {
		padding: 1.3rem 0 1.75rem;
	}
	.product-copy .eyebrow {
		margin: 0 0 0.5rem;
	}
	.product-copy :is(h2, h3) {
		font: 500 clamp(1.5rem, 3vw, 2rem)/1.15 var(--atv-font-display);
		margin: 0;
	}
	.product-copy :is(h2, h3) a {
		text-decoration: none;
	}
	.colors {
		font-size: 0.9rem;
		margin: 0.75rem 0;
	}
	.card-end {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem 1rem;
	}
	.card-end > span {
		font-size: 0.85rem;
	}
	.card-end a {
		display: inline-flex;
		min-height: 44px;
		gap: 0.5rem;
		align-items: center;
		font-weight: 600;
	}
	.shop-end {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--atv-border);
	}
	.shop-end p {
		max-width: 36rem;
		font-size: 0.9rem;
	}
	@media (min-width: 651px) and (max-width: 1000px) {
		.shop-pieces {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 650px) {
		.sign-filter {
			display: none;
		}
		.mobile-sign-filter {
			display: grid;
			gap: 0.6rem;
			width: 100%;
			min-width: 0;
			font-size: 0.9rem;
		}
		.shop-heading {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
		.shop-pieces {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
		.shop-end {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.5rem;
		}
	}
</style>
