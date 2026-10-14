<script lang="ts">
	import { mvpArt, mvpTheme, mvpThemes } from '$lib/data/mvp-visual';
	let {
		identity,
		title,
		description,
		href,
		eyebrow = ''
	}: {
		identity: string;
		title: string;
		description: string;
		href: string;
		eyebrow?: string;
	} = $props();
	const theme = $derived(mvpTheme(identity));
</script>

<article class={`card universe-card universe-${theme} theme-${theme}`}>
	<div class="card-art">
		<img class="art" src={mvpArt(mvpThemes[theme].art)} alt="" loading="lazy" decoding="async" />
	</div>
	<div class="card-body">
		{#if eyebrow}<p class="eyebrow">{eyebrow}</p>{/if}
		<h3><a {href}>{title}</a></h3>
		<p>{description}</p>
		<a class="text-link" {href}>Explorar este universo <span aria-hidden="true">↗</span></a>
	</div>
</article>

<style>
	.card {
		padding: 0;
		min-width: 0;
	}
	.card-body {
		display: flex;
		flex-direction: column;
		flex: 1;
		align-items: flex-start;
	}
	h3 a {
		text-decoration: none;
	}
	.text-link {
		margin-top: auto;
		padding-top: 1rem;
		min-height: 44px;
	}
</style>
