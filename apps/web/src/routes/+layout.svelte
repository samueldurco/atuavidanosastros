<script lang="ts">
	import '../app.css';
	import '$lib/styles/visual-v3.css';
	import { visualContext } from '$lib/data/visual-v3';
	import ConsentBanner from '$lib/components/ConsentBanner.svelte';
	import { page } from '$app/state';
	import PublicShell from '$lib/components/shells/PublicShell.svelte';
	import AuthenticatedShell from '$lib/components/shells/AuthenticatedShell.svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	let { children } = $props();
	const visual = $derived(
		visualContext(
			page.url.pathname,
			page.url.search,
			page.data.product?.id || page.data.saved?.product_id || page.data.run?.productId
		)
	);
	const reader = $derived(
		/^\/biblioteca\/(?:[0-9a-f-]{36}|_spec\/leitor)\/?$/i.test(page.url.pathname)
	);
	const member = $derived(
		!reader &&
			['/dashboard', '/biblioteca', '/conta'].some(
				(path) => page.url.pathname === path || page.url.pathname.startsWith(`${path}/`)
			)
	);
</script>

<SeoHead seo={page.data.seo} />

<svelte:head>
	<link rel="icon" href="/brand/icons/favicon.svg" />
	<link rel="apple-touch-icon" href="/brand/icons/apple-touch-icon.png" />
	<link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>

<a class="skip-link" href="#conteudo">Ir para o conteúdo</a>
<div
	class="v3-experience"
	data-v3-theme={visual.universe}
	data-v3-dense={visual.dense}
	style={`--v3-left:url('${visual.theme.left}');--v3-right:url('${visual.theme.right}');--v3-top:url('${visual.theme.top}');--v3-bottom:url('${visual.theme.bottom}');--v3-divider:url('${visual.theme.divider}')`}
>
	<div class="v3-margins" aria-hidden="true"></div>
	{#if member}<AuthenticatedShell>{@render children()}</AuthenticatedShell>{:else}<PublicShell
			>{@render children()}</PublicShell
		>{/if}
	<ConsentBanner />
</div>
