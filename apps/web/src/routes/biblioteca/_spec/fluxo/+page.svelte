<script lang="ts">
	import ProductRunReader from '$lib/components/ProductRunReader.svelte';
	let { data } = $props();
</script>

<svelte:head
	><title>Leitor de fluxo — referência local</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<ProductRunReader {data} />
