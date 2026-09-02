<script lang="ts">
	import '../app.css';
	import ConsentBanner from '$lib/components/ConsentBanner.svelte';
	import PublicHeader from '$lib/components/PublicHeader.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/brand/icons/favicon.svg" />
	<link rel="apple-touch-icon" href="/brand/icons/apple-touch-icon.png" />
	<link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>

<a class="skip-link" href="#conteudo">Ir para o conteúdo</a>
<PublicHeader />
<main id="conteudo">{@render children()}</main>
<SiteFooter />
<ConsentBanner />
