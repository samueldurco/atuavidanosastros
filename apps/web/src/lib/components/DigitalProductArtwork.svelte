<script lang="ts">
	import { customerProduct } from '$lib/data/product-copy';
	import { mvpProductDesign } from '$lib/data/mvp-visual';
	import MvpProductArt from './MvpProductArt.svelte';
	import '$lib/styles/mvp-product-art.css';
	let { productId, large = false }: { productId: string; large?: boolean } = $props();
	const product = $derived(customerProduct(productId));
	const design = $derived(mvpProductDesign(productId));
</script>

{#if product && design}
	<div
		class="digital-artwork"
		class:large
		data-product-artwork={productId}
		style:--art-ink={design.ink}
		style:--art-tint={design.tint}
		aria-hidden="true"
	>
		<span class="art-orbit"></span>
		<div class="folio">
			<div class="folio-imprint"><span>ATVNA</span><span>Leituras digitais</span></div>
			<div class="folio-engraving"><MvpProductArt {productId} /></div>
			<div class="folio-title">{product.name}</div>
			<div class="folio-caption">{design.caption}</div>
			<div class="folio-foot"><span>A Tua Vida nos Astros</span><span>✦</span></div>
		</div>
		<span class="art-edition">Uma leitura sobre você</span>
	</div>
{/if}

<style>
	.digital-artwork {
		position: relative;
		isolation: isolate;
		display: grid;
		grid-template-rows: minmax(0, 1fr);
		place-items: center;
		overflow: hidden;
		width: 100%;
		min-width: 0;
		min-height: 330px;
		aspect-ratio: 1.05;
		padding: 24px 28px 30px;
		background: var(--art-tint);
		color: var(--art-ink);
	}
	.digital-artwork::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background: url('/brand/mvp/assets/papel-fino.webp') center/cover;
		opacity: 0.35;
		mix-blend-mode: multiply;
	}
	.art-orbit {
		position: absolute;
		width: 105%;
		aspect-ratio: 1;
		border: 1px solid currentColor;
		border-radius: 50%;
		left: 30%;
		top: -22%;
		opacity: 0.18;
		z-index: -1;
	}
	.art-orbit::after {
		content: '';
		position: absolute;
		inset: 15px;
		border: 1px solid currentColor;
		border-radius: 50%;
	}
	.folio {
		position: relative;
		display: flex;
		flex-direction: column;
		width: min(100%, 225px);
		min-width: 0;
		height: 280px;
		background: #fff8e9 url('/brand/mvp/assets/papel-fino.webp') center/cover;
		padding: 13px 17px 11px;
		border: 1px solid color-mix(in srgb, var(--art-ink) 36%, transparent);
		box-shadow:
			4px 4px 0 #ede6d6,
			5px 5px 0 color-mix(in srgb, var(--art-ink) 25%, transparent),
			12px 17px 20px #18374620;
		transform: rotate(-4deg);
	}
	.folio::before {
		content: '';
		position: absolute;
		inset: 0 auto 0 5px;
		border-left: 1px solid #18374618;
	}
	.folio-imprint,
	.folio-foot {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		font:
			500 7px/1.4 'Onest',
			Arial,
			sans-serif;
		letter-spacing: 0.08em;
	}
	.folio-imprint {
		padding-bottom: 7px;
		border-bottom: 1px solid #18374630;
		text-transform: uppercase;
	}
	.folio-engraving {
		margin: 6px -9px 8px;
		flex: 1;
		min-height: 0;
	}
	.folio-engraving :global(.mvp-product-art) {
		height: 100%;
	}
	.folio-engraving :global(.product-art) {
		background: transparent;
		/* Isolate the cover from legacy full-height offer artwork rules. */
		height: 100% !important;
		min-height: 0 !important;
		aspect-ratio: 600/440 !important;
	}
	.folio-engraving :global(svg) {
		min-height: 0 !important;
	}
	.folio-engraving :global(.pa-canvas) {
		height: 100% !important;
		aspect-ratio: 600/440 !important;
	}
	.folio-engraving :global(.product-art::before),
	.folio-engraving :global(.product-art-index) {
		display: none;
	}
	.folio-title {
		font:
			500 21px/1.06 'Newsreader',
			Georgia,
			serif;
		text-wrap: balance;
		overflow-wrap: anywhere;
	}
	.folio-caption {
		margin-top: 7px;
		font:
			400 8px/1.5 'Onest',
			Arial,
			sans-serif;
	}
	.folio-foot {
		border-top: 1px solid #18374630;
		padding-top: 8px;
		margin-top: 13px;
		font-size: 6px;
		letter-spacing: 0.02em;
	}
	.art-edition {
		position: absolute;
		bottom: 10px;
		right: 14px;
		font:
			500 7px/1.4 'Onest',
			Arial,
			sans-serif;
		text-transform: uppercase;
		letter-spacing: 0.13em;
		opacity: 0.8;
	}
	.large {
		min-height: 440px;
		aspect-ratio: 1.12;
		padding: 35px;
	}
	.large .folio {
		width: min(80%, 330px);
		height: 430px;
		padding: 20px 25px 18px;
	}
	.large .folio-title {
		font-size: 32px;
	}
	.large .folio-imprint {
		font-size: 9px;
	}
	.large .folio-caption {
		font-size: 11px;
	}
	.large .folio-foot {
		font-size: 8px;
	}
	@media (prefers-reduced-motion: no-preference) {
		.folio {
			transition: transform 0.25s;
		}
		.digital-artwork:hover .folio {
			transform: rotate(-1deg) translateY(-3px);
		}
	}
	@media (max-width: 600px) {
		.large {
			min-height: 450px;
			padding: 30px 20px;
		}
		.large .folio {
			width: min(100%, 290px);
			height: 365px;
			padding: 18px;
		}
		.large .folio-title {
			font-size: clamp(24px, 7.2vw, 28px);
		}
	}
</style>
