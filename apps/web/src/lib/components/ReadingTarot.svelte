<script lang="ts">
	import { tarotMethodFor } from '@atv/domain';
	import type { SavedTrial } from '$lib/trials/reading';
	import { buildTarotScene } from '$lib/trials/tarot-diagram';
	let {
		saved,
		onselect,
		interactive = true
	}: { saved: SavedTrial; onselect: (id: string) => void; interactive?: boolean } = $props();
	const method = $derived(tarotMethodFor(saved.product_id)!);
	const scene = $derived(buildTarotScene(saved));
</script>

<section class="tarot-reading" aria-label="Posições da sua tiragem">
	<h2>Sua tiragem · {method.name}</h2>
	<p>{method.integration}</p>
	<div class="diagram">
		<svg
			viewBox={`0 0 ${scene.width} ${scene.height}`}
			role="img"
			aria-label={`${scene.title}. ${scene.description}`}
		>
			{#each scene.nodes as node, index (index)}
				{#if node.type === 'rect'}
					<rect
						x={node.x}
						y={node.y}
						width={node.w}
						height={node.h}
						rx={node.rx ?? 0}
						fill={node.fill ?? 'none'}
						stroke={node.stroke ?? 'none'}
						stroke-width={node.width ?? 0}
					/>
				{:else if node.type === 'text'}
					<text
						x={node.x}
						y={node.y}
						font-size={node.size}
						text-anchor="middle"
						font-family="Onest, sans-serif"
						fill={node.fill ?? 'none'}>{node.text}</text
					>
				{/if}
			{/each}
		</svg>
	</div>
	<ol aria-label="Cartas e funções das posições">
		{#each scene.cards as card, i (card.positionId)}
			<li>
				<button disabled={!interactive} onclick={() => onselect(`card-${i + 1}`)}>
					<strong>{card.position}. {card.positionName} · {card.name}</strong>
					<span>{method.positions[i].function}</span>
				</button>
			</li>
		{/each}
	</ol>
	<nav aria-label="Outros métodos de Tarot">
		<p>Para explorar com outra estrutura</p>
		{#each method.related as id (id)}
			<a href={`/testar-produtos/${id}`}>{tarotMethodFor(id)?.name}</a>
		{/each}
	</nav>
</section>

<style>
	.tarot-reading {
		margin: 2rem 0;
		padding: clamp(1rem, 3vw, 2rem);
		background: #eddbb8;
		color: #3d3027;
		border: 1px solid #8b673e;
		border-radius: 1rem;
	}
	h2 {
		font-size: 1.5rem;
	}
	p {
		line-height: 1.6;
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
	ol {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
		gap: 0.75rem;
		padding: 0;
		list-style: none;
	}
	button {
		width: 100%;
		min-height: 64px;
		padding: 0.9rem;
		text-align: left;
		border: 1px solid #8b673e;
		border-radius: 0.5rem;
		background: #fcf8ef;
		color: inherit;
		cursor: pointer;
	}
	span {
		display: block;
		margin-top: 0.4rem;
		line-height: 1.5;
	}
	button:focus-visible,
	a:focus-visible {
		outline: 3px solid #3d3027;
		outline-offset: 3px;
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
		align-items: center;
	}
	nav p {
		flex-basis: 100%;
		margin-bottom: 0;
	}
	a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		color: #3d3027;
		text-underline-offset: 0.2em;
	}
</style>
