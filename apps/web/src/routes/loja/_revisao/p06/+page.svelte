<script lang="ts">
	import P06Collection from '$lib/components/P06Collection.svelte';
	let { data } = $props();
</script>

<svelte:head
	><title>Revisão privada P06 | ATVNA</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<P06Collection products={data.products} review={true} />
