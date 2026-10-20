<script lang="ts">
	import '../app.css';
	import '$lib/styles/mvp-approved.css';
	import '$lib/styles/mvp.css';
	import { visualContext } from '$lib/data/visual-v4';
	import ConsentBanner from '$lib/components/ConsentBanner.svelte';
	import { page } from '$app/state';
	import PublicShell from '$lib/components/shells/PublicShell.svelte';
	import AuthenticatedShell from '$lib/components/shells/AuthenticatedShell.svelte';
	import JourneyShell from '$lib/components/shells/JourneyShell.svelte';
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
	const journey = $derived(page.url.pathname.startsWith('/ofertas/'));
</script>

<SeoHead seo={page.data.seo} />

<svelte:head>
	<link rel="icon" href="/brand/mvp/assets/marca-clara.svg" type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/brand/mvp/icon-192.png" />
	<link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>

<a class="skip-link" href="#conteudo">Ir para o conteúdo</a>
<div
	class="v4-experience mvp-experience"
	class:v4-home={visual.home}
	class:v4-internal={!visual.home}
	class:universe-material={!!visual.universe}
	data-universe={visual.universe}
>
	{#if journey}<JourneyShell>{@render children()}</JourneyShell>{:else if member}<AuthenticatedShell
			>{@render children()}</AuthenticatedShell
		>{:else}<PublicShell>{@render children()}</PublicShell>{/if}
	{#if !journey}<ConsentBanner />{/if}
</div>
