<script lang="ts">
	import ProductEmailRequest from '$lib/components/ProductEmailRequest.svelte';
	import ReadingShell from '$lib/components/shells/ReadingShell.svelte';
	let { data } = $props();
</script>

<svelte:head
	><title>E-mail — referência sintética local</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<ReadingShell contents={[{ id: 'email', label: 'Pedido de e-mail' }]}>
	{#snippet heading()}<h1>Referência sintética local</h1>
		<p>
			Teste de pedidos de e-mail. Não é uma leitura homologada nem um envio real. As APIs continuam
			exigindo autenticação e liberação.
		</p>
	{/snippet}
	{#key `${data.allowNew}:${data.revoked}`}
		<ProductEmailRequest
			ownerId="20000000-0000-4000-8000-000000000001"
			runId="20000000-0000-4000-8000-000000000002"
			revision={4}
			reviewDigest={data.revoked ? null : 'a'.repeat(64)}
			allowNew={data.allowNew}
		/>
	{/key}
</ReadingShell>
