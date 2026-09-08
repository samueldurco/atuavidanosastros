<script lang="ts">
	import type { Snippet } from 'svelte';
	import PublicHeader from '../PublicHeader.svelte';
	import SiteFooter from '../SiteFooter.svelte';
	let { children }: { children: Snippet } = $props();
</script>

<PublicHeader />
<main id="conteudo" tabindex="-1">{@render children()}</main>
<SiteFooter />
