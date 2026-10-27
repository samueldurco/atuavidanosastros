<script lang="ts">
	import { shopPolicyLinks } from '$lib/data/shop-policies';
	let { current }: { current?: string } = $props();
</script>

<nav aria-label="Informações da Loja dos Signos" class="shop-policy-links">
	{#each shopPolicyLinks as policy (policy.href)}
		<a href={policy.href} aria-current={current === policy.href ? 'page' : undefined}
			>{policy.label}</a
		>
	{/each}
</nav>

<style>
	.shop-policy-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.5rem;
		margin-block: 1.5rem;
	}
	a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}
	a[aria-current='page'] {
		font-weight: 600;
	}
</style>
