<script lang="ts">
	import { signs, signNames } from '$lib/data/site';
</script>

<svelte:head>
	<title>Loja dos Signos — em preparação</title>
	<meta
		name="description"
		content="Livros e objetos inspirados nos signos. Loja em preparação; compras ainda indisponíveis."
	/>
	<link rel="canonical" href="https://atuavidanosastros.com.br/loja" />
</svelte:head>

<section class="shop-hero section" data-stitch="FUT-01">
	<div class="container hero-grid">
		<div class="hero-copy">
			<p class="eyebrow">Loja em preparação</p>
			<h1 class="display">Loja dos Signos</h1>
			<p class="lead">
				Livros e objetos inspirados na astrologia e nos signos. Estamos preparando a loja. As
				compras ainda não estão disponíveis.
			</p>
			<a class="button" href="#signos">Explorar os signos</a>
		</div>
		<aside class="preparation-note" aria-label="Estado da loja">
			<span class="status">Em preparação</span>
			<div class="note-rule" aria-hidden="true"></div>
			<p class="note-title">Compras ainda indisponíveis</p>
			<p>
				Os produtos e as condições de compra serão exibidos aqui quando a loja estiver disponível.
			</p>
		</aside>
	</div>
</section>

<section class="shop-index section" id="signos" aria-labelledby="signos-title">
	<div class="container">
		<div class="index-intro">
			<div>
				<p class="eyebrow">Os 12 signos</p>
				<h2 class="h2" id="signos-title">Explore por signo</h2>
			</div>
			<p>
				Escolha um signo para conhecer a página da loja. Os produtos serão adicionados quando
				estiverem disponíveis.
			</p>
		</div>
		<nav class="sign-grid" aria-label="Signos na loja">
			{#each signs as sign, index (sign)}
				<a class="sign-card" href={`/loja/signo/${sign}`}>
					<span class="sign-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
					<strong>{signNames[sign]}</strong>
					<span class="sign-action">Ver página do signo <span aria-hidden="true">→</span></span>
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
