<script lang="ts">
	import { onMount } from 'svelte';
	import { recordHoroscopeOutcome } from '$lib/analytics/home-events';
	import HoroscopeIndex from '$lib/components/HoroscopeIndex.svelte';
	let { data } = $props();
	onMount(() => recordHoroscopeOutcome(Boolean(data.reading), data.temporarilyUnavailable));
</script>

<HoroscopeIndex {data} />
