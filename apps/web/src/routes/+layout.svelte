<script lang="ts">
	import '../app.css';
	import '$lib/styles/visual-v4-reference.css';
	import '$lib/styles/visual-v4.css';
	import { visualContext } from '$lib/data/visual-v4';
	import V4Backdrop from '$lib/components/V4Backdrop.svelte';
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
	<link
		rel="icon"
		href="/brand/v4/MARCA/KIT_A_V001/vetores/atvna-micro-32.svg"
		type="image/svg+xml"
	/>
	<link rel="apple-touch-icon" href="/brand/v4/MARCA/KIT_A_V001/exports/atvna-micro-180.png" />
	<link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>

<a class="skip-link" href="#conteudo">Ir para o conteúdo</a>
<div
	class="v4-experience"
	class:v4-home={visual.home}
	class:v4-internal={!visual.home}
	class:universe-material={!!visual.universe}
	data-universe={visual.universe}
>
	<V4Backdrop universe={visual.universe} />
	{#if member}<AuthenticatedShell>{@render children()}</AuthenticatedShell>{:else}<PublicShell
			>{@render children()}</PublicShell
		>{/if}
	<ConsentBanner />
</div>
