<script lang="ts">
	import MvpProductArt from './MvpProductArt.svelte';
	import { mvpProductDesign } from '$lib/data/mvp-visual';
	type Product = {
		id: string;
		name: string;
		state: string;
		summary: string;
		href: string;
		cta?: string;
		details?: { scope: string; input: string };
	};
	let {
		product,
		trialAccess = false,
		showInput = false
	}: { product: Product; trialAccess?: boolean; showInput?: boolean } = $props();
	const design = $derived(mvpProductDesign(product.id));
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

<article class="card public-product-card" class:has-design={!!design}>
	<a
		class="product-card-picture"
		href={product.href}
		aria-label={`Conhecer ${product.name}`}
		tabindex="-1"
		aria-hidden="true"><MvpProductArt productId={product.id} /></a
	>
	<div class="card-body">
		<p class="eyebrow">Leitura digital</p>
		<p class="badge">{status}</p>
		{#if design}<p class="product-card-caption">{design.caption}</p>{/if}
		<h3><a href={product.href}>{product.name}</a></h3>
		<p>{showInput ? product.details?.scope || product.summary : product.summary}</p>
		{#if showInput && product.details?.input}<p class="requirements">
				{product.details.input}
			</p>{/if}
		<a class="text-link" href={trialAccess ? `/testar-produtos/${product.id}` : product.href}
			>{trialAccess ? `Testar ${product.name} grátis` : product.cta || 'Conhecer a leitura'}
			<span aria-hidden="true">↗</span></a
		>
	</div>
</article>

<style>
	.public-product-card {
		padding: 0;
		min-width: 0;
		height: 100%;
	}
	.card-body {
		display: flex;
		flex-direction: column;
		flex: 1;
		align-items: flex-start;
	}
	.card-body h3 a {
		text-decoration: none;
	}
	.card-body > .text-link {
		margin-top: auto;
		padding-top: 1.2rem;
		min-height: 44px;
	}
	.badge {
		margin-top: 0;
	}
	.requirements {
		font-size: 0.85rem;
	}
</style>
