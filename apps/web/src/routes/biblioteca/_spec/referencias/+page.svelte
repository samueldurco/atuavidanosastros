<script lang="ts">
	import ReaderContinuity from '$lib/components/ReaderContinuity.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	let changed = $state(false);
	let synthetic = $state(false);
	let revoked = $state(false);
	const run = $derived({
		...data.run,
		id: changed ? '00000000-0000-4000-8000-000000000003' : data.run.id,
		released: !revoked
	});
</script>

<svelte:head
	><title>Referências · teste sintético local</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<h1>Leitor · referência sintética</h1>
<p>
	Fixture local do componente, com transporte interceptado na suíte. Não é autorização de produção.
</p>
<button onclick={() => (changed = !changed)}>Trocar leitura de teste</button>
<button onclick={() => (synthetic = !synthetic)}>Alternar modo sintético</button>
<button onclick={() => (revoked = !revoked)}>Revogar fonte de teste</button>
<ReaderContinuity {run} title="Leitura sintética para continuidade" {synthetic} />
