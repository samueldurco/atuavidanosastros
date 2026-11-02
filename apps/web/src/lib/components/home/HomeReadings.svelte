<script lang="ts">
	import { customerOffers } from '$lib/data/product-copy';
	import { universes } from '$lib/data/site';
	import { homeProductArt } from '$lib/home-art';
	import { selectHomeHighlights, type HomeHighlight } from '$lib/home-highlights';
	import ProductCover from './ProductCover.svelte';
	import { productCovers } from './product-covers';
	let { highlights = [] }: { highlights?: readonly HomeHighlight[] } = $props();
	const status = (state: string) =>
		state === 'ACTIVE'
			? 'Disponível'
			: state === 'PAUSED'
				? 'Indisponível no momento'
				: 'Em preparação';
	const latest = $derived(
		selectHomeHighlights(
			highlights.filter((item) =>
				customerOffers.some(
					(product) =>
						product.id === item.id &&
						product.state === 'ACTIVE' &&
						product.href === item.href &&
						productCovers[product.id]
				)
			)
		)
	);
	const featured = $derived(
		[
			...latest.map((item) => customerOffers.find((product) => product.id === item.id)!),
			...['birth-chart', 'tarot-situation-challenge-advice', 'dream-reading'].map((id) =>
				customerOffers.find((product) => product.id === id)!
			)
		]
			.filter(
				(product, index, all) =>
					product && all.findIndex((item) => item?.id === product.id) === index
			)
			.slice(0, 3)
	);
</script>

<div class="reading-selection">
	{#each featured as product (product.id)}
		<article class="reading-feature">
			<a class="reading-cover" href={product.href} tabindex="-1" aria-hidden="true">
				{#if homeProductArt[product.id]}
					<img src={homeProductArt[product.id]} alt="" width="720" height="480" loading="lazy" />
				{:else}
					<ProductCover productId={product.id} />
				{/if}
				<span class="reading-format">Leitura digital avulsa</span>
			</a>
			<div class="reading-copy">
				<div class="reading-meta">
					<p class="eyebrow">
						{universes.find((item) => item.productUniverse === product.universe)?.title}
					</p>
					<span class="reading-status" class:available={product.state === 'ACTIVE'}>
						{status(product.state)}
					</span>
				</div>
				<h3><a href={product.href}>{product.name}</a></h3>
				<p class="reading-description">{product.summary}</p>
				<a
					class="reading-action"
					href={product.href}
					data-atv-event="product_click"
					data-atv-product={product.id}
					data-atv-context="avulsos"
					data-atv-cta="offer">Ver produto digital <span aria-hidden="true">↗</span></a
				>
			</div>
		</article>
	{/each}
</div>
<div class="readings-end">
	<span>Astrologia, relações, carreira, tarot e sonhos.</span><a
		class="home-text-link"
		href="/leituras#catalogo">Ver todas as leituras <span aria-hidden="true">↗</span></a
	>
</div>

<style>
	.reading-selection {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1.5rem;
	}
	.reading-feature {
		display: flex;
		flex-direction: column;
		min-width: 0;
		background: #fffaf0;
		border: 1px solid #1837462b;
	}
	.reading-cover {
		display: block;
		position: relative;
		aspect-ratio: 3 / 2;
		overflow: hidden;
		background: #e4e2d5;
		border-bottom: 1px solid #18374620;
	}
	.reading-cover > img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 300ms ease;
	}
	.reading-feature:hover .reading-cover > img {
		transform: scale(1.025);
	}
	.reading-cover :global(.product-cover) {
		height: 100%;
		min-height: 0;
	}
	.reading-format {
		position: absolute;
		left: 1rem;
		bottom: 1rem;
		padding: 0.45rem 0.65rem;
		background: #fff8e9f5;
		color: #183746;
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.reading-copy {
		display: flex;
		flex: 1;
		flex-direction: column;
		padding: 1.4rem;
	}
	.reading-meta {
		display: flex;
		align-items: start;
		flex-wrap: wrap;
		gap: 0.5rem 0.75rem;
	}
	.reading-meta .eyebrow {
		flex: 1 0 auto;
		font-size: 0.62rem;
		line-height: 1.5;
		margin: 0;
	}
	.reading-status {
		font-size: 0.66rem;
		line-height: 1.5;
		color: #596365;
	}
	.reading-status.available {
		color: #3b5b35;
	}
	h3 {
		font: 500 clamp(1.65rem, 2.3vw, 2rem) / 1.08 var(--atv-font-display);
		margin: 0.8rem 0 0.85rem;
	}
	h3 a {
		color: inherit;
		text-decoration: none;
	}
	h3 a:hover {
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}
	.reading-description {
		font-size: 0.88rem;
		line-height: 1.65;
		margin: 0 0 1.5rem;
	}
	.reading-action {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 46px;
		margin-top: auto;
		padding: 0.8rem 1rem;
		border: 1px solid #183746;
		background: #183746;
		color: #fff8e9;
		font-size: 0.78rem;
		font-weight: 500;
		text-decoration: none;
		transition: background 180ms ease;
	}
	.reading-action:hover {
		background: #285064;
	}
	.reading-action span {
		font-size: 1.15rem;
	}
	.readings-end {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 2rem;
		border-top: 1px solid #18374630;
		padding-top: 1.25rem;
		font-size: 0.85rem;
	}
	@media (max-width: 1000px) and (min-width: 761px) {
		.reading-selection {
			gap: 1rem;
		}
		.reading-copy {
			padding: 1rem;
		}
		.reading-format {
			left: 0.75rem;
			bottom: 0.75rem;
			font-size: 0.58rem;
		}
	}
	@media (max-width: 760px) {
		.reading-selection {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
		h3 {
			font-size: 2rem;
		}
		.readings-end {
			align-items: start;
			flex-direction: column;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.reading-cover > img,
		.reading-action {
			transition: none;
		}
	}
</style>
