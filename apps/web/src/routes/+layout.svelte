<script lang="ts">
	import '../app.css';
	import ConsentBanner from '$lib/components/ConsentBanner.svelte';
	import { page } from '$app/state';
	import PublicShell from '$lib/components/shells/PublicShell.svelte';
	import AuthenticatedShell from '$lib/components/shells/AuthenticatedShell.svelte';
	let { children } = $props();
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

<svelte:head>
	<link rel="icon" href="/brand/icons/favicon.svg" />
	<link rel="apple-touch-icon" href="/brand/icons/apple-touch-icon.png" />
	<link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>

<a class="skip-link" href="#conteudo">Ir para o conteúdo</a>
{#if member}<AuthenticatedShell>{@render children()}</AuthenticatedShell>{:else}<PublicShell
		>{@render children()}</PublicShell
	>{/if}
<ConsentBanner />
