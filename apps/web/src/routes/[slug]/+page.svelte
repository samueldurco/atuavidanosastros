<script lang="ts">
	let { data } = $props();
</script>

<svelte:head
	><title>{data.page.title} — A Tua Vida nos Astros</title><meta
		name="description"
		content={data.page.description}
	/><link rel="canonical" href={`https://atuavidanosastros.com.br/${data.slug}`} /></svelte:head
>
<section class="section">
	<div class="reading">
		<p class="eyebrow">{data.page.eyebrow}</p>
		<h1 class="h1">{data.page.title}</h1>
		<p class="lead">{data.page.description}</p>
		<div class="card note">
			<h2>Uma leitura começa por uma boa pergunta</h2>
			<p>
				Estamos preparando experiências que combinam cálculo reproduzível, conteúdo editorial e
				espaço para a sua própria interpretação. Quando um dado ainda não estiver disponível, vamos
				dizer com clareza.
			</p>
		</div>
		<a class="button" href={data.slug === 'proposito' ? '/mapa-de-proposito' : '/entrar'}
			>{data.page.cta}</a
		>
	</div>
</section>

<style>
	.note {
		padding: 1.5rem;
		margin: 2.5rem 0;
	}
	.note h2 {
		font: 500 1.7rem var(--atv-font-display);
		margin-top: 0;
	}
</style>
