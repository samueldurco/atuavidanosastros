<script lang="ts">
	import VisualMotif from '$lib/components/VisualMotif.svelte';
	let { data } = $props();
</script>

<section class="section">
	<div class="container">
		<div class="reading intro">
			<p class="eyebrow">Explore por assunto</p>
			<h1 class="h1">Por onde você quer começar?</h1>
			<p class="lead">
				Cada tema reúne ferramentas grátis, leituras para comparar e artigos para entender melhor o
				assunto.
			</p>
		</div>
		<div class="topic-grid">
			{#each data.topics as topic (topic.id)}
				<article class="card topic-card">
					<VisualMotif identity={topic.id} />
					<h2><a href={topic.href}>{topic.label}</a></h2>
					<p>{topic.description}</p>
					<a class="topic-action" href={topic.href}
						>Explorar este tema <span aria-hidden="true">→</span></a
					>
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
	.topic-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1.25rem;
	}
	.topic-card {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}
	h2 {
		font: 500 1.65rem/1.2 var(--atv-font-display);
	}
	h2 a {
		text-decoration: none;
	}
	p {
		line-height: 1.7;
	}
	.topic-action {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 48px;
		margin-top: auto;
	}
	@media (max-width: 900px) {
		.topic-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 540px) {
		.topic-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
