<script lang="ts">
	import { interestNavigation } from '$lib/data/public-navigation';
	let { data } = $props();
</script>

<section class="section">
	<div class="reading">
		<p class="eyebrow">Para entender e explorar</p>
		<h1 class="h1">
			{data.selected ? `Revista ATVNA: ${data.topics[0].label}` : 'Revista ATVNA'}
		</h1>
		<p class="lead">Escolha um assunto e encontre os guias completos para continuar sua leitura.</p>
		<nav class="topics" aria-label="Assuntos dos artigos">
			<a href="/caderno" aria-current={!data.selected ? 'page' : undefined}>Todos os temas</a>
			{#each interestNavigation as item (item.id)}<a
					href={`/caderno?tema=${item.id}`}
					aria-current={data.selected === item.id ? 'page' : undefined}>{item.label}</a
				>{/each}
		</nav>
		{#each data.topics as topic (topic.id)}
			<section class="topic" aria-labelledby={`topic-${topic.id}`}>
				<h2 id={`topic-${topic.id}`}>{topic.label}</h2>
				<div class="article-list">
					{#each topic.articles as article (article.id)}
						<article class="card published-guide">
							<p class="eyebrow">Guia</p>
							<h3><a href={article.path}>{article.title}</a></h3>
							<p>{article.description}</p>
						</article>
					{/each}
				</div>
				{#each topic.sections as section (section.title)}
					<article>
						<h3>{section.title}</h3>
						{#each section.paragraphs as paragraph, index (index)}<p>{paragraph}</p>{/each}
					</article>
				{/each}
				{#if topic.id === 'proposito'}
					<div class="guides">
						<a href="/vocacao-no-mapa-astral">Vocação no mapa astral →</a>
						<a href="/carreira-no-mapa-astral">Carreira no mapa astral →</a>
						<a href="/casa-10">Casa 10: carreira e reconhecimento →</a>
					</div>
				{/if}
			</section>
		{/each}
	</div>
</section>

<style>
	.topics {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-block: 2rem;
	}
	.topics a {
		display: flex;
		align-items: center;
		min-height: 44px;
		padding: 0.5rem 0.9rem;
		border: 1px solid var(--atv-border);
		border-radius: 999px;
		font: 500 0.85rem var(--atv-font-ui);
		text-decoration: none;
	}
	.topics a[aria-current='page'] {
		background: var(--atv-action);
		color: var(--atv-paper-0);
	}
	:global([data-theme='night']) .topics a[aria-current='page'] {
		color: var(--atv-night-950);
	}
	.topic {
		padding-block: 1.5rem;
		border-top: 1px solid var(--atv-border);
	}
	.article-list {
		display: grid;
		gap: 1rem;
		margin-block: 1.5rem;
	}
	.published-guide {
		padding: 1.5rem;
	}
	.published-guide a {
		display: block;
		min-height: 44px;
	}
	h2 {
		font: 500 2rem/1.2 var(--atv-font-display);
	}
	h3 {
		font: 500 1.35rem/1.4 var(--atv-font-editorial);
	}
	article p {
		line-height: 1.8;
		color: var(--atv-text-secondary);
	}
	.guides {
		display: grid;
		gap: 0.5rem;
		margin-top: 1.5rem;
	}
	.guides a {
		min-height: 44px;
		display: flex;
		align-items: center;
	}
</style>
