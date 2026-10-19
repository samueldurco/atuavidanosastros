<script lang="ts">
	import { page } from '$app/state';
	import Library from '$lib/components/LibraryCollection.svelte';
	import type { AccountRights } from '$lib/account-rights';
	let { data } = $props();
	const emptyRights: AccountRights = { status: 'ready', items: [] };
	const sampleRights: AccountRights = {
		status: 'ready',
		items: [
			{
				productId: 'solar-return',
				state: 'EXPIRED',
				source: 'unknown',
				sourceLabel: 'Acesso registrado',
				startsAt: null,
				endsAt: '2026-09-30T00:00:00Z'
			},
			{
				productId: 'life-atlas',
				state: 'PENDING',
				source: 'purchase',
				sourceLabel: 'Pedido registrado',
				startsAt: null,
				endsAt: null
			},
			{
				productId: 'birth-chart',
				state: 'ACTIVE',
				source: 'purchase',
				sourceLabel: 'Compra confirmada',
				startsAt: null,
				endsAt: null
			}
		]
	};
	const rights = $derived(
		page.url.searchParams.get('rights') === 'sample' ? sampleRights : emptyRights
	);
</script>

<p class="fixture-note">
	Laboratório local: dados sintéticos, sem conexão com o acervo de uma pessoa.
</p>
<Library {data} {rights} />

<style>
	.fixture-note {
		border: 1px solid var(--atv-border);
		padding: 1rem;
		color: var(--atv-text-secondary);
		font-size: 0.8rem;
	}
</style>
