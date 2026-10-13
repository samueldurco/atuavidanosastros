<script lang="ts">
	import VisualMotif from '$lib/components/VisualMotif.svelte';
	let { data } = $props();
</script>

<section class="section topic-hub">
	<div class="container">
		<div class="topic-intro">
			<div class="reading">
				<a class="back-link" href="/temas">Todos os temas <span aria-hidden="true">↗</span></a>
				<p class="eyebrow">Explorar um tema</p>
				<h1 class="h1">{data.topic.label}</h1>
				<p class="lead">{data.topic.description}</p>
			</div>
			<VisualMotif identity={data.topic.id} eager />
		</div>
		<section class="hub-section" aria-labelledby="free-tools-title">
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
		<section class="hub-section" aria-labelledby="readings-title">
			<p class="eyebrow">Escolha o que faz sentido para você</p>
			<h2 id="readings-title">Compare as leituras deste tema</h2>
			<p class="section-intro">
				Veja o foco de cada leitura e os dados necessários. A página de cada produto informa o
				conteúdo e sua disponibilidade.
			</p>
			<div class="reading-options">
				{#each data.products as product (product.id)}
					<article class="reading-option">
						<div>
							<h3><a href={product.href}>{product.name}</a></h3>
							<p>{product.details?.scope || product.summary}</p>
							{#if product.details?.input}<p class="requirements">{product.details.input}</p>{/if}
						</div>
						<div class="option-action">
							{#if product.state !== 'ACTIVE'}<span class="availability">Em preparação</span>{/if}
							<a href={product.href}>Conhecer a leitura <span aria-hidden="true">→</span></a>
						</div>
					</article>
				{/each}
			</div>
			<a class="back-link" href="/leituras"
				>Ver todas as leituras <span aria-hidden="true">→</span></a
			>
		</section>
		<section class="hub-section" aria-labelledby="articles-title">
			<p class="eyebrow">Entenda o assunto</p>
			<h2 id="articles-title">Para continuar a leitura</h2>
			{#if data.articles.length}
				<div class="article-grid">
					{#each data.articles as article (article.id)}
						<article>
							<h3><a href={article.path}>{article.title}</a></h3>
							<p>{article.description}</p>
						</article>
					{/each}
				</div>
			{/if}
			<a class="back-link" href={`/revista?tema=${data.topic.id}`}
				>{data.topic.editorial} <span aria-hidden="true">→</span></a
			>
		</section>
	</div>
</section>

<style>
	.topic-intro {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
	}
	.reading {
		margin-inline: 0;
	}
	.back-link,
	.tool-action,
	.option-action a {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 48px;
	}
	.hub-section {
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid var(--atv-border);
	}
	h2 {
		font: 500 2rem/1.2 var(--atv-font-display);
	}
	h3 {
		font: 500 1.4rem/1.3 var(--atv-font-editorial);
	}
	p {
		line-height: 1.7;
	}
	.section-intro {
		max-width: 44rem;
	}
	.tool-grid,
	.article-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.25rem;
		margin-top: 1.5rem;
	}
	.tool-card {
		padding: 1.5rem;
	}
	.availability {
		font: 500 0.8rem/1.5 var(--atv-font-ui);
	}
	.partial {
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}
	.requirements {
		font-size: 0.9rem;
		color: var(--atv-text-secondary);
	}
	.reading-options {
		margin-block: 1.5rem;
	}
	.reading-option {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 11rem;
		gap: 2rem;
		padding-block: 1.5rem;
		border-top: 1px solid var(--atv-border);
	}
	.reading-option h3 {
		margin-top: 0;
	}
	.option-action {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: center;
	}
	@media (max-width: 650px) {
		.topic-intro {
			flex-direction: column;
			align-items: flex-start;
		}
		.tool-grid,
		.article-grid,
		.reading-option {
			grid-template-columns: 1fr;
		}
		.reading-option {
			gap: 0.5rem;
		}
	}
</style>
