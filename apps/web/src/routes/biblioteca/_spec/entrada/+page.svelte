<script lang="ts">
	import SymbolicIntake from '$lib/components/SymbolicIntake.svelte';
	let { data } = $props();
</script>

<svelte:head
	><title>Entrada simbólica — Fixture local</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<p>Fixture local sintética — não é uma leitura ou liberação de produto.</p>
{#key `${data.ownerId}:${data.productId}`}<SymbolicIntake
		ownerId={data.ownerId}
		productId={data.productId}
		access={data.access}
	/>{/key}
