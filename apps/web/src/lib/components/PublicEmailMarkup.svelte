<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<!-- Static Cloudflare opt-out markers. The caller's email markup stays escaped by Svelte. -->
<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html '<!--email_off-->'}{@render children()}<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html '<!--/email_off-->'}
