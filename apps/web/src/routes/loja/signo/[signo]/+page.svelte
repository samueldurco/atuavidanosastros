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
<section class="section sign-page">
	<div class="reading">
		<a class="back-link" href="/loja">← Loja dos Signos</a>
		<span class="status">Em preparação</span>
		<p class="eyebrow">Curadoria por signo</p>
		<h1 class="h1">{data.name} na Loja dos Signos</h1>
		<p class="lead">
			Esta página apresenta o caminho para uma futura seleção editorial. Ainda não há produtos,
			preços ou disponibilidade publicados para {data.name}.
		</p>
		<div class="preparation-detail">
			<p class="eyebrow">Antes da publicação</p>
			<p>
				A curadoria depende de itens reais, fornecedores verificados e políticas comerciais
				completas. O signo organiza a navegação; ele não define suas preferências ou necessidades.
			</p>
		</div>
		<a class="button secondary" href="/loja">Voltar à Loja dos Signos</a>
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
