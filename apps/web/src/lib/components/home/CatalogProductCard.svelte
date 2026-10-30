<script lang="ts">
	import ProductCover from './ProductCover.svelte';
	let {
		product,
		universe,
		trialAccess = false
	}: {
		product: {
			id: string;
			name: string;
			state: string;
			summary: string;
			href: string;
			cta?: string;
		};
		universe: string;
		trialAccess?: boolean;
	} = $props();
	const status = $derived(
		trialAccess
			? 'Teste gratuito disponível'
			: product.state === 'ACTIVE'
				? 'Disponível'
				: product.state === 'PAUSED'
					? 'Indisponível no momento'
					: 'Em preparação'
	);
</script>

<article class="home-catalog-card public-product-card">
	<a class="cover-link" href={product.href} tabindex="-1" aria-hidden="true"
		><ProductCover productId={product.id} /></a
	>
	<div class="catalog-card-body">
		<p class="eyebrow">{universe}</p>
		<h3><a href={product.href}>{product.name}</a></h3>
		<p class="summary">{product.summary}</p>
		<p class="badge">{status}</p>
		<a class="text-link" href={trialAccess ? `/testar-produtos/${product.id}` : product.href}
			>{trialAccess ? `Testar ${product.name} grátis` : product.cta || 'Conhecer a leitura'}
			<span aria-hidden="true">↗</span></a
		>
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
	.catalog-card-body {
		padding: 25px;
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: start;
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
			500 31px/1.1 'Newsreader',
			Georgia,
			serif;
		margin: 0 0 16px;
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
			font-size: 30px;
		}
	}
</style>
