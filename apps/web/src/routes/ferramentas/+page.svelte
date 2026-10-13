<script lang="ts">
	let { data } = $props();
</script>

<section class="section">
	<div class="container">
		<div class="reading intro">
			<p class="eyebrow">Experimente um assunto</p>
			<h1 class="h1">Ferramentas grátis</h1>
			<p class="lead">
				Escolha uma ferramenta para começar. Você encontra aqui o que ela faz, os dados necessários
				e sua disponibilidade.
			</p>
		</div>
		<div class="tools-grid">
			{#each data.tools as tool (tool.id)}
				{@const topic = data.topics.find((item) => item.id === tool.topicId)}
				<article class="card tool-card">
					<p class="eyebrow">{topic?.label}</p>
					<h2><a href={tool.href}>{tool.label}</a></h2>
					<p class="availability" class:partial={tool.availability === 'partial'}>
						{tool.availabilityLabel}
					</p>
					<p>{tool.description}</p>
					<p class="requirements">{tool.requirements}</p>
					<a class="tool-action" href={tool.href}>{tool.action} <span aria-hidden="true">→</span></a
					>
					{#if topic}<a class="topic-link" href={topic.href}
							>Explorar {topic.label.toLowerCase()} <span aria-hidden="true">→</span></a
						>{/if}
				</article>
			{/each}
		</div>
	</div>
</section>

<style>
	.intro {
		margin-inline: 0;
		margin-bottom: 2.5rem;
	}
	.tools-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.25rem;
	}
	.tool-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding: 1.5rem;
	}
	h2 {
		font: 500 1.6rem/1.25 var(--atv-font-display);
		margin-block: 0.5rem;
	}
	h2 a {
		text-decoration: none;
	}
	p {
		line-height: 1.7;
	}
	.availability {
		font: 500 0.8rem/1.5 var(--atv-font-ui);
	}
	.partial {
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}
	.requirements {
		color: var(--atv-text-secondary);
		font-size: 0.9rem;
	}
	.tool-action,
	.topic-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 48px;
	}
	.tool-action {
		margin-top: auto;
	}
	.topic-link {
		font-size: 0.85rem;
	}
	@media (max-width: 650px) {
		.tools-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
