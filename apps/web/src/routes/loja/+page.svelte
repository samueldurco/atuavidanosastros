<script lang="ts">
	import { signs, signNames } from '$lib/data/site';
	import ShopPreparation from '$lib/components/ShopPreparation.svelte';
</script>

<svelte:head>
	<title>Loja dos Signos — em preparação</title>
	<meta
		name="description"
		content="A futura curadoria da Loja dos Signos está em preparação. Nenhum produto, preço ou estoque foi publicado."
	/>
	<link rel="canonical" href="https://atuavidanosastros.com.br/loja" />
</svelte:head>

<section class="shop-hero section" data-stitch="FUT-01">
	<div class="container hero-grid">
		<div class="hero-copy">
			<p class="eyebrow">Uma curadoria em construção</p>
			<h1 class="display">Loja dos Signos</h1>
			<p class="lead">
				Roupas, objetos e edições para levar um pouco do céu ao cotidiano. Ainda não há produtos,
				preços, estoque, prazo ou avaliações publicados.
			</p>
			<a class="button" href="#colecoes">Explorar as coleções</a>
		</div>
		<aside class="preparation-note" aria-label="Estado da loja">
			<span class="status">Em preparação</span>
			<div class="note-rule" aria-hidden="true"></div>
			<p class="note-title">Antes da primeira oferta</p>
			<p>
				Cada item precisa de fornecedor identificado, descrição verificada e condições de compra
				claras. A curadoria ainda não foi publicada.
			</p>
		</aside>
	</div>
</section>

<ShopPreparation />

<section class="shop-index section" id="signos" aria-labelledby="signos-title">
	<div class="container">
		<div class="index-intro">
			<div>
				<p class="eyebrow">Doze caminhos</p>
				<h2 class="h2" id="signos-title">Explore por signo</h2>
			</div>
			<p>
				Estas páginas mostram a proposta de navegação da Loja. Nenhuma delas representa uma seleção
				de produtos disponível para compra.
			</p>
		</div>
		<nav class="sign-grid" aria-label="Signos na loja">
			{#each signs as sign, index (sign)}
				<a class="sign-card" href={`/loja/signo/${sign}`}>
					<span class="sign-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
					<strong>{signNames[sign]}</strong>
					<span class="sign-action">Conhecer a proposta <span aria-hidden="true">→</span></span>
				</a>
			{/each}
		</nav>
	</div>
</section>

<style>
	.shop-hero {
		border-bottom: 1px solid var(--atv-border);
	}
	.hero-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.55fr) minmax(17rem, 0.65fr);
		gap: clamp(2rem, 7vw, 7rem);
		align-items: end;
	}
	.hero-copy {
		max-width: 48rem;
	}
	.hero-copy .lead {
		max-width: 38rem;
		margin: 1.5rem 0 2rem;
	}
	.preparation-note {
		padding: 1.75rem;
		background: var(--atv-surface-card);
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-lg);
	}
	.note-rule {
		width: 2rem;
		height: 1px;
		margin-top: 2.75rem;
		background: var(--atv-gold-500);
	}
	.note-title {
		margin: 1.25rem 0 0.5rem;
		font: 500 1.6rem/1.2 var(--atv-font-display);
	}
	.preparation-note p:last-child {
		margin: 0;
		color: var(--atv-text-secondary);
	}
	.index-intro {
		display: grid;
		grid-template-columns: 1fr minmax(15rem, 0.7fr);
		gap: 2rem;
		align-items: end;
		margin-bottom: 2.5rem;
	}
	.index-intro .h2 {
		margin: 0;
	}
	.index-intro > p {
		max-width: 28rem;
		margin: 0;
		color: var(--atv-text-secondary);
	}
	.sign-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 1rem;
	}
	.sign-card {
		min-width: 0;
		min-height: 11.5rem;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		text-decoration: none;
		color: var(--atv-text-primary);
		background: var(--atv-surface-card);
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-lg);
		transition:
			border-color var(--atv-motion-fast),
			box-shadow var(--atv-motion-fast);
	}
	.sign-card:hover {
		border-color: var(--atv-action);
		box-shadow: var(--atv-shadow-1);
	}
	.sign-number {
		color: var(--atv-text-accent);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.12em;
	}
	.sign-card strong {
		margin: 0.5rem 0 auto;
		font: 500 clamp(1.6rem, 2vw, 2rem)/1.2 var(--atv-font-display);
	}
	.sign-action {
		padding-top: 1.25rem;
		color: var(--atv-action);
		font-size: 0.875rem;
		font-weight: 700;
	}
	@media (max-width: 900px) {
		.hero-grid {
			grid-template-columns: minmax(0, 1fr) minmax(14rem, 0.7fr);
			gap: 2rem;
		}
		.sign-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	@media (max-width: 620px) {
		.hero-grid,
		.index-intro {
			grid-template-columns: 1fr;
		}
		.preparation-note {
			padding: 1.5rem;
		}
		.note-rule {
			margin-top: 1.5rem;
		}
		.sign-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.sign-card {
			min-height: 10rem;
		}
	}
	@media (max-width: 350px) {
		.sign-grid {
			grid-template-columns: 1fr;
		}
		.sign-card {
			min-height: 8.5rem;
		}
	}
</style>
