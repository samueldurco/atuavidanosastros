<script lang="ts">
	import { visualUniverse, visualV3 } from '$lib/data/visual-v3';
	let {
		identity,
		variant = 0,
		eager = false
	}: { identity: string; variant?: number; eager?: boolean } = $props();
	const theme = $derived(visualV3.themes[visualUniverse(identity)]);
</script>

<img
	class="v3-motif"
	src={theme.figures[variant % 3]}
	alt=""
	aria-hidden="true"
	width="520"
	height="520"
	loading={eager ? 'eager' : 'lazy'}
	decoding="async"
/>

<style>
	.v3-motif {
		display: block;
		width: min(100%, 14rem);
		height: 12rem;
		object-fit: contain;
		mix-blend-mode: multiply;
		pointer-events: none;
	}
</style>
