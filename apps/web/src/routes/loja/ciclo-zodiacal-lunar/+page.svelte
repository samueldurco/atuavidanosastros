<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const price = (cents: number) =>
		(cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
</script>

<svelte:head>
	<title>Ciclo Zodiacal e Simbolismo Lunar — Loja ATVNA</title>
	<meta
		name="description"
		content="Dois pôsteres astrológicos atemporais: Percurso dos doze e Ciclo lunar. Edições fixas de 30 × 40 cm, sem moldura."
	/>
	<link rel="canonical" href="https://atuavidanosastros.com.br/loja/ciclo-zodiacal-lunar" />
</svelte:head>

<section class="section collection">
	<div class="container">
		<a class="back" href="/loja">← Loja dos Signos</a>
		<header>
			<p class="eyebrow">ATVNA · Pôsteres astrológicos</p>
			<h1 class="display">Ciclo Zodiacal e Simbolismo Lunar</h1>
			<p class="lead">
				Duas composições para acompanhar a ordem do zodíaco e o simbolismo da Lua. Edições fixas,
				sem personalização e sem referência a um céu particular.
			</p>
		</header>
		<div class="products">
			{#each data.products as product (product.id)}
				<article class="product">
					<div class="image">
						<img src={product.image} alt={product.alt} width="900" height="1200" loading="lazy" />
					</div>
					<div class="copy">
						<p class="eyebrow">Pôster · 30 × 40 cm</p>
						<h2>{product.title}</h2>
						<p>{product.description}</p>
						<p class="detail">{product.note}</p>
						<p class="price">{price(product.price)}</p>
						<p class="detail">Papel silk 170 g/m² · impressão em uma face · sem moldura.</p>
						{#if product.checkoutHref}
							<a class="button" href={product.checkoutHref}>Comprar {product.title}</a>
							<p class="detail">
								Pagamento pela Shopify. Confira o frete, o total e a previsão de entrega antes de
								concluir a compra.
							</p>
						{:else}
							<p class="availability">Compra em ativação</p>
							<p class="detail">O pagamento desta edição ainda não está disponível.</p>
						{/if}
					</div>
				</article>
			{/each}
		</div>
		<section class="conditions" aria-labelledby="conditions-title">
			<h2 id="conditions-title">Antes de comprar</h2>
			<p>
				Impressão sob demanda e envio pela Gelato. A produção pode ocorrer fora do Brasil. O frete é
				cobrado separadamente; confira o total e a previsão de entrega antes de concluir o
				pagamento.
			</p>
			<p>
				Eventuais tributos de importação são de responsabilidade da ATVNA. Se a transportadora
				solicitar pagamento adicional, fale com nosso atendimento antes de pagar.
			</p>
			<p>
				As imagens são prévias digitais; cores e acabamento podem variar na impressão. Esta edição
				foi conferida digitalmente, sem avaliação de uma amostra física.
			</p>
			<p>
				Em compras pela internet, você pode solicitar desistência em até sete dias corridos após o
				recebimento, sem prejuízo dos demais direitos legais.
			</p>
			<p>
				Para dúvidas, entrega, cancelamento ou devolução: <a
					href="mailto:suporte@atuavidanosastros.com.br">suporte@atuavidanosastros.com.br</a
				>. Consulte também os <a href="/termos">termos de uso</a> e a
				<a href="/privacidade">política de privacidade</a>.
			</p>
		</section>
	</div>
</section>

<style>
	.collection {
		color: var(--atv-text-primary);
	}
	.back {
		display: inline-block;
		margin-bottom: 2rem;
		color: var(--atv-action);
	}
	header {
		max-width: 58rem;
		margin-bottom: 3rem;
	}
	h1 {
		max-width: 17ch;
	}
	.products {
		display: grid;
		gap: 3rem;
	}
	.product {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: clamp(1.5rem, 4vw, 4rem);
		padding-block: 2rem;
		border-top: 1px solid var(--atv-border);
	}
	.image {
		background: var(--atv-surface-card);
		border-radius: var(--atv-radius-lg);
		overflow: hidden;
	}
	img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 3 / 4;
		object-fit: contain;
	}
	.copy {
		align-self: center;
	}
	h2 {
		font: 500 clamp(1.7rem, 3vw, 2.5rem)/1.2 var(--atv-font-display);
	}
	p {
		line-height: 1.7;
	}
	.detail {
		font-size: 0.925rem;
		color: var(--atv-text-secondary);
	}
	.price {
		font-size: 1.6rem;
		font-weight: 600;
	}
	.availability {
		display: inline-block;
		padding: 0.8rem 1.2rem;
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-lg);
		font-weight: 600;
	}
	.conditions {
		max-width: 76ch;
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid var(--atv-border);
	}
	.conditions h2 {
		font-size: 1.5rem;
	}
	.conditions a {
		color: var(--atv-action);
	}
	@media (max-width: 680px) {
		.product {
			grid-template-columns: 1fr;
		}
	}
</style>
