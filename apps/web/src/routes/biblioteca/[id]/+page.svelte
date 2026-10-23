<script lang="ts">
	import CompassReader from '$lib/components/CompassReader.svelte';
	import ProductRunReader from '$lib/components/ProductRunReader.svelte';
	import FreeToolResultReader from '$lib/components/FreeToolResultReader.svelte';
	let { data } = $props();
</script>

<svelte:head
	><title>{data.item?.title ?? 'Resultado salvo'} — A Tua Vida nos Astros</title><meta
		name="robots"
		content="noindex,nofollow"
	/><meta name="referrer" content="no-referrer" /></svelte:head
>
{#if data.state === 'free-tool'}<FreeToolResultReader
		result={data.result}
		libraryBefore={data.libraryBefore}
	/>{:else if data.state === 'workflow'}<ProductRunReader
		{data}
		libraryBefore={data.libraryBefore}
	/>{:else}<CompassReader {data} libraryBefore={data.libraryBefore} />{/if}
