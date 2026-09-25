<script lang="ts">
	import SymbolicIntake from '$lib/components/SymbolicIntake.svelte';
	import { symbolicProduct } from '$lib/symbolic-intake';
	let { data } = $props();
</script>

<svelte:head
	><title>{symbolicProduct(data.productId)?.name} — Novo pedido</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
{#key `${data.ownerId}:${data.productId}`}<SymbolicIntake
		ownerId={data.ownerId}
		productId={data.productId}
		access={data.access}
	/>{/key}
