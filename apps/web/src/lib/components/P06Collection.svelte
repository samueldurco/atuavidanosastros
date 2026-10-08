<script lang="ts">
	import type { P06Product } from '@atv/integrations';
	let {
		products,
		review = false
	}: {
		products: (Omit<P06Product, 'supplier' | 'catalogVariantId'> & { available: boolean })[];
		review?: boolean;
	} = $props();
	const money = (minor: number) =>
		new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(minor / 100);
</script>

<section class="section p06-collection">
	<div class="container">
		<a class="back" href="/loja">← Loja dos Signos</a>
		<p class="eyebrow">Composições autorais · ATVNA</p>
		<h1 class="display">Mitos e Emblemas<br />do Zodíaco</h1>
		<p class="lead">
			O arco, a curva e o fluxo. Três formas de trazer narrativas do céu para o cotidiano.
		</p>
		{#if review}<p class="review" role="status">
				Revisão local privada. Preços aprovados pelo proprietário; compra indisponível até a
				conclusão do cadastro comercial.
			</p>{/if}
		{#if products.length === 0}
			<p class="empty" role="status">
				Esta coleção está em preparação. As compras serão abertas quando as condições de pagamento,
				entrega e produção estiverem confirmadas.
			</p>
		{:else}
			<div class="products">
				{#each products as product (product.sku)}
					<article class="product" aria-labelledby={`title-${product.id}`}>
						<div class="image">
							<img
								src={product.image}
								alt={product.imageAlt}
								width="800"
								height="800"
								loading="lazy"
							/>
						</div>
						<div class="copy">
							<p class="eyebrow">
								{product.kind === 'EMB' ? 'Emblema em fios' : 'Gravura digital'}
							</p>
							<h2 id={`title-${product.id}`}>{product.name}</h2>
							<p class="price">{money(product.amountMinor)}</p>
							<p class="freight">Frete calculado para o destino e informado antes do pagamento.</p>
							<p>{product.description}</p>
							<ul>
								{#each product.details as detail (detail)}<li>{detail}</li>{/each}
							</ul>
							<p class="quality">{product.quality}</p>
							{#if product.available && !review}
								<form method="POST" action="/loja/checkout">
									<input type="hidden" name="sku" value={product.sku} />
									<input type="hidden" name="quantity" value="1" />
									<button class="button" type="submit">Comprar na Hotmart</button>
								</form>
								<p class="terms">
									Confira prazo total, frete, tributos, política de troca e dados do vendedor no
									checkout antes de pagar.
								</p>
							{:else}<p class="unavailable">Cadastro em preparação · compra indisponível</p>{/if}
						</div>
					</article>
				{/each}
			</div>
		{/if}
		<p class="context">
			As referências são narrativas de tradições greco-romanas, com variantes. As artes não
			representam um consenso entre culturas nem prometem efeitos sobre personalidade, saúde ou
			destino.
		</p>
	</div>
</section>

<style>
	.back {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		margin-bottom: 2rem;
	}
	h1 {
		max-width: 58rem;
	}
	.lead {
		max-width: 43rem;
		margin: 1.5rem 0 2.5rem;
	}
	.review,
	.empty {
		padding: 1.5rem;
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-lg);
		background: var(--atv-surface-card);
	}
	.products {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 2rem;
		margin-top: 2rem;
	}
	.product {
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-lg);
		overflow: hidden;
		background: var(--atv-surface-card);
	}
	.image {
		aspect-ratio: 1;
		background: #f4efdf;
	}
	img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
	.copy {
		padding: clamp(1.25rem, 3vw, 2rem);
	}
	h2 {
		font: 500 clamp(1.6rem, 3vw, 2rem)/1.2 var(--atv-font-display);
		margin: 0.5rem 0 1.25rem;
	}
	.price {
		font-size: 1.4rem;
		font-weight: 600;
		margin-bottom: 0.25rem;
	}
	.freight,
	.quality,
	.terms,
	.context {
		color: var(--atv-text-secondary);
		font-size: 0.9rem;
	}
	.quality {
		border-top: 1px solid var(--atv-border);
		padding-top: 1rem;
	}
	.unavailable {
		font-weight: 600;
	}
	button {
		min-height: 44px;
		cursor: pointer;
	}
	.context {
		max-width: 55rem;
		margin-top: 3rem;
	}
	@media (max-width: 700px) {
		.products {
			grid-template-columns: 1fr;
		}
	}
</style>
