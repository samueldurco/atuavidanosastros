<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title
		>{page.status === 404 ? 'Página não encontrada' : 'Não foi possível carregar a página'} — A Tua Vida
		nos Astros</title
	>
</svelte:head>

<section class="section">
	<div class="reading">
		<h1 class="h1">{page.status}</h1>
		<p class="lead">{page.error?.message ?? 'Não foi possível carregar esta página.'}</p>
		<a class="button" href="/">Voltar ao início</a>
	</div>
</section>
