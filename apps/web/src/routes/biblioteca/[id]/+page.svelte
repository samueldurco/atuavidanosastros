<script lang="ts">
	import CompassReader from '$lib/components/CompassReader.svelte';
	let { data } = $props();
</script>

<svelte:head
	><title>{data.item?.title ?? 'Resultado salvo'} — A Tua Vida nos Astros</title><meta
		name="robots"
		content="noindex,nofollow"
	/><meta name="referrer" content="no-referrer" /></svelte:head
>
<CompassReader {data} />
