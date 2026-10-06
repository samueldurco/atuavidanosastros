<script lang="ts">
	import Dashboard from '$lib/components/Dashboard.svelte';
	import TrialLibrary from '$lib/components/TrialLibrary.svelte';
	let { data } = $props();
</script>

{#if data.trialLibrary}<TrialLibrary library={data.trialLibrary} />{/if}
<Dashboard {data} />
