<script lang="ts">
	import HoroscopeIndex from '$lib/components/HoroscopeIndex.svelte';
	let { data } = $props();
</script>

<HoroscopeIndex {data} />
