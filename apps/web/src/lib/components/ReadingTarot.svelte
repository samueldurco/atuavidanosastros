<script lang="ts">
	import { tarotMethodFor } from '@atv/domain';
	import type { SavedTrial } from '$lib/trials/reading';
	import { buildTarotScene, tarotSceneSvg } from '$lib/trials/tarot-diagram';
	import TarotCard from './TarotCard.svelte';
	let {
		saved,
		onselect,
		interactive = true
	}: { saved: SavedTrial; onselect: (id: string) => void; interactive?: boolean } = $props();
	const method = $derived(tarotMethodFor(saved.product_id)!);
	const scene = $derived(buildTarotScene(saved));
</script>

<section class="tarot-reading" aria-label="Cartas da sua tiragem">
	<header>
		<p class="eyebrow">Sua tiragem</p>
		<h2>{method.name}</h2>
	</header>
	<ol class:many={scene.cards.length > 3} aria-label="Cartas e posições">
		{#each scene.cards as card, i (card.positionId)}
			<li>
				<TarotCard
					cardId={card.cardId}
					name={card.name}
					caption={`${card.position}. ${card.positionName}`}
					compact={scene.cards.length > 3}
					credit={false}
				/>
				{#if interactive}
					<button onclick={() => onselect(`card-${i + 1}`)}
						>Ler esta posição <span aria-hidden="true">↗</span></button
					>
				{/if}
			</li>
		{/each}
	</ol>
	<p class="credit">
		Rider–Waite–Smith · arte de <a
			href="https://commons.wikimedia.org/wiki/Category:Rider-Waite-Smith_tarot_deck_(TaionWC)"
			target="_blank"
			rel="noreferrer">Pamela Colman Smith</a
		>
	</p>
	{#if scene.cards.length > 1}
		<details>
			<summary>Ver a disposição da tiragem</summary>
			<!-- The local SVG generator escapes all text and uses validated card IDs for image URLs. -->
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<div class="diagram">{@html tarotSceneSvg(scene)}</div>
		</details>
	{/if}
	<nav aria-label="Outros métodos de Tarot">
		<p>Outras tiragens</p>
		{#each method.related as id (id)}
			<a href={`/testar-produtos/${id}`}>{tarotMethodFor(id)?.name}</a>
		{/each}
	</nav>
</section>

<style>
	.tarot-reading {
		margin: 2rem 0;
		color: #183746;
		border-block: 1px solid #c7bfac;
		padding-block: 1.5rem;
		min-width: 0;
	}
	header {
		margin-bottom: 1.5rem;
	}
	.eyebrow {
		font:
			600 0.72rem/1.5 Onest,
			sans-serif;
		letter-spacing: 0.13em;
		text-transform: uppercase;
		color: #92501f;
	}
	h2 {
		margin: 0.4rem 0 0;
		font:
			400 clamp(1.65rem, 4vw, 2.4rem)/1.15 Newsreader,
			Georgia,
			serif;
	}
	ol {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
		gap: 1.75rem 1.25rem;
		padding: 0;
		margin: 0;
		list-style: none;
	}
	ol.many {
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr));
	}
	li {
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
	}
	button {
		min-height: 44px;
		padding: 0.5rem 0.75rem;
		font:
			500 0.85rem/1.4 Onest,
			sans-serif;
		background: transparent;
		color: #183746;
		border: 0;
		border-bottom: 1px solid #a36632;
		cursor: pointer;
	}
	button span {
		margin-left: 0.5rem;
	}
	.credit {
		color: #596365;
		font:
			400 0.72rem/1.6 Onest,
			sans-serif;
		text-align: center;
		margin: 1.5rem 0;
	}
	details {
		border-block: 1px solid #c7bfac;
		padding: 0.25rem 0;
	}
	summary {
		padding-block: 0.8rem;
		min-height: 44px;
		cursor: pointer;
		font:
			500 0.9rem/1.5 Onest,
			sans-serif;
	}
	.diagram {
		max-width: 900px;
		margin: auto;
	}
	.diagram :global(svg) {
		display: block;
		width: 100%;
		height: auto;
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
		align-items: center;
		margin-top: 1.25rem;
		font:
			400 0.85rem/1.5 Onest,
			sans-serif;
	}
	nav p {
		flex-basis: 100%;
		margin: 0;
		color: #596365;
	}
	a {
		color: inherit;
		text-underline-offset: 0.2em;
	}
	nav a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}
	button:focus-visible,
	a:focus-visible,
	summary:focus-visible {
		outline: 2px solid #174c69;
		outline-offset: 4px;
	}
	@media (max-width: 420px) {
		ol,
		ol.many {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
	}
</style>
