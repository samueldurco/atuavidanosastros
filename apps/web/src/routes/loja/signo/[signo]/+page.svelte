<script lang="ts">
	let { data } = $props();
</script>

<svelte:head
	><title>{data.name} na Loja dos Signos — em preparação</title><meta
		name="robots"
		content="noindex,follow"
	/><meta
		name="description"
		content={`Livros e objetos inspirados em ${data.name}. Página da loja em preparação.`}
	/><link
		rel="canonical"
		href={`https://atuavidanosastros.com.br/loja/signo/${data.slug}`}
	/></svelte:head
>
<section class="section">
	<div class="reading">
		<span class="status">Em preparação</span>
		<p class="eyebrow">Loja dos Signos</p>
		<h1 class="h1">{data.name} na Loja dos Signos</h1>
		<p class="lead">
			Estamos preparando uma seleção de livros e objetos inspirados em {data.name}. As compras ainda
			não estão disponíveis.
		</p>
		<a class="button secondary" href="/loja">Voltar à Loja dos Signos</a>
	</div>
</section>
