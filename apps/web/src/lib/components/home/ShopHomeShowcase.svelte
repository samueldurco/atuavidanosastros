<script lang="ts">
	import { shopPreviews } from '$lib/data/shop-products';
	import { selectHomeHighlights, type HomeHighlight } from '$lib/home-highlights';
	import HomeCarousel from './HomeCarousel.svelte';
	import './showcase.css';
	let {
		toolActive = false,
		highlights = []
	}: { toolActive?: boolean; highlights?: readonly HomeHighlight[] } = $props();
	const curated = [
		{
			slug: 'cropped-aries',
			image: 'cropped-aries-bone-modelo.webp',
			title: 'Aries em movimento.',
			copy: 'A arte de Áries ganha o cotidiano no Cropped Aries.'
		},
		{
			slug: 'camiseta-oversized-taurus',
			image: 'oversized-taurus-bone-modelo.webp',
			title: 'O tempo de Taurus.',
			copy: 'A presença de Touro na Camiseta Oversized Taurus.'
		},
		{
			slug: 'ecobag-aries',
			image: 'ecobag-aries-natural-produto.webp',
			title: 'Para levar seu signo.',
			copy: 'Ecobag Aries: a arte da coleção em uma peça para acompanhar seus caminhos.'
		}
	].flatMap((entry) => {
		const product = shopPreviews.find((item) => item.slug === entry.slug);
		const image = product?.colors
			.flatMap((color) => color.images)
			.find((image) => image.src.endsWith(entry.image));
		return product && image
			? [{ ...entry, product, image, href: `/loja/peca/${product.slug}` }]
			: [];
	});
	const latest = $derived(
		selectHomeHighlights(
			highlights.filter((highlight) =>
				shopPreviews.some(
					(product) =>
						product.slug === highlight.id &&
						highlight.href === `/loja/peca/${product.slug}` &&
						product.colors.some((color) =>
							color.images.some((image) => image.src === highlight.image)
						)
				)
			)
		)
	);
	const entries = $derived(
		[
			...latest.map((highlight) => {
				const known = curated.find((entry) => entry.slug === highlight.id);
				const product = shopPreviews.find((item) => item.slug === highlight.id)!;
				const image = product.colors
					.flatMap((color) => color.images)
					.find((item) => item.src === highlight.image)!;
				return {
					slug: product.slug,
					product,
					image,
					href: highlight.href,
					title: known?.title ?? product.title,
					copy: known?.copy ?? product.description
				};
			}),
			...curated
		]
			.filter((entry, index, all) => all.findIndex((other) => other.slug === entry.slug) === index)
			.slice(0, 3)
	);
</script>

{#if entries.length}<div class="atv-home-showcase">
		<HomeCarousel
			label="Coleção Loja dos Signos"
			count={entries.length}
			className="shop-showcase"
			{toolActive}
			shop
		>
			{#snippet slide(index)}{@const entry = entries[index]}
				<div class="shop-feature-copy">
					<p class="eyebrow">Coleção ATVNA · Em destaque</p>
					<h3>{entry.title}</h3>
					<p>{entry.copy}</p>
					<p class="shop-real-name">{entry.product.title}</p>
					<a class="button outline" href={entry.href}
						>Conhecer a peça <span aria-hidden="true">↗</span></a
					><span class="shop-approved">Arte zodiacal para fazer parte do cotidiano.</span>
				</div>
				<a
					class="shop-feature-image"
					href={entry.href}
					aria-label={`Conhecer ${entry.product.title}`}
					><img
						src={entry.image.src}
						alt={entry.image.alt}
						width="700"
						height="900"
						loading="lazy"
					/></a
				>
			{/snippet}
			{#snippet footer()}<a class="text-link" href="/loja"
					>Explorar a Loja dos Signos <span aria-hidden="true">↗</span></a
				>{/snippet}
		</HomeCarousel>
	</div>{/if}
