<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	let {
		children,
		href,
		variant = 'primary',
		pending = false,
		disabled = false,
		type = 'button',
		...attributes
	}: HTMLButtonAttributes & {
		children: Snippet;
		href?: string;
		variant?: 'primary' | 'secondary' | 'tertiary' | 'night' | 'gold-on-night' | 'destructive';
		pending?: boolean;
	} = $props();
</script>

{#if href && !disabled && !pending}
	<a class={`button ${variant}`} {href}>{@render children()}</a>
{:else}
	<button
		{...attributes}
		class={`button ${variant}`}
		{type}
		disabled={disabled || pending}
		aria-busy={pending}>{@render children()}</button
	>
{/if}
