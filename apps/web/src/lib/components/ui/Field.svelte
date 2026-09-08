<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		id,
		label,
		help,
		error,
		children
	}: {
		id: string;
		label: string;
		help?: string;
		error?: string;
		children: Snippet<[string | undefined]>;
	} = $props();
	const describedBy = $derived(
		[help ? `${id}-help` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
	);
</script>

<div class="field">
	<label for={id}>{label}</label>
	{@render children(describedBy)}
	{#if help}<small id={`${id}-help`}>{help}</small>{/if}
	{#if error}<small id={`${id}-error`} class="field-error">{error}</small>{/if}
</div>
