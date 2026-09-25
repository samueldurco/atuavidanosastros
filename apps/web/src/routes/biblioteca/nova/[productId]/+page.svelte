<script lang="ts">
	import SymbolicIntake from '$lib/components/SymbolicIntake.svelte';
	import NatalIntake from '$lib/components/NatalIntake.svelte';
	import { workflowFor } from '@atv/domain';
	import { symbolicProduct } from '$lib/symbolic-intake';
	let { data } = $props();
</script>

<svelte:head
	><title>{workflowFor(data.productId)?.name} — Novo pedido</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
{#key `${data.ownerId}:${data.productId}`}{#if symbolicProduct(data.productId)}<SymbolicIntake
			ownerId={data.ownerId}
			productId={data.productId}
			access={data.access}
		/>{:else}<NatalIntake
			ownerId={data.ownerId}
			productId={data.productId}
			access={data.access}
		/>{/if}{/key}
