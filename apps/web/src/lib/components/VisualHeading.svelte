<script lang="ts">
	let {
		title,
		identity = '',
		level = 1,
		id,
		theme = false
	}: {
		title: string;
		identity?: string;
		level?: 1 | 2 | 3;
		id?: string;
		theme?: boolean;
	} = $props();
</script>

<svelte:element
	this={`h${level}`}
	{id}
	class="v4-heading"
	data-identity={identity}
	data-theme-heading={theme}>{title}</svelte:element
>

<style>
	.v4-heading {
		margin: 0 0 1.25rem;
		font: 500 clamp(2.25rem, 4.5vw, 4rem)/1.12 var(--atv-font-display);
		overflow-wrap: anywhere;
	}
</style>
