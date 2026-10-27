<script lang="ts">
	import { visibleShopCollections } from '$lib/data/shop-collections';
	let { current = '' }: { current?: string } = $props();
	const accessories = visibleShopCollections.find((collection) => collection.slug === 'acessorios');
	const themedCollections = visibleShopCollections.filter(
		(collection) => collection.slug !== 'acessorios' && !collection.href.includes('/signo/')
	);
	const signs = visibleShopCollections.filter((collection) => collection.href.includes('/signo/'));
</script>

<nav class="collections-nav" aria-label="Coleções da Loja dos Signos">
	<a href="/loja" aria-current={current === '' ? 'page' : undefined}>Todas as peças</a>
	{#if accessories}
		<a href={accessories.href} aria-current={current === accessories.slug ? 'page' : undefined}
			>Acessórios <span>({accessories.products.length})</span></a
		>
	{/if}
	{#each themedCollections as collection (collection.id)}
		<a href={collection.href} aria-current={current === collection.slug ? 'page' : undefined}
			>{collection.name} <span>({collection.products.length})</span></a
		>
	{/each}
	<details>
		<summary>Coleções por signo</summary>
		<div class="sign-collections">
			{#each signs as collection (collection.id)}
				<a href={collection.href} aria-current={current === collection.slug ? 'page' : undefined}
					>{collection.name} <span>({collection.products.length})</span></a
				>
			{/each}
		</div>
	</details>
</nav>

<style>
	.collections-nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.5rem;
		align-items: start;
		margin-block: 1.5rem;
	}
	.collections-nav a,
	summary {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		font-size: 0.9rem;
		font-weight: 600;
	}
	a[aria-current='page'] {
		text-decoration-thickness: 2px;
		text-underline-offset: 0.3em;
	}
	a span {
		margin-left: 0.3em;
		font-weight: 400;
	}
	summary {
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}
	summary::after {
		content: '＋';
		margin-left: 0.65rem;
	}
	details[open] summary::after {
		content: '−';
	}
	.sign-collections {
		display: flex;
		flex-wrap: wrap;
		gap: 0 1.2rem;
		max-width: 48rem;
		padding: 0.75rem 0;
	}
</style>
