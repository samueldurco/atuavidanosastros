<script lang="ts">
	import { launchProducts } from '$lib/data/launch-products';
	import { mvpTheme, mvpThemes } from '$lib/data/mvp-visual';
	import MvpProductArt from '../MvpProductArt.svelte';
	import '$lib/styles/mvp-product-art.css';
	const products = launchProducts;
	let active = $state(0);
	const product = $derived(products[active]);
	const theme = $derived(mvpThemes[mvpTheme(product.universe)]);
	function step(direction: number) {
		active = (active + direction + products.length) % products.length;
	}
</script>

<section class="home-launches" id="lancamentos" aria-labelledby="launch-heading">
	<div class="home-wrap">
		<header class="launch-heading">
			<div>
				<p class="eyebrow">05 / Lançamentos</p>
				<h2 id="launch-heading">Uma situação.<br /><em>Um novo olhar.</em></h2>
			</div>
			<p>Conheça os onze lançamentos e abra o teste gratuito na sua conta.</p>
		</header>
		<div class="launch-feature" style={`--launch-ink:${theme.ink};--launch-tint:${theme.tint}`}>
			<div class="launch-art" aria-hidden="true"><MvpProductArt productId={product.id} /></div>
			<div class="launch-copy" aria-live="polite" aria-atomic="true">
				<p class="eyebrow">Leitura digital · Teste gratuito</p>
				<h3><a href={product.href}>{product.name}</a></h3>
				{#if product.subtitle}<p class="launch-subtitle">{product.subtitle}</p>{/if}
				<p>{product.summary}</p>
				<a
					class="launch-action"
					href={`/testar-lancamentos/${product.id}`}
					data-atv-event="product_click"
					data-atv-product={product.id}
					data-atv-context="lancamentos-home"
					data-atv-cta="free_trial">Testar gratuitamente <span aria-hidden="true">↗</span></a
				>
			</div>
			<div class="launch-controls" role="group" aria-label="Escolher lançamento em destaque">
				<button type="button" onclick={() => step(-1)} aria-label="Lançamento anterior">←</button>
				<span>{active + 1} / {products.length}</span>
				<button type="button" onclick={() => step(1)} aria-label="Próximo lançamento">→</button>
			</div>
		</div>
		<a class="launch-all" href="/lancamentos"
			>Conhecer os onze lançamentos <span aria-hidden="true">↗</span></a
		>
	</div>
</section>

<style>
	.home-launches {
		padding: clamp(3rem, 7vw, 6rem) 0;
		background: #e8e6d7;
		border-block: 1px solid #18374626;
	}
	.launch-heading {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 2rem;
		margin-bottom: 2rem;
	}
	h2 {
		margin: 0.35rem 0 0;
		font:
			400 clamp(2.2rem, 4vw, 3.7rem)/1.04 'Newsreader',
			Georgia,
			serif;
		letter-spacing: -0.025em;
	}
	h2 em {
		font-weight: 400;
	}
	.launch-heading > p {
		max-width: 30rem;
		line-height: 1.65;
	}
	.launch-feature {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 1fr;
		background: #fff8e9;
		border: 1px solid #18374630;
	}
	.launch-art {
		align-self: center;
		padding: 1.5rem;
		background: var(--launch-tint);
		height: 100%;
		display: grid;
		align-items: center;
		min-width: 0;
	}
	.launch-copy {
		padding: clamp(1.5rem, 4vw, 3.5rem);
		padding-bottom: 5rem;
	}
	h3 {
		margin: 1rem 0;
		font:
			400 clamp(2rem, 3vw, 3rem)/1.08 'Newsreader',
			Georgia,
			serif;
		color: var(--launch-ink);
	}
	h3 a {
		color: inherit;
		text-decoration: none;
	}
	.launch-copy > p:not(.eyebrow) {
		line-height: 1.65;
		max-width: 38rem;
	}
	.launch-subtitle {
		font-weight: 600;
		color: var(--launch-ink);
	}
	.launch-action {
		display: inline-block;
		margin-top: 1rem;
		color: var(--launch-ink);
		font-weight: 600;
		text-underline-offset: 0.35em;
	}
	.launch-controls {
		position: absolute;
		bottom: 1rem;
		right: 1.5rem;
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.launch-controls button {
		border: 1px solid #18374660;
		background: #fff8e9;
		color: #183746;
		font-size: 1.25rem;
		width: 2.75rem;
		height: 2.75rem;
		cursor: pointer;
	}
	.launch-all {
		display: inline-block;
		margin-top: 1.5rem;
		color: #183746;
		font-weight: 600;
		text-underline-offset: 0.3em;
	}
	a:focus-visible,
	button:focus-visible {
		outline: 3px solid #183746;
		outline-offset: 4px;
	}
	@media (max-width: 700px) {
		.launch-heading {
			display: block;
		}
		.launch-feature {
			grid-template-columns: 1fr;
		}
		.launch-art {
			padding: 1rem;
		}
		.launch-copy {
			padding: 1.5rem 1.5rem 5rem;
		}
		.launch-heading > p {
			margin-top: 1.25rem;
		}
	}
</style>
