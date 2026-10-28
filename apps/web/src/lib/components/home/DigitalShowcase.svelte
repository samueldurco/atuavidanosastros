<script lang="ts">
	import { atvPlusPlans } from '@atv/domain';
	import { customerOffers, customerProduct } from '$lib/data/product-copy';
	import { universes } from '$lib/data/site';
	import { mvpArt } from '$lib/data/mvp-visual';
	import { selectHomeHighlights, type HomeHighlight } from '$lib/home-highlights';
	import HomeCarousel from './HomeCarousel.svelte';
	import ProductCover from './ProductCover.svelte';
	import { productCovers } from './product-covers';
	import './showcase.css';
	let {
		toolActive = false,
		showDiscovery = true,
		highlights = []
	}: {
		toolActive?: boolean;
		showDiscovery?: boolean;
		highlights?: readonly HomeHighlight[];
	} = $props();
	const status = (state: string) =>
		state === 'ACTIVE'
			? 'Disponível'
			: state === 'PAUSED'
				? 'Indisponível no momento'
				: 'Em preparação';
	const universeName = (id: string) =>
		universes.find((item) => item.productUniverse === id)?.title ?? '';
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
	const tabNames: Record<string, string> = {
		'birth-chart': 'Mapa astral',
		'tarot-situation-challenge-advice': 'Tarot · 3 cartas',
		'dream-reading': 'Sonhos'
	};
	const discoveries = ['personal-calendar', 'synastry', 'purpose-career']
		.map((id) => customerOffers.find((product) => product.id === id)!)
		.filter(Boolean);
	const plus = customerProduct('atv-plus');
</script>

<div class="atv-home-showcase">
	<div class="digital-grid showcase-grid">
		<HomeCarousel
			label="Produtos avulsos"
			count={featured.length}
			titles={featured.map((product) => tabNames[product.id] ?? product.name)}
			className="showcase-card avulsos"
			{toolActive}
		>
			{#snippet heading()}<div class="showcase-heading">
					<h3>Leituras avulsas</h3>
					<span class="status"
						>{featured.some((product) => product.state === 'ACTIVE')
							? 'Em destaque'
							: 'Em preparação'}</span
					>
				</div>{/snippet}
			{#snippet slide(index)}{@const product = featured[index]}
				<ProductCover productId={product.id} />
				<div class="showcase-copy">
					<p class="eyebrow">{universeName(product.universe)} · {status(product.state)}</p>
					<h4>{product.name}</h4>
					<p>{product.summary}</p>
				</div>
				<a
					class="button showcase-cta"
					href={product.href}
					data-atv-event="product_click"
					data-atv-product={product.id}
					data-atv-context="avulsos"
					data-atv-cta="offer">Conhecer esta leitura <span aria-hidden="true">↗</span></a
				>
			{/snippet}
			{#snippet footer()}<a class="text-link" href="/leituras#catalogo"
					>Ver os {customerOffers.length} produtos <span aria-hidden="true">↗</span></a
				>{/snippet}
		</HomeCarousel>
		<HomeCarousel
			label="Assinatura ATV+"
			count={atvPlusPlans.length}
			titles={['Essencial', 'Ampliado', 'Premium']}
			className="showcase-card subscription"
			{toolActive}
		>
			{#snippet heading()}<div class="showcase-heading">
					<h3>ATV+</h3>
					<span class="status">{status(plus?.state ?? 'PREPARING')}</span>
				</div>{/snippet}
			{#snippet slide(index)}{@const plan = atvPlusPlans[index]}
				<div class={`subscription-art plan-${plan.id}`} aria-hidden="true">
					<span class="subscription-orbit orbit-one"></span><span
						class="subscription-orbit orbit-two"
					></span><img
						class="subscription-moon"
						src={mvpArt(
							index === 0 ? 'lua-gravada' : index === 1 ? 'fases-lunares' : 'saturno-gravado'
						)}
						alt=""
						width="200"
						height="200"
						loading="lazy"
					/><span class="subscription-mark">ATV<span>+</span></span><span class="subscription-cycle"
						>UM NOVO CICLO A CADA {plan.cycleDays} DIAS</span
					><span class="subscription-number">0{index + 1}</span>
				</div>
				<div class="showcase-copy">
					<p class="eyebrow">Assinatura de previsões e leituras</p>
					<h4>{plan.name}</h4>
					<p>{plan.description}</p>
					<span class="plan-formula"
						>{index === 0
							? '1 previsão pessoal'
							: index === 1
								? '1 previsão + 1 leitura'
								: '1 previsão + 2 leituras ou 1 método maior'}</span
					>
				</div>
				<a
					class="button showcase-cta"
					href="/atv-mais"
					data-atv-event="product_click"
					data-atv-product="atv-plus"
					data-atv-item={plan.id}
					data-atv-context="subscription"
					data-atv-cta="offer">Conhecer os planos <span aria-hidden="true">↗</span></a
				>
			{/snippet}
			{#snippet footer()}<span class="showcase-footnote">Escolha o ritmo do seu ciclo</span
				>{/snippet}
		</HomeCarousel>
	</div>
	{#if showDiscovery}
		<div class="discovery-heading">
			<div>
				<p class="eyebrow">Outras leituras para conhecer</p>
				<h3>Qual tema conversa com você?</h3>
			</div>
			<a class="text-link" href="/leituras#catalogo"
				>Catálogo completo <span aria-hidden="true">↗</span></a
			>
		</div>
		<div class="discovery-grid">
			{#each discoveries as product (product.id)}<a
					href={product.href}
					class="discovery-card"
					data-atv-event="product_click"
					data-atv-product={product.id}
					data-atv-context="products"
					data-atv-cta="open"
					><ProductCover productId={product.id} compact />
					<div>
						<p class="eyebrow">{universeName(product.universe)}</p>
						<h4>{product.name}</h4>
						<p>{product.summary}</p>
						<span class="status">{status(product.state)}</span><span class="text-link"
							>Conhecer <span aria-hidden="true">↗</span></span
						>
					</div></a
				>{/each}
		</div>
	{/if}
</div>
