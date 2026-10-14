<script lang="ts">
	import { visualUniverse, visualV4 } from '$lib/data/visual-v4';
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
</script>

<article
	class={'v4-card mvp-context-card theme-' + universe}
	class:editorial
	class:compact
	data-universe={universe}
>
	<div class="mvp-card-image" aria-hidden="true">
		<img
			src={figures[variant % figures.length]}
			alt=""
			width="320"
			height="320"
			loading="lazy"
			decoding="async"
		/>
	</div>
	<div class="card-copy">
		{#if eyebrow}<span class="eyebrow">{eyebrow}</span>{/if}
		<h3><a {href}>{title}</a></h3>
		<p class="card-description">{description}</p>
		<a class="card-action" {href}>{action} <span aria-hidden="true">→</span></a>
	</div>
</article>
