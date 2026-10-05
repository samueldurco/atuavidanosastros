<script lang="ts">
	import ContinuityManager from './ContinuityManager.svelte';
	import { readerContinuityReferences } from '$lib/reader-continuity';
	import type { ProductRunView } from '$lib/product-run';
	let {
		run,
		title,
		synthetic = false,
		ownerId
	}: { run: ProductRunView; title: string; synthetic?: boolean; ownerId?: string } = $props();
	const references = $derived(readerContinuityReferences(run));
</script>

{#if !synthetic && run.released && run.state === 'READY' && run.editorial && run.calculation}
	{#key `${ownerId}:${run.id}:${run.revision}:${run.editorial.reviewDigest}`}
		<details class="reader-continuity" data-stitch="MEM-03 SH-03">
			<summary>Salvar trechos nos meus registros</summary>
			<p>
				Escolha os trechos desta leitura que você quer consultar depois. As opções disponíveis
				aparecem abaixo.
			</p>
			<ContinuityManager
				sources={[
					{ id: run.libraryItemId ?? run.id, source_id: run.id, title, item_type: 'PRODUCT_RUN' }
				]}
				{references}
			/>
		</details>
	{/key}
{/if}

<style>
	.reader-continuity {
		margin-block: 2rem;
		border-block: 1px solid var(--atv-border);
		padding-block: 1rem;
		overflow-wrap: anywhere;
	}
	summary {
		cursor: pointer;
		min-height: 44px;
		padding-block: 0.75rem;
		font-weight: 600;
	}
	summary:focus-visible {
		outline: 2px solid var(--atv-focus);
		outline-offset: 4px;
	}
</style>
