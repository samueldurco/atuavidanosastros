<script lang="ts">
	import ProductRunReader from '$lib/components/ProductRunReader.svelte';
	import { page } from '$app/state';
	import { libraryReturnCursor } from '$lib/library-page';
	let { data } = $props();
</script>

<svelte:head
	><title>Leitor de fluxo — referência local</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<ProductRunReader {data} libraryBefore={libraryReturnCursor(page.url.searchParams)} />
