<script lang="ts">
	import EditorialArticle from '$lib/components/EditorialArticle.svelte';
	let { data } = $props();
</script>

<p class="archive-back">
	<a href={data.indexPath}>Voltar ao signo e ao histórico</a>
</p>
<EditorialArticle document={data.document} related={data.related} />

<style>
	.archive-back {
		max-width: 72rem;
		margin: 1.5rem auto 0;
		padding-inline: 1.5rem;
	}
</style>
