<script lang="ts">
	import MvpProductArt from '$lib/components/MvpProductArt.svelte';
	import { mvpProductDesign, mvpTheme, mvpThemes } from '$lib/data/mvp-visual';
	let { data } = $props();
	const design = $derived(mvpProductDesign(data.product.id));
	const theme = $derived(design?.theme ?? mvpTheme(data.product.universe));
	const colors = $derived(design ?? mvpThemes[theme]);
</script>

<div class="mvp-public">
	<div
		class="product-offer-page contextual-offer-page theme-{theme} product-layout-{design?.layout ??
			'sheet'}"
		style:--product-ink={colors.ink}
		style:--product-accent={colors.accent}
		style:--product-tint={colors.tint}
	>
		<section class="product-offer-hero">
			<div class="wrap product-offer-hero-inner">
				<div class="product-offer-copy">
					<a class="back-link" href="/leituras"
						>Todas as leituras <span aria-hidden="true">↗</span></a
					>
					<p class="eyebrow">{data.presentation.eyebrow}</p>
					<p class="contextual-badge">
						{data.presentation.status === 'DECIDED_PREPARING'
							? 'Contexto definido · Apresentação em preparação'
							: 'Possibilidade histórica · Em estudo'}
					</p>
					{#if design}<p class="product-offer-caption">{design.caption}</p>{/if}
					<h1>{data.presentation.headline}</h1>
					<p class="lead">{data.presentation.opening}</p>
					<a class="button product-primary" href="#detalhes"
						>Entender a diferença <span aria-hidden="true">↗</span></a
					>
				</div>
				<div class="product-offer-art">
					<MvpProductArt productId={data.product.id} mode="hero" />
				</div>
			</div>
		</section>
		<section class="wrap section contextual-content" id="detalhes">
			<div class="contextual-intro">
				<p class="eyebrow">Uma pergunta diferente</p>
				<h2>O que esta leitura acrescenta?</h2>
				<p>{data.presentation.comparison}</p>
			</div>
			<section class="contextual-compare" aria-label="Compare as duas leituras">
				<article>
					<p class="contextual-index">01 / Ponto de partida</p>
					<h3>{data.source.name}</h3>
					<p>{data.sourceDetails.scope}</p>
				</article>
				<article>
					<p class="contextual-index">
						02 / {data.presentation.kind === 'downsell'
							? 'Alternativa mais delimitada'
							: 'Outro recorte'}
					</p>
					<h3>{data.product.name}</h3>
					<p>{data.productDetails.scope}</p>
				</article>
			</section>
			<aside class="contextual-next" aria-labelledby="contextual-next-heading">
				<div>
					<p class="eyebrow">Para decidir com clareza</p>
					<h2 id="contextual-next-heading">Conheça a proposta antes de escolher</h2>
					<p>{data.presentation.decision}</p>
					{#if data.presentation.status === 'DECIDED_PREPARING'}
						<p class="contextual-status" role="status">
							Este contexto foi definido para a jornada, mas a apresentação ainda está em
							preparação. A leitura não está disponível para compra; preço e condições serão
							informados quando houver uma oferta ativa.
						</p>
					{:else}
						<p class="contextual-status" role="status">
							Este percurso é uma possibilidade histórica em estudo, ainda não adotada na jornada. A
							leitura não está disponível para compra e não há preço ou condição comercial vigente
							aqui.
						</p>
					{/if}
				</div>
				<nav aria-label="Próximos caminhos" class="contextual-links">
					<a class="button product-primary" href={'/produtos/' + data.product.slug}
						>Ver a ficha de {data.product.name} <span aria-hidden="true">↗</span></a
					>
					<a class="text-link" href={'/produtos/' + data.source.slug}
						>Rever {data.source.name} <span aria-hidden="true">↗</span></a
					>
					{#if data.presentation.moment === 'post-purchase'}
						<a class="text-link" href="/biblioteca"
							>Ir à Minha Biblioteca <span aria-hidden="true">↗</span></a
						>
					{/if}
				</nav>
			</aside>
		</section>
	</div>
</div>

<style>
	.back-link {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		margin-bottom: 1.25rem;
		font-size: 0.8rem;
	}
	.contextual-badge {
		display: inline-block;
		margin: 0.15rem 0 0.7rem;
		padding: 0.3rem 0.7rem;
		border: 1px solid color-mix(in srgb, var(--product-ink) 35%, transparent);
		border-radius: 999px;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.product-offer-copy > .button {
		margin-top: 1.7rem;
	}
	.contextual-content {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
		gap: clamp(2rem, 5vw, 5rem);
	}
	.contextual-intro h2,
	.contextual-next h2 {
		font-size: clamp(2rem, 3.2vw, 3.3rem);
		line-height: 1.1;
	}
	.contextual-intro > p:last-child,
	.contextual-next p {
		line-height: 1.65;
	}
	.contextual-compare {
		border-top: 1px solid color-mix(in srgb, var(--product-ink) 27%, transparent);
	}
	.contextual-compare article {
		padding: 1.35rem 0;
		border-bottom: 1px solid color-mix(in srgb, var(--product-ink) 27%, transparent);
	}
	.contextual-compare h3 {
		font-size: clamp(1.55rem, 2.4vw, 2.2rem);
		margin: 0 0 0.65rem;
	}
	.contextual-compare article > p:last-child {
		margin: 0;
		line-height: 1.6;
	}
	.contextual-index {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		margin: 0 0 0.65rem;
	}
	.contextual-next {
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 0.7fr);
		align-items: end;
		gap: 2rem;
		padding: clamp(1.5rem, 3vw, 3rem);
		background: var(--product-tint);
		border: 1px solid color-mix(in srgb, var(--product-ink) 18%, transparent);
	}
	.contextual-next h2 {
		margin-top: 0.5rem;
	}
	.contextual-status {
		font-weight: 600;
	}
	.contextual-links {
		display: grid;
		justify-items: start;
		gap: 0.8rem;
	}
	.contextual-links a {
		max-width: 100%;
		min-height: 44px;
	}
	@media (max-width: 700px) {
		.contextual-content,
		.contextual-next {
			grid-template-columns: 1fr;
		}
		.contextual-content {
			gap: 2.5rem;
		}
		.contextual-next {
			gap: 1rem;
		}
	}
</style>
