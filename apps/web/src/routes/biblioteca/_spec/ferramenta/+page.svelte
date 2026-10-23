<script lang="ts">
	import LibraryReader from '../../[id]/+page.svelte';
	let { data } = $props();
</script>

<LibraryReader {data} />
