<script lang="ts">
	import ProductArtifacts from '$lib/components/ProductArtifacts.svelte';
	import ReadingShell from '$lib/components/shells/ReadingShell.svelte';
	let { data } = $props();
</script>

<svelte:head
	><title>Arquivos — referência sintética local</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<ReadingShell contents={[{ id: 'arquivos', label: 'Arquivos guardados' }]}>
	{#snippet heading()}<h1>Referência sintética local</h1>
		<p>
			Teste de recuperação. Não é uma leitura homologada. As APIs reais continuam exigindo
			autenticação e liberação.
		</p>{/snippet}
	<ProductArtifacts run={data.run} />
</ReadingShell>
