<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { bindHomeEventClicks } from '$lib/analytics/home-events';
	import PublicHeader from '../PublicHeader.svelte';
	import SiteFooter from '../SiteFooter.svelte';
	let { children }: { children: Snippet } = $props();
	onMount(() => bindHomeEventClicks(document));
</script>

<PublicHeader />
<main id="conteudo" tabindex="-1">{@render children()}</main>
<SiteFooter />
