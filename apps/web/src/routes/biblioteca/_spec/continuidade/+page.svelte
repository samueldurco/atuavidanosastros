<script lang="ts">
	import ContinuityManager from '$lib/components/ContinuityManager.svelte';
	const sources = [
		{
			id: '00000000-0000-4000-8000-000000000002',
			source_id: '00000000-0000-4000-8000-000000000001',
			title: 'Leitura sintética para continuidade',
			item_type: 'PRODUCT_RUN'
		}
	];
</script>

<svelte:head
	><title>Continuidade · referência sintética</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<h1>Biblioteca · referência sintética</h1>
<ContinuityManager {sources} />
