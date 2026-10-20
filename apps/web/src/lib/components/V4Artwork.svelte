<script lang="ts">
	import { visualUniverse, visualV4 } from '$lib/data/visual-v4';
	let {
		identity,
		title = false,
		eager = false
	}: { identity: string; title?: boolean; eager?: boolean } = $props();
	const theme = $derived(visualUniverse(identity) || 'meu-ceu');
</script>

<div
	class="mvp-context-art"
	class:v4-internal-art={title}
	class:v4-product-art={!title}
	aria-hidden="true"
>
	<img
		src={visualV4.figures[theme][0]}
		alt=""
		width="320"
		height="320"
		loading={eager ? 'eager' : 'lazy'}
		decoding="async"
	/>
</div>

<style>
	.mvp-context-art > img {
		position: static;
		display: block;
		width: 100%;
		height: 100%;
		max-width: 100%;
		object-fit: contain;
	}
</style>
