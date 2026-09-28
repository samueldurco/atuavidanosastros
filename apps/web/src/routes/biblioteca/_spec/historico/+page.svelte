<script lang="ts">
	import Library from '$lib/components/LibraryCollection.svelte';
	import { libraryPageHref, type LibraryPageData } from '$lib/library-page';
	let { data }: { data: LibraryPageData } = $props();
	const pageHref = (before: string | null) =>
		libraryPageHref(before).replace('/biblioteca', '/biblioteca/_spec/historico');
</script>

<p>Laboratório local: duas páginas reduzidas de dados sintéticos; sem acervo real.</p>
<Library {data} {pageHref} />
