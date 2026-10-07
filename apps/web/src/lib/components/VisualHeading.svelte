<script lang="ts">
	import { visualProduct, visualUniverse, visualV3 } from '$lib/data/visual-v3';
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
	const art = $derived(
		theme
			? visualV3.themes[visualUniverse(identity)].title
			: visualProduct(identity || title)?.title
	);
	let loadedFor = $state('');
</script>

<svelte:element this={`h${level}`} {id} class="v3-heading" class:with-art={!!art}>
	{#if art}<img
			src={art}
			alt=""
			aria-hidden="true"
			width="720"
			height={theme ? 480 : 360}
			class:ready={loadedFor === art}
			onload={() => {
				loadedFor = art;
			}}
			onerror={() => {
				loadedFor = '';
			}}
		/>{/if}
	<span class:art-loaded={!!art && loadedFor === art}>{title}</span>
</svelte:element>

<style>
	.v3-heading {
		margin: 0 0 1.25rem;
		font: 500 clamp(2.25rem, 4.5vw, 4rem)/1.12 var(--atv-font-display);
		overflow-wrap: anywhere;
	}
	.with-art {
		position: relative;
		display: grid;
		width: min(100%, 29rem);
	}
	.with-art > * {
		grid-area: 1 / 1;
		align-self: center;
	}
	img {
		display: block;
		width: min(100%, 29rem);
		height: auto;
		max-height: 18rem;
		visibility: hidden;
		object-fit: contain;
		object-position: left center;
		mix-blend-mode: multiply;
	}
	img.ready {
		visibility: visible;
	}
	.art-loaded {
		opacity: 0;
	}
	@media print, (forced-colors: active) {
		img {
			display: none;
		}
		.art-loaded {
			opacity: 1;
		}
	}
</style>
