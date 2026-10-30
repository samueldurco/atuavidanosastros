<script lang="ts">
	import { customerOffers } from '$lib/data/product-copy';
	import { universes } from '$lib/data/site';
	import { mvpArt, mvpTheme, mvpThemes } from '$lib/data/mvp-visual';
	import { productCovers } from './product-covers';
	import './showcase.css';
	let {
		productId,
		compact = false,
		index
	}: { productId: string; compact?: boolean; index?: number } = $props();
	const product = $derived(customerOffers.find((item) => item.id === productId));
	const cover = $derived(productCovers[productId]);
	const universe = $derived(universes.find((item) => item.productUniverse === product?.universe));
	const theme = $derived(mvpThemes[mvpTheme(product?.universe ?? 'meu-ceu')]);
	const coverTints: Record<string, string> = {
		'meu-ceu': '#dbe3df',
		ciclos: '#dce9e7',
		amor: '#efddd5',
		proposito: '#e0e3cb',
		tarot: '#eadcc3',
		sonhos: '#e6dfee'
	};
	const tint = $derived(coverTints[mvpTheme(product?.universe ?? 'meu-ceu')] ?? theme.tint);
	const number = $derived(index ?? customerOffers.findIndex((item) => item.id === productId) + 1);
</script>

<div class="atv-home-showcase cover-host" style="display:contents">
	{#if cover && product}<div
			class={`product-cover cover-${cover[3]}`}
			class:cover-compact={compact}
			style={`--cover-color:${theme.ink};--cover-tint:${tint};--cover-angle:${((number % 5) - 2) * 9}deg`}
			data-cover={productId}
			aria-hidden="true"
		>
			<span class="cover-kicker">ATVNA · {universe?.title}</span><span class="cover-lines"></span>
			<img
				class="cover-main"
				src={mvpArt(cover[1])}
				alt=""
				width="240"
				height="240"
				loading="lazy"
			/>
			<img
				class="cover-detail"
				src={mvpArt(cover[2])}
				alt=""
				width="120"
				height="120"
				loading="lazy"
			/>
			<span class="cover-caption">{cover[0]}</span>
			<span class="cover-edition">LEITURA DIGITAL <i>{String(number).padStart(2, '0')}</i></span>
		</div>{/if}
</div>
