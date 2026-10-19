<script lang="ts">
	import MvpProductCard from '$lib/components/MvpProductCard.svelte';
	import { mvpArt, mvpTheme, mvpThemes } from '$lib/data/mvp-visual';
	let { data } = $props();
	const theme = $derived(mvpTheme(data.topic.id));
</script>

<div class="mvp-public">
	<div class="theme-{theme}">
		<section class="universe-hero">
			<div class="universe-hero-surface">
				<div class="universe-hero-copy">
					<a class="back-link" href="/temas">Todos os temas <span aria-hidden="true">↗</span></a>
					<p class="eyebrow">Explore este universo</p>
					<h1>{data.topic.label}</h1>
					<p class="lead">{data.topic.description}</p>
					<a class="button primary" href="#leituras"
						>Conhecer as leituras digitais <span aria-hidden="true">↗</span></a
					>
				</div>
				<div class="universe-hero-emblem" aria-hidden="true">
					<img src={mvpArt(mvpThemes[theme].art)} alt="" width="550" height="420" />
				</div>
			</div>
		</section>
		<section class="wrap section" aria-labelledby="free-tools-title">
			<p class="eyebrow">Experimente</p>
			<h2 id="free-tools-title">Comece gratuitamente</h2>
			<div class="tool-grid">
				{#each data.tools as tool (tool.id)}
					<article class="card tool-card">
						<p class="availability" class:partial={tool.availability === 'partial'}>
							{tool.availabilityLabel}
						</p>
						<h3>{tool.label}</h3>
						<p>{tool.description}</p>
						<p class="requirements">{tool.requirements}</p>
						<a class="tool-action" href={tool.href}
							>{tool.action} <span aria-hidden="true">→</span></a
						>
					</article>
				{/each}
			</div>
		</section>
		<section class="universe-readings section" id="leituras" aria-labelledby="readings-title">
			<div class="wrap">
				<p class="eyebrow">Escolha o que faz sentido para você</p>
				<h2 id="readings-title">Leituras digitais de {data.topic.label}</h2>
				<p class="section-intro">
					Compare o foco de cada leitura e os dados necessários. Cada página informa o conteúdo e a
					disponibilidade.
				</p>
				<div class="grid grid-3 reading-options">
					{#each data.products as product (product.id)}<MvpProductCard {product} showInput />{/each}
				</div>
				<a class="back-link" href="/leituras"
					>Ver o catálogo de leituras digitais <span aria-hidden="true">→</span></a
				>
			</div>
		</section>
		<section class="universe-editorial-band" aria-labelledby="articles-title">
			<div class="wrap universe-editorial-inner">
				<div>
					{#if theme === 'sonhos'}<img
							class="universe-lettering"
							src={mvpArt('lettering-sonhar')}
							alt="Sonhar"
							width="660"
							height="210"
							loading="lazy"
						/>{/if}
					<p class="eyebrow">Entenda o assunto</p>
					<h2 id="articles-title">Para continuar a leitura</h2>
					{#if data.articles.length}<div class="article-grid">
							{#each data.articles as article (article.id)}<article>
									<h3><a href={article.path}>{article.title}</a></h3>
									<p>{article.description}</p>
								</article>{/each}
						</div>{/if}
					<a class="back-link" href={'/revista?tema=' + data.topic.id}
						>{data.topic.editorial} <span aria-hidden="true">→</span></a
					>
				</div>
			</div>
		</section>
	</div>
</div>

<style>
	.back-link,
	.tool-action {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 48px;
	}
	.universe-hero-copy .back-link {
		margin-bottom: 1.25rem;
	}
	.tool-grid,
	.article-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.5rem;
		margin-top: 1.5rem;
	}
	.tool-card {
		display: flex;
		flex-direction: column;
		padding: 2rem;
		border-top: 4px solid var(--universe-accent);
		background-image: url('/brand/mvp/assets/papel-fino.webp');
	}
	.tool-card .tool-action {
		margin-top: auto;
	}
	.availability {
		font-size: 0.8rem;
		font-weight: 600;
	}
	.partial {
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}
	.requirements {
		font-size: 0.9rem;
		color: var(--atv-text-secondary);
	}
	.section-intro {
		max-width: 44rem;
	}
	.reading-options {
		margin-block: 2rem;
	}
	.article-grid article {
		padding-top: 1rem;
		border-top: 1px solid var(--atv-border);
	}
	.article-grid h3 {
		font-size: 1.5rem;
	}
	@media (max-width: 650px) {
		.tool-grid,
		.article-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
