<script lang="ts">
	import EditorialArticle from '$lib/components/EditorialArticle.svelte';
	import HoroscopeIndex from '$lib/components/HoroscopeIndex.svelte';
	let { data } = $props();
</script>

{#if data.mode === 'article'}
	<EditorialArticle document={data.document} related={data.related} />
{:else}
	<HoroscopeIndex {data} />
{/if}
