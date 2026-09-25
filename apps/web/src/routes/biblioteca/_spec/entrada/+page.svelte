<script lang="ts">
	import SymbolicIntake from '$lib/components/SymbolicIntake.svelte';
	import NatalIntake from '$lib/components/NatalIntake.svelte';
	import { symbolicProduct } from '$lib/symbolic-intake';
	let { data } = $props();
</script>

<svelte:head
	><title>Entrada simbólica — Fixture local</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<p>Fixture local sintética — não é uma leitura ou liberação de produto.</p>
{#key `${data.ownerId}:${data.productId}`}{#if symbolicProduct(data.productId)}<SymbolicIntake
			ownerId={data.ownerId}
			productId={data.productId}
			access={data.access}
		/>{:else}<NatalIntake
			ownerId={data.ownerId}
			productId={data.productId}
			access={data.access}
		/>{/if}{/key}
