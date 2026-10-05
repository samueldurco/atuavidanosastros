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
		{#if data.tiktokNotice}<p class="notice" role="status">
				TikTok conectado e perfil verificado.
			</p>{/if}
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
		<section class="card panel integration" aria-labelledby="tiktok-heading">
			<div>
				<p class="eyebrow">Login Kit · Identificação básica</p>
				<h2 id="tiktok-heading">TikTok</h2>
				{#if data.tiktokConnection}
					<p><strong>{data.tiktokConnection.display_name}</strong> está conectado.</p>
					<p class="muted">
						Perfil autorizado; tokens armazenados de forma cifrada. Publicação ainda indisponível.
					</p>
				{:else if data.tiktokConfigured}
					<p>Credenciais configuradas. Falta autorizar a conta do TikTok.</p>
				{:else}
					<p>Configuração de credenciais pendente no ambiente seguro.</p>
				{/if}
			</div>
			{#if data.tiktokConfigured}
				<a class="button" href="/api/integrations/tiktok/connect">
					{data.tiktokConnection ? 'Reconectar TikTok' : 'Conectar TikTok'}
				</a>
			{/if}
		</section>
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
	.integration {
		margin-block: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
	}
	.integration h2 {
		margin-top: 0;
	}
	.integration strong {
		font-size: inherit;
	}
	.notice {
		padding: 0.8rem 1rem;
		border: 1px solid var(--atv-color-border, currentColor);
		border-radius: 0.75rem;
	}
	.muted {
		opacity: 0.75;
	}
	@media (max-width: 48rem) {
		.integration {
			align-items: stretch;
			flex-direction: column;
		}
	}
</style>
