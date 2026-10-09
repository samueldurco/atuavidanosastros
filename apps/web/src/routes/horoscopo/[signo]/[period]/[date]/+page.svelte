<script lang="ts">
	import EditorialArticle from '$lib/components/EditorialArticle.svelte';
	let { data } = $props();
</script>

<p class="archive-back">
	<a
		href={`/horoscopo/${data.document.path.split('/')[2]}?period=${data.document.path.split('/')[3]}`}
		>Voltar ao signo e ao histórico</a
	>
</p>
<EditorialArticle document={data.document} related={data.related} />

<style>
	.archive-back {
		max-width: 72rem;
		margin: 1.5rem auto 0;
		padding-inline: 1.5rem;
	}
</style>
