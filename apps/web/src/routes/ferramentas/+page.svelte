<script lang="ts">
	import FreeToolsCollection from '$lib/components/free-tools/FreeToolsCollection.svelte';
	let { data } = $props();
</script>

<section class="section tools-intro">
	<div class="container reading">
		<p class="eyebrow">Uma primeira descoberta</p>
		<h1 class="h1">Ferramentas grátis</h1>
		<p class="lead">
			Escolha um assunto e experimente aqui mesmo. Abra uma ferramenta, informe seus dados e veja o
			resultado. Você pode criar sua conta depois, se quiser salvar.
		</p>
	</div>
</section>
<FreeToolsCollection />
<section class="section">
	<div class="container topics">
		<h2 class="h2">Continue pelo seu assunto</h2>
		<nav aria-label="Universos do ATVNA">
			{#each data.topics as topic (topic.id)}
				<a class="btn btn-secondary" href={topic.href}>{topic.label}</a>
			{/each}
		</nav>
	</div>
</section>

<style>
	.tools-intro {
		padding-bottom: 0;
	}
	.tools-intro .reading {
		margin-inline: auto;
		text-align: center;
	}
	.topics {
		text-align: center;
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		justify-content: center;
		margin-top: 1.5rem;
	}
</style>
