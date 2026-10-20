<script lang="ts">
	let { data } = $props();
</script>

<svelte:head
	><title>Produtos físicos de {data.name} · Loja dos Signos — em preparação</title><meta
		name="robots"
		content="noindex,follow"
	/><meta
		name="description"
		content={`Produtos físicos inspirados em ${data.name}. Loja dos Signos em preparação.`}
	/><link
		rel="canonical"
		href={`https://atuavidanosastros.com.br/loja/signo/${data.slug}`}
	/></svelte:head
>
<section class="section sign-page">
	<div class="reading">
		<a class="back-link" href="/loja">← Produtos físicos · Loja dos Signos</a>
		<span class="status">Em preparação</span>
		<p class="eyebrow">Produtos físicos · Loja dos Signos</p>
		<h1 class="h1">{data.name} na Loja dos Signos</h1>
		<p class="lead">
			Estamos preparando uma seleção de livros e objetos inspirados em {data.name}. As compras ainda
			não estão disponíveis.
		</p>
		<div class="preparation-detail">
			<p class="eyebrow">Disponibilidade</p>
			<p>
				Os produtos, os preços e as condições de compra serão exibidos aqui quando a loja estiver
				disponível.
			</p>
		</div>
		<a class="button secondary" href="/loja">Ver todos os produtos físicos</a>
		<p>
			Para mapas, previsões, Tarot e sonhos, <a href="/leituras">consulte as leituras digitais</a>.
		</p>
	</div>
</section>

<style>
	.sign-page .reading {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}
	.back-link {
		margin-bottom: 3rem;
		font-size: 0.875rem;
		font-weight: 700;
		text-decoration: none;
	}
	.sign-page .eyebrow {
		margin-top: 2rem;
	}
	.sign-page .h1 {
		margin: 0;
	}
	.sign-page .lead {
		margin: 1.5rem 0 0;
	}
	.preparation-detail {
		width: 100%;
		margin: 3rem 0 2rem;
		padding: 1.5rem 0;
		border-block: 1px solid var(--atv-border);
	}
	.preparation-detail .eyebrow {
		margin: 0 0 0.75rem;
	}
	.preparation-detail p:last-child {
		max-width: 34rem;
		margin: 0;
		color: var(--atv-text-secondary);
	}
</style>
