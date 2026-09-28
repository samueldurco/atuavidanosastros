<script lang="ts">
	import CompassReader from '$lib/components/CompassReader.svelte';
	import { page } from '$app/state';
	import { libraryReturnCursor } from '$lib/library-page';
	let { data } = $props();
</script>

<svelte:head
	><title>Leitor sintético local — ATV</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<CompassReader {data} libraryBefore={libraryReturnCursor(page.url.searchParams)} />
