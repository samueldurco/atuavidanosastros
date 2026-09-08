<script lang="ts">
	import CompassReader from '$lib/components/CompassReader.svelte';
	let { data } = $props();
</script>

<svelte:head
	><title>Leitor sintético local — ATV</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<CompassReader {data} />
