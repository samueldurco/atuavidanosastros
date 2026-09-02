<script lang="ts">
	let { data } = $props();
</script>

<svelte:head
	><title>Operação — A Tua Vida nos Astros</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<section class="section">
	<div class="container">
		<p class="eyebrow">Backoffice restrito</p>
		<h1 class="h1">Operação</h1>
		<div class="grid grid-3">
			<article class="card panel">
				<h2>Produtos</h2>
				<strong>{data.products.length}</strong>
				<p>Catálogo versionado; publicação depende dos gates comerciais.</p>
			</article>
			<article class="card panel">
				<h2>Feature flags</h2>
				<strong>{data.flags.length}</strong>
				<p>Defaults seguros e desligados.</p>
			</article>
			<article class="card panel">
				<h2>Webhook inbox</h2>
				<strong>{data.inbox.length}</strong>
				<p>Últimos eventos, sem exibir payload sensível.</p>
			</article>
		</div>
		<h2>Estado do catálogo</h2>
		<ul>
			{#each data.products as product (product.id)}<li>
					<strong>{product.title}</strong> — {product.state}
				</li>{/each}
		</ul>
	</div>
</section>

<style>
	.panel {
		padding: 1.5rem;
	}
	.panel h2 {
		font: 500 1.5rem var(--atv-font-display);
	}
	.panel strong {
		font-size: 2rem;
	}
</style>
