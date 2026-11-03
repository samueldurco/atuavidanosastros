<script lang="ts">
	import { p02Products, p02Specifications, p02PriceFor } from '$lib/data/shop-p02';
	const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
</script>

<section class="collection-hero section">
	<div class="container introduction">
		<p class="eyebrow">Loja dos Signos · Universo do Mapa Astral</p>
		<h1 class="display">O céu, em linguagem de arte.</h1>
		<p class="lead">
			Duas composições para levar a linguagem simbólica da astrologia ao seu espaço. Artes fixas,
			impressas em papel fosco, para apreciar de perto e escolher um lugar na parede.
		</p>
		<p class="preparing" role="status">
			Coleção em preparação. As compras ainda não estão disponíveis.
		</p>
	</div>
</section>

<section class="container products" aria-label="Pôsteres da coleção">
	{#each p02Products as product (product.id)}
		<article class="product" aria-labelledby={`${product.slug}-title`}>
			<div class="image-wrap">
				<img src={product.image} alt={product.imageAlt} width="1000" height="1000" loading="lazy" />
			</div>
			<div class="product-copy">
				<p class="eyebrow">{product.eyebrow}</p>
				<h2 class="h2" id={`${product.slug}-title`}>{product.name}</h2>
				<p class="description">{product.description}</p>
				<p class="price">
					{money.format(p02PriceFor(product).amountMinor / 100)} <span>+ frete</span>
				</p>
				<dl>
					<div>
						<dt>Tamanho</dt>
						<dd>30,48 × 40,64 cm (12 × 16 pol.)</dd>
					</div>
					<div>
						<dt>Material</dt>
						<dd>{p02Specifications.material}</dd>
					</div>
					<div>
						<dt>Você recebe</dt>
						<dd>{p02Specifications.included}</dd>
					</div>
				</dl>
				<p class="fixed-art">Arte fixa, sem personalização. Não é um mapa astral individual.</p>
				<button class="button" type="button" disabled aria-describedby={`${product.slug}-state`}
					>Venda em breve</button
				>
				<p class="state" id={`${product.slug}-state`}>
					A compra será liberada quando as condições de pagamento e entrega estiverem disponíveis.
				</p>
			</div>
		</article>
	{/each}
</section>

<section class="container details" aria-labelledby="details-title">
	<h2 class="h2" id="details-title">Sobre sua impressão</h2>
	<div class="detail-grid">
		<div>
			<h3>O objeto</h3>
			<p>
				{p02Specifications.included} O formato é ligeiramente maior que 30 × 40 cm; confira a medida antes
				de escolher uma moldura.
			</p>
		</div>
		<div>
			<h3>Produção e entrega</h3>
			<p>
				{p02Specifications.production} Frete, prazo e condições aplicáveis serão apresentados antes do
				pagamento.
			</p>
		</div>
		<div>
			<h3>Cuidados</h3>
			<p>{p02Specifications.care}</p>
			<p>{p02Specifications.imageNotice}</p>
		</div>
	</div>
</section>

<style>
	.collection-hero {
		border-bottom: 1px solid var(--atv-border);
	}
	.introduction {
		max-width: 66rem;
	}
	.introduction .display {
		max-width: 53rem;
	}
	.lead {
		max-width: 42rem;
		margin: 1.5rem 0;
	}
	.preparing {
		color: var(--atv-text-secondary);
		font-size: 0.9rem;
	}
	.products {
		display: grid;
		gap: clamp(3rem, 7vw, 6rem);
		padding-block: clamp(3rem, 7vw, 6rem);
	}
	.product {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 0.9fr);
		gap: clamp(2rem, 5vw, 5rem);
		align-items: center;
	}
	.image-wrap {
		background: white;
		border: 1px solid var(--atv-border);
	}
	.image-wrap img {
		display: block;
		width: 100%;
		height: auto;
	}
	.product-copy .h2 {
		margin: 0 0 1rem;
	}
	.description {
		color: var(--atv-text-secondary);
	}
	.price {
		font-size: 1.6rem;
		font-weight: 600;
		margin-block: 1.75rem;
	}
	.price span {
		font-size: 0.9rem;
		font-weight: 400;
		color: var(--atv-text-secondary);
	}
	dl {
		border-block: 1px solid var(--atv-border);
		padding-block: 0.5rem;
	}
	dl > div {
		display: grid;
		grid-template-columns: 6.5rem minmax(0, 1fr);
		gap: 1rem;
		padding-block: 0.65rem;
	}
	dt {
		font-weight: 600;
	}
	dd {
		margin: 0;
		color: var(--atv-text-secondary);
	}
	.fixed-art,
	.state {
		font-size: 0.875rem;
		color: var(--atv-text-secondary);
	}
	.button {
		margin-top: 0.5rem;
		min-height: 44px;
	}
	.button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}
	.details {
		border-top: 1px solid var(--atv-border);
		padding-block: 3rem 5rem;
	}
	.details .h2 {
		margin-top: 0;
	}
	.detail-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 2rem;
	}
	.detail-grid h3 {
		font-size: 1rem;
	}
	.detail-grid p {
		color: var(--atv-text-secondary);
	}
	@media (max-width: 760px) {
		.product,
		.detail-grid {
			grid-template-columns: 1fr;
		}
		.detail-grid {
			gap: 1rem;
		}
	}
	@media (max-width: 380px) {
		dl > div {
			grid-template-columns: 1fr;
			gap: 0.25rem;
		}
	}
</style>
