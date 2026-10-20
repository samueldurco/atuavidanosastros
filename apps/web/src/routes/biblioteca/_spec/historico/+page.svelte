<script lang="ts">
	import Library from '$lib/components/LibraryCollection.svelte';
	import type { AccountRights } from '$lib/account-rights';
	import type { AccountOrders } from '$lib/account-orders';
	import { libraryPageHref, type LibraryPageData } from '$lib/library-page';
	let { data }: { data: LibraryPageData } = $props();
	const rights: AccountRights = { status: 'ready', items: [] };
	const orders: AccountOrders = { status: 'ready', items: [] };
	const pageHref = (before: string | null) =>
		libraryPageHref(before).replace('/biblioteca', '/biblioteca/_spec/historico');
</script>

<p>Laboratório local: duas páginas reduzidas de dados sintéticos; sem acervo real.</p>
<Library {data} {rights} {orders} {pageHref} />
