<script lang="ts">
	let { data } = $props();
</script>

<svelte:head
	><title>Biblioteca — A Tua Vida nos Astros</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<section class="section">
	<div class="container">
		<p class="eyebrow">Biblioteca</p>
		<h1 class="h1">Tudo o que é seu, recuperável e versionado.</h1>
		{#if data.items.length}
			<div class="collection" aria-label="Itens salvos">
				{#each data.items as item (item.id)}
					<article class="card item">
						<p class="eyebrow">{item.universe} · {item.item_type}</p>
						<h2>{item.title}</h2>
						<p>
							Disponível na sua Biblioteca desde
							{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(
								new Date(item.created_at)
							)}.
						</p>
					</article>
				{/each}
			</div>
		{:else}
			<div class="card empty">
				<img src="/brand/logo/monogram/atv-monogram.svg" alt="" width="256" height="256" />
				<h2>Sua Biblioteca ainda está vazia.</h2>
				<p>
					Quando você salvar uma ferramenta ou receber um produto, ele aparecerá aqui com histórico,
					formato e opções de acesso.
				</p>
				<a class="button" href="/meu-ceu">Explorar o Meu Céu</a>
			</div>
		{/if}
	</div>
</section>

<style>
	.empty {
		padding: clamp(2rem, 6vw, 5rem);
		text-align: center;
	}
	.empty img {
		width: 5rem;
	}
	.empty h2 {
		font: 500 2rem var(--atv-font-display);
	}
	.collection {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 1rem;
		margin-top: 2rem;
	}
	.item {
		padding: 1.5rem;
	}
	.item h2 {
		margin: 0.5rem 0;
		font: 500 1.65rem var(--atv-font-display);
	}
	.item p:last-child {
		color: var(--atv-text-secondary);
		font-family: var(--atv-font-editorial);
	}
</style>
