<script lang="ts">
	import P06Collection from '$lib/components/P06Collection.svelte';
	let { data } = $props();
</script>

<svelte:head>
	<title>Mitos e Emblemas do Zodíaco | Loja dos Signos</title>
	<meta
		name="description"
		content="Composições autorais inspiradas em tradições greco-romanas do zodíaco, em bordado e impressão digital."
	/>
	<link rel="canonical" href="https://atuavidanosastros.com.br/loja/mitos-emblemas" />
</svelte:head>
<P06Collection products={data.products} review={false} />
