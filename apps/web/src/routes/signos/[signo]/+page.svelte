<script lang="ts">
	import EditorialArticle from '$lib/components/EditorialArticle.svelte';
	let { data } = $props();
</script>

<EditorialArticle document={data.document} related={data.related} />
