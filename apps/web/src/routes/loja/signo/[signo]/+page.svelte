<script lang="ts">
	let { data } = $props();
</script>

<svelte:head
	><title>{data.name} na Loja dos Signos — em preparação</title><meta
		name="robots"
		content="noindex,follow"
	/><meta
		name="description"
		content={`A futura curadoria de ${data.name} está em preparação, sem produtos ou ofertas publicados.`}
	/><link
		rel="canonical"
		href={`https://atuavidanosastros.com.br/loja/signo/${data.slug}`}
	/></svelte:head
>
<section class="section">
	<div class="reading">
		<span class="status">Em preparação</span>
		<p class="eyebrow">Loja dos Signos</p>
		<h1 class="h1">Uma curadoria para {data.name}, no tempo certo.</h1>
		<p class="lead">
			Este espaço receberá uma seleção editorial quando existirem produtos reais, fornecedores
			verificados e políticas comerciais completas. Até lá, não exibimos vitrines vazias nem ofertas
			fictícias.
		</p>
		<a class="button secondary" href="/loja">Voltar à Loja dos Signos</a>
	</div>
</section>
