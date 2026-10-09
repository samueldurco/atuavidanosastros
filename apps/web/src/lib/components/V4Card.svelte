<script lang="ts">
	import { onMount } from 'svelte';
	import { visualUniverse, visualV4 } from '$lib/data/visual-v4';
	let card: HTMLElement;
	let artReady = $state(false);
	onMount(() => {
		if (!('IntersectionObserver' in window)) {
			artReady = true;
			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					artReady = true;
					observer.disconnect();
				}
			},
			{ rootMargin: '300px' }
		);
		observer.observe(card);
		return () => observer.disconnect();
	});
	let {
		identity,
		title,
		description,
		href,
		action,
		eyebrow = '',
		editorial = false,
		compact = false,
		variant = 0
	}: {
		identity: string;
		title: string;
		description: string;
		href: string;
		action: string;
		eyebrow?: string;
		editorial?: boolean;
		compact?: boolean;
		variant?: number;
	} = $props();
	const universe = $derived(visualUniverse(identity) || 'meu-ceu');
	const figures = $derived(visualV4.figures[universe]);
	const figureClass = $derived(
		{
			ciclos: 'phases',
			amor: 'lovers',
			proposito: 'sun',
			tarot: 'cards',
			sonhos: 'dreamer',
			'meu-ceu': 'zodiac-object'
		}[universe]
	);
</script>

<article
	bind:this={card}
	class="v4-card"
	class:art-ready={artReady}
	class:editorial={editorial && !compact}
	class:compact
	class:ink={!editorial && universe === 'ciclos'}
	class:oracle={!editorial && universe === 'tarot'}
	data-universe={universe}
>
	<div class="back-sheet" aria-hidden="true"></div>
	<div class="card-face" aria-hidden="true"></div>
	{#if artReady && editorial}
		<div class="editorial-art" aria-hidden="true">
			<img
				src={figures[variant % figures.length]}
				alt=""
				width="320"
				height="320"
				loading="lazy"
				decoding="async"
			/>
		</div>
	{:else if artReady}
		<div class="card-art" aria-hidden="true">
			{#if universe === 'meu-ceu'}
				<div class="zodiac-object">
					<img
						src={visualV4.mandala}
						alt=""
						width="320"
						height="320"
						loading="lazy"
						decoding="async"
					/>
				</div>
			{:else if universe === 'tarot'}
				<img
					class="primary cards"
					src="/brand/v4/MATERIAS/simbolos/cartas.svg"
					alt=""
					width="320"
					height="320"
					loading="lazy"
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
					class={`primary ${figureClass}`}
					src={figures[0]}
					alt=""
					width="320"
					height="320"
					loading="lazy"
					decoding="async"
				/>
				{#if figures.length > 1}<img
						class={`secondary ${universe === 'amor' ? 'rose' : universe === 'proposito' ? 'saturn' : 'moth'}`}
						src={figures[1]}
						alt=""
						width="320"
						height="320"
						loading="lazy"
						decoding="async"
					/>{/if}
			{/if}
		</div>
	{/if}
	<div class="card-copy">
		{#if eyebrow}<span class="eyebrow">{eyebrow}</span>{/if}
		<h3><a {href}>{title}</a></h3>
		<p class="card-description">{description}</p>
		<a class="card-action" {href}>{action} <span aria-hidden="true">→</span></a>
	</div>
</article>
