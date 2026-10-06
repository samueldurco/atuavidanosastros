<script lang="ts">
	import LibraryCollection from '$lib/components/LibraryCollection.svelte';
	import TrialLibrary from '$lib/components/TrialLibrary.svelte';
	let { data } = $props();
</script>

{#if data.trialLibrary}<TrialLibrary library={data.trialLibrary} />{/if}
<LibraryCollection {data} />
