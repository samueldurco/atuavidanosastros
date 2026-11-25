<script lang="ts">
	import { isLaunchProductId, productTrialHref } from '@atv/domain';
	import DigitalProductArtwork from '../DigitalProductArtwork.svelte';
	import '$lib/styles/mvp-product-art.css';
	let {
		product,
		universe,
		trialAccess = false,
		compact = false
	}: {
		product: {
			id: string;
			name: string;
			state: string;
			summary: string;
			href: string;
		};
		universe: string;
		trialAccess?: boolean;
		compact?: boolean;
	} = $props();
	const availableTrial = $derived(trialAccess || isLaunchProductId(product.id));
	const status = $derived(
		availableTrial
			? 'Teste gratuito disponível'
			: product.state === 'ACTIVE'
				? 'Disponível'
				: product.state === 'PAUSED'
					? 'Indisponível no momento'
					: 'Em preparação'
	);
</script>

<article class="home-catalog-card public-product-card" class:compact>
	<a class="cover-link" href={product.href} aria-label={`Conhecer ${product.name}`} tabindex="-1"
		><DigitalProductArtwork productId={product.id} /></a
	>
	<div class="catalog-card-body">
		<p class="eyebrow">{universe}</p>
		<h3><a href={product.href}>{product.name}</a></h3>
		<p class="summary">{product.summary}</p>
		<div class="card-actions">
			<a class="sample-link" href={`${product.href}#amostra`}
				>Ver uma amostra <span aria-hidden="true">↗</span></a
			>
			<p class="badge">{status}</p>
			<a
				class="text-link"
				class:trial={availableTrial}
				href={availableTrial ? productTrialHref(product.id) : product.href}
				aria-label={availableTrial ? `Testar ${product.name} grátis` : `Conhecer ${product.name}`}
				>{availableTrial
					? compact
						? 'Testar grátis'
						: 'Testar gratuitamente'
					: 'Conhecer a leitura'}
				<span aria-hidden="true">↗</span></a
			>
		</div>
	</div>
</article>

<style>
	.home-catalog-card {
		min-width: 0;
		height: 100%;
		display: flex;
		flex-direction: column;
		border: 1px solid #b8beb1;
		background: #f2eedf url('/brand/mvp/assets/papel-fino.webp');
	}
	.cover-link {
		display: block;
		text-decoration: none;
		border-bottom: 1px solid #b8beb1;
	}
	.sample-link {
		font:
			500 12px/1.6 'Onest',
			Arial,
			sans-serif;
		padding-block: 12px;
		margin-bottom: 12px;
	}
	.catalog-card-body {
		padding: 20px;
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: start;
	}
	.card-actions {
		display: flex;
		flex-direction: column;
		align-items: start;
		width: 100%;
		margin-top: auto;
	}
	.home-catalog-card .eyebrow {
		font:
			600 9px/1.6 'Onest',
			Arial,
			sans-serif;
		letter-spacing: 0.12em;
		margin: 0 0 12px;
		color: #435856;
	}
	.home-catalog-card h3 {
		font:
			500 27px/1.1 'Newsreader',
			Georgia,
			serif;
		margin: 0 0 12px;
		color: #173e4a;
	}
	.home-catalog-card h3 a {
		text-decoration: none;
		color: inherit;
	}
	.home-catalog-card .summary {
		font:
			400 12px/1.8 'Onest',
			Arial,
			sans-serif;
		margin: 0 0 20px;
	}
	.home-catalog-card .badge {
		margin: auto 0 16px;
		color: #6b5c46;
		background: transparent;
		border: 0;
		padding: 0;
		font:
			500 9px/1.5 'Onest',
			Arial,
			sans-serif;
		text-transform: uppercase;
		letter-spacing: 0.07em;
	}
	.home-catalog-card .text-link {
		min-height: 44px;
		font:
			500 12px/1.5 'Onest',
			Arial,
			sans-serif;
		border-bottom: 1px solid currentColor;
		text-decoration: none;
		padding: 8px 0;
		display: inline-flex;
		gap: 20px;
		align-items: center;
		color: #173e4a;
	}
	@media (max-width: 700px) {
		.catalog-card-body {
			padding: 23px;
		}
		.home-catalog-card h3 {
			font-size: 28px;
		}
	}
	.compact .catalog-card-body {
		padding: 15px;
	}
	.compact .cover-link {
		container-type: inline-size;
	}
	.compact .cover-link :global(.digital-artwork) {
		min-height: 0;
		aspect-ratio: 1.1;
		padding: 6cqw 10cqw 8cqw;
	}
	.compact .cover-link :global(.folio) {
		width: 66cqw;
		height: 80cqw;
		padding: 3.5cqw 4.5cqw 3cqw;
		box-shadow:
			2px 2px 0 #ede6d6,
			3px 3px 0 #18374640,
			5px 8px 12px #18374620;
	}
	.compact .cover-link :global(.folio-imprint) {
		font-size: 2cqw;
		gap: 2cqw;
		padding-bottom: 2cqw;
	}
	.compact .cover-link :global(.folio-engraving) {
		margin: 2cqw -2cqw;
	}
	.compact .cover-link :global(.folio-title) {
		font-size: 6.2cqw;
	}
	.compact .cover-link :global(.folio-caption) {
		font-size: 2.1cqw;
		margin-top: 2cqw;
	}
	.compact .cover-link :global(.folio-foot) {
		font-size: 1.7cqw;
		margin-top: 3cqw;
		padding-top: 2cqw;
		gap: 2cqw;
	}
	.compact .cover-link :global(.art-edition) {
		font-size: 2cqw;
		bottom: 2cqw;
		right: 3cqw;
	}
	.compact .eyebrow {
		font-size: 9px;
		letter-spacing: 0.06em;
		margin-bottom: 7px;
	}
	.compact h3 {
		font-size: 25px;
		line-height: 1.08;
		margin-bottom: 9px;
		overflow-wrap: anywhere;
	}
	.compact .summary {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
		font-size: 12px;
		line-height: 1.6;
		margin-bottom: 8px;
	}
	.compact .sample-link {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		min-height: 44px;
		padding: 5px 0;
		margin: 0;
	}
	.compact .badge {
		margin: 0 0 9px;
		font-size: 10px;
		text-transform: none;
		letter-spacing: 0;
	}
	.compact .text-link {
		justify-content: space-between;
		width: 100%;
		gap: 8px;
		padding: 9px 0;
		font-size: 12px;
	}
	.compact .text-link.trial {
		background: #183746;
		color: #fff8e9;
		border: 1px solid #183746;
		padding-inline: 11px;
	}
	@media (max-width: 600px) {
		.compact .catalog-card-body {
			padding: 12px;
		}
		.compact h3 {
			font-size: 20px;
		}
		.compact .summary {
			font-size: 12px;
		}
	}
	@media (max-width: 389px) {
		.compact {
			display: grid;
			grid-template-columns: 94px minmax(0, 1fr);
		}
		.compact .cover-link {
			display: flex;
			align-items: center;
			border-bottom: 0;
			border-right: 1px solid #b8beb1;
			background: #dce7e0 url('/brand/mvp/assets/papel-fino.webp') center / 520px;
		}
		.compact .catalog-card-body {
			padding: 12px;
		}
		.compact h3 {
			font-size: 22px;
		}
	}
</style>
