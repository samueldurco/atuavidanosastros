<script lang="ts">
	import ReprocessAction from '$lib/components/ReprocessAction.svelte';
	import ReadingShell from '$lib/components/shells/ReadingShell.svelte';
	import PageIntro from '$lib/components/ui/PageIntro.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	let { data } = $props();
	let busy = $state(false);
</script>

<svelte:head
	><title>Recuperação — referência local</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<ReadingShell contents={[{ id: 'continuidade', label: 'Continuidade' }]}>
	{#snippet heading()}
		<PageIntro
			eyebrow="Referência sintética local"
			title="Retome o pedido original"
			description="Validação da recuperação. Não representa um produto liberado nem uma leitura homologada."
		/>
	{/snippet}
	<section id="continuidade">
		<h2>Uma nova versão, sem perder a anterior</h2>
		<p>
			Uma resposta interrompida não confirma uma falha. Consulte o pedido original antes de
			continuar.
		</p>
		<ReprocessAction
			runId="10000000-0000-4000-8000-000000000001"
			productId="daily-card"
			allowed={data.allowed}
			onBusyChange={(active) => (busy = active)}
		/>
		<Button variant="tertiary" disabled={busy}>Outra ação local</Button>
	</section>
</ReadingShell>
