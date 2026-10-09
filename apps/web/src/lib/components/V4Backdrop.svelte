<script lang="ts">
	import { onMount } from 'svelte';
	import type { VisualUniverse } from '$lib/data/visual-v4';
	let { universe }: { universe?: VisualUniverse } = $props();
	let backdrop: HTMLDivElement;
	let count = $state(12);
	onMount(() => {
		const parent = backdrop.parentElement;
		if (!parent) return;
		const resize = () => {
			count = Math.max(
				2,
				Math.ceil(parent.offsetHeight / Math.max(1, (parent.clientWidth * 2) / 3)) + 1
			);
		};
		const observer = new ResizeObserver(resize);
		observer.observe(parent);
		resize();
		return () => observer.disconnect();
	});
</script>

<div
	bind:this={backdrop}
	class={universe ? 'universe-backdrop' : 'continuous-backdrop'}
	aria-hidden="true"
>
	{#if !universe}
		{#each Array.from(Array(count).keys()) as tile (tile)}
			<div class="continuous-tile"></div>
		{/each}
	{/if}
</div>
