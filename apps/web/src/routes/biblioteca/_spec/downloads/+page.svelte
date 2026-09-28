<script lang="ts">
	import ProductRunReader from '$lib/components/ProductRunReader.svelte';
	let { data } = $props();
</script>

<svelte:head
	><title>Downloads — teste sintético local</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<p>
	Teste sintético local de transporte. Não é uma leitura homologada. As APIs reais continuam
	exigindo autenticação e liberação.
</p>
<ProductRunReader {data} />
<a href="/biblioteca/_spec">Sair do teste local</a>
