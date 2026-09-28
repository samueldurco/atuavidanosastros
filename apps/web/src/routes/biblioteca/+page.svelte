<script lang="ts">
	import LibraryCollection from '$lib/components/LibraryCollection.svelte';
	import type { LibraryPageData } from '$lib/library-page';
	let { data }: { data: LibraryPageData } = $props();
</script>

<LibraryCollection {data} />
