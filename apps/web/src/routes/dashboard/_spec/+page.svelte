<script lang="ts">
	import Dashboard from '$lib/components/Dashboard.svelte';
	import type { AccountRights } from '$lib/account-rights';
	import type { AccountOrders } from '$lib/account-orders';
	let { data } = $props();
	const rights: AccountRights = { status: 'ready', items: [] };
	const orders: AccountOrders = {
		status: 'ready',
		items: [{ productId: 'birth-chart', state: 'APPROVED', createdAt: '2026-10-19T12:00:00Z' }]
	};
</script>

<p role="note">QA local — dados sintéticos; nenhuma conta ou assinatura real.</p>
<Dashboard {data} {rights} {orders} />
