<script lang="ts">
	import Dashboard from '$lib/components/Dashboard.svelte';
	import type { AccountRights } from '$lib/account-rights';
	let { data } = $props();
	const rights: AccountRights = { status: 'ready', items: [] };
</script>

<p role="note">QA local — dados sintéticos; nenhuma conta ou assinatura real.</p>
<Dashboard {data} {rights} />
