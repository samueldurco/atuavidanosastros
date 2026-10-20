<script lang="ts">
	import MvpUniverseCard from '$lib/components/MvpUniverseCard.svelte';
	import { mvpArt } from '$lib/data/mvp-visual';
	let { data } = $props();
</script>

<div class="mvp-public">
	<section class="universes-overview-hero">
		<div class="wrap universes-overview-copy">
			<p class="eyebrow">Os seis universos</p>
			<h1>Um céu, diferentes caminhos.</h1>
			<p class="lead">
				Mapa astral, previsões, amor, carreira, Tarot e sonhos. Cada tema reúne ferramentas grátis,
				leituras digitais para comparar e artigos para entender melhor o assunto.
			</p>
		</div>
	</section>
	<section class="wrap section" aria-labelledby="topics-heading">
		<header class="chapter-opening">
			<p class="eyebrow">Escolha seu assunto</p>
			<img
				class="chapter-lettering"
				src={mvpArt('lettering-descoberta')}
				alt="Descoberta"
				width="720"
				height="245"
				loading="lazy"
			/>
			<h2 id="topics-heading">Por onde você quer começar?</h2>
		</header>
		<div class="grid grid-3">
			{#each data.topics as topic (topic.id)}
				<MvpUniverseCard
					identity={topic.id}
					title={topic.label}
					description={topic.description}
					href={topic.href}
				/>
			{/each}
		</div>
		<p class="catalog-link">
			<a class="text-link" href="/leituras"
				>Ver o catálogo de leituras digitais <span aria-hidden="true">↗</span></a
			>
		</p>
	</section>
</div>

<style>
	.catalog-link {
		margin-top: 2rem;
		text-align: center;
	}
</style>
