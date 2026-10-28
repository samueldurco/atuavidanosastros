<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { registerHomeCarousel } from './carousel-coordinator';
	import { trackHomeEvent } from '$lib/analytics/home-events';
	import './showcase.css';
	let {
		label,
		count,
		titles = [],
		className = 'showcase-card',
		toolActive = false,
		heading,
		slide,
		footer,
		shop = false
	}: {
		label: string;
		count: number;
		titles?: readonly string[];
		className?: string;
		toolActive?: boolean;
		heading?: Snippet;
		slide: Snippet<[number]>;
		footer?: Snippet;
		shop?: boolean;
	} = $props();
	let element: HTMLElement;
	let index = $state(0);
	let playback = $state<'paused' | 'playing' | 'waiting'>('paused');
	let reduced = $state(false);
	let ready = $state(false);
	let controller: ReturnType<typeof registerHomeCarousel> | undefined;
	let touch = { x: 0, y: 0 };
	function move(next: number) {
		controller?.pause();
		index = (next + count) % count;
		trackHomeEvent('showcase_select', {
			context: shop ? 'shop' : 'banner',
			cta: 'select',
			position: index
		});
	}
	$effect(() => {
		const blocked = toolActive;
		controller?.setBlocked(blocked);
	});
	onMount(() => {
		ready = true;
		controller = registerHomeCarousel({
			el: element,
			count,
			blocked: toolActive,
			advance: () => {
				index = (index + 1) % count;
			},
			playback: (state, motion) => {
				playback = state;
				reduced = motion;
			}
		});
		let width = 0;
		const reserve = () => {
			for (const selector of ['.showcase-copy', '.showcase-cta']) {
				const items = [...element.querySelectorAll<HTMLElement>(selector)];
				items.forEach((item) => {
					item.style.minHeight = '';
					item.style.flex = '0 0 auto';
				});
				const height = Math.max(0, ...items.map((item) => item.getBoundingClientRect().height));
				items.forEach((item) => {
					item.style.minHeight = `${Math.ceil(height)}px`;
					item.style.flex = '';
				});
			}
		};
		const resize = new ResizeObserver(([entry]) => {
			if (entry.contentRect.width !== width) {
				width = entry.contentRect.width;
				reserve();
			}
		});
		resize.observe(element);
		void document.fonts.ready.then(() => {
			if (element.isConnected) reserve();
		});
		return () => {
			controller?.destroy();
			resize.disconnect();
		};
	});
</script>

<section
	bind:this={element}
	class={className}
	aria-roledescription="carrossel"
	aria-label={label}
	data-carousel
	data-playback={playback}
	onpointerenter={() => controller?.pause()}
	onfocusin={() => controller?.pause()}
	ontouchstart={(event) => {
		touch = { x: event.touches[0].clientX, y: event.touches[0].clientY };
		controller?.pause();
	}}
	ontouchend={(event) => {
		const dx = event.changedTouches[0].clientX - touch.x;
		const dy = event.changedTouches[0].clientY - touch.y;
		if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) move(index + (dx < 0 ? 1 : -1));
	}}
>
	{#if heading}{@render heading()}{/if}
	{#if titles.length}<div class="showcase-tabs" aria-label={`Escolher destaque de ${label}`}>
			{#each titles as title, position}<button
					type="button"
					aria-pressed={position === index}
					disabled={!ready}
					onclick={() => move(position)}>{title}</button
				>{/each}
		</div>{/if}
	<div class="banner-stage">
		{#each Array(count) as _, position}<div
				class="showcase-slide"
				data-active={position === index}
				aria-hidden={position !== index ? true : undefined}
				inert={position !== index}
			>
				{@render slide(position)}
			</div>{/each}
	</div>
	<div class={shop ? 'shop-showcase-bottom' : 'showcase-bottom'}>
		{#if footer}{@render footer()}{/if}
		<div class="banner-controls">
			<button
				type="button"
				aria-label={`Destaque anterior de ${label}`}
				disabled={!ready}
				onclick={() => move(index - 1)}>←</button
			>
			<span class="banner-position" aria-live="off"
				>{String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</span
			>
			<button
				type="button"
				aria-label={`Próximo destaque de ${label}`}
				disabled={!ready}
				onclick={() => move(index + 1)}>→</button
			>
			<button
				type="button"
				aria-label={`${playback === 'paused' ? 'Reproduzir' : 'Pausar'} destaques de ${label}`}
				disabled={!ready || reduced}
				title={reduced
					? 'Movimento automático desativado pela sua preferência de movimento reduzido'
					: undefined}
				onclick={() => controller?.toggle()}>{playback === 'paused' ? '▶' : 'Ⅱ'}</button
			>
		</div>
	</div>
</section>
