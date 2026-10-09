<script lang="ts">
	import { visualUniverse, visualV4 } from '$lib/data/visual-v4';
	let {
		identity,
		title = false,
		eager = false
	}: { identity: string; title?: boolean; eager?: boolean } = $props();
	const theme = $derived(visualUniverse(identity));
	const figures = $derived(theme ? visualV4.figures[theme] : [visualV4.mandala]);
	const shape = $derived(
		{
			ciclos: 'phases',
			amor: 'lovers',
			proposito: 'sun',
			tarot: 'cards',
			sonhos: 'dreamer',
			'meu-ceu': 'zodiac'
		}[theme || 'meu-ceu']
	);
</script>

<div
	class:card-art={true}
	class:v4-internal-art={title}
	class:v4-product-art={!title}
	aria-hidden="true"
>
	{#if theme === 'meu-ceu'}
		<div class="zodiac-object">
			<img
				src={visualV4.mandala}
				alt=""
				width="320"
				height="320"
				loading={eager ? 'eager' : 'lazy'}
				decoding="async"
			/>
		</div>
	{:else if theme === 'tarot'}
		<img
			class="primary cards"
			src="/brand/v4/MATERIAS/simbolos/cartas.svg"
			alt=""
			width="320"
			height="320"
			loading={eager ? 'eager' : 'lazy'}
			decoding="async"
		/>
		<img
			class="secondary hand"
			src={figures[0]}
			alt=""
			width="320"
			height="320"
			loading="lazy"
			decoding="async"
		/>
	{:else}
		<img
			class={`primary ${shape}`}
			src={figures[0]}
			alt=""
			width="320"
			height="320"
			loading={eager ? 'eager' : 'lazy'}
			decoding="async"
		/>
		{#if figures.length > 1}<img
				class={`secondary ${theme === 'amor' ? 'rose' : theme === 'proposito' ? 'saturn' : 'moth'}`}
				src={figures[1]}
				alt=""
				width="320"
				height="320"
				loading="lazy"
				decoding="async"
			/>{/if}
	{/if}
</div>
