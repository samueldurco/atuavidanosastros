<script lang="ts">
	import { visualUniverse, visualV4 } from '$lib/data/visual-v4';
	let {
		identity,
		variant = 0,
		eager = false
	}: { identity: string; variant?: number; eager?: boolean } = $props();
	const theme = $derived(visualUniverse(identity));
	const figures = $derived(theme ? visualV4.figures[theme] : [visualV4.mandala]);
	const src = $derived(figures[variant % figures.length]);
</script>

<img
	class="v4-motif"
	{src}
	alt=""
	aria-hidden="true"
	width="320"
	height="320"
	loading={eager ? 'eager' : 'lazy'}
	decoding="async"
/>

<style>
	.v4-motif {
		display: block;
		width: min(100%, 14rem);
		height: 12rem;
		object-fit: contain;
		pointer-events: none;
	}
</style>
