<script lang="ts">
	import { freeTools } from '$lib/data/free-tools';
	import { onMount } from 'svelte';
	import { mvpArt, mvpThemes } from '$lib/data/mvp-visual';
	import FreeToolExperience from './FreeToolExperience.svelte';
	let { canSave = false, hasAccount = false }: { canSave?: boolean; hasAccount?: boolean } =
		$props();
	let rail: HTMLDivElement;
	let opened = $state<string[]>([]);
	let expanded = $state<string[]>([]);
	let active = $state(0);
	let atEnd = $state(false);
	onMount(() => {
		const observer = new ResizeObserver(track);
		observer.observe(rail);
		track();
		return () => observer.disconnect();
	});
	function toggle(id: string) {
		if (!opened.includes(id)) opened = [...opened, id];
		expanded = expanded.includes(id) ? expanded.filter((item) => item !== id) : [...expanded, id];
	}
	function track() {
		const cards = Array.from(rail.children) as HTMLElement[];
		const edge = rail.getBoundingClientRect().left;
		atEnd = rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 2;
		active = cards.reduce(
			(closest, card, index) =>
				Math.abs(card.getBoundingClientRect().left - edge) <
				Math.abs(cards[closest].getBoundingClientRect().left - edge)
					? index
					: closest,
			0
		);
	}
	function move(step: number) {
		const index = Math.max(0, Math.min(freeTools.length - 1, active + step));
		const card = rail.children[index] as HTMLElement;
		const left =
			rail.scrollLeft + card.getBoundingClientRect().left - rail.getBoundingClientRect().left;
		rail.scrollTo({
			left,
			behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
		});
	}
</script>

<section class="tool-collection section" id="ferramentas" aria-labelledby="tools-heading">
	<div class="wrap collection-heading">
		<div>
			<p class="eyebrow">Grátis · comece por aqui</p>
			<h2 id="tools-heading">Experimente uma ferramenta</h2>
			<p>Escolha um bloco para usar. Deslize para o lado e descubra os outros.</p>
		</div>
		<div class="rail-controls" aria-label="Navegar pelas ferramentas">
			<button
				type="button"
				onclick={() => move(-1)}
				aria-label="Ferramenta anterior"
				disabled={active === 0}>←</button
			>
			<span aria-live="polite">{active + 1} / {freeTools.length}</span>
			<button type="button" onclick={() => move(1)} aria-label="Próxima ferramenta" disabled={atEnd}
				>→</button
			>
		</div>
	</div>
	<div class="tool-rail wrap" bind:this={rail} onscroll={track}>
		{#each freeTools as tool, index (tool.id)}
			<article
				class="tool-block"
				style={`--tool-ink:${mvpThemes[tool.topicId].ink};--tool-tint:${mvpThemes[tool.topicId].tint}`}
			>
				<div class="tool-cover">
					<span class="tool-number">{String(index + 1).padStart(2, '0')}</span>
					<img
						src={mvpArt(mvpThemes[tool.topicId].art)}
						alt=""
						width="260"
						height="160"
						loading="lazy"
					/>
					<p class="eyebrow">{tool.availabilityLabel}</p>
					<h3>{tool.label}</h3>
					<p>{tool.description}</p>
				</div>
				<div class="tool-body">
					<button
						class="tool-open"
						type="button"
						aria-expanded={expanded.includes(tool.id)}
						aria-controls={`interactive-${tool.id}`}
						onclick={() => toggle(tool.id)}
						>{expanded.includes(tool.id) ? 'Recolher ferramenta' : tool.action}<span
							aria-hidden="true">{expanded.includes(tool.id) ? '−' : '+'}</span
						></button
					>
					<div
						id={`interactive-${tool.id}`}
						hidden={!expanded.includes(tool.id)}
						class="tool-interaction"
					>
						{#if opened.includes(tool.id)}<FreeToolExperience
								data={{ tool, canSave, hasAccount }}
								embedded
							/>{/if}
					</div>
					<a class="standalone" href={tool.href}>Abrir em uma página própria ↗</a>
				</div>
			</article>
		{/each}
	</div>
	<p class="wrap collection-end"><a href="/ferramentas">Ver todas as ferramentas →</a></p>
</section>

<style>
	.tool-collection {
		overflow: hidden;
		background: #e6e9dc;
		border-block: 1px solid #173c4d22;
	}
	.collection-heading {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}
	h2 {
		margin-block: 0.5rem 1rem;
	}
	.rail-controls {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		flex-shrink: 0;
	}
	.rail-controls button {
		width: 2.8rem;
		height: 2.8rem;
		border-radius: 50%;
		border: 1px solid currentColor;
		background: transparent;
		font-size: 1.3rem;
		cursor: pointer;
	}
	.rail-controls button:disabled {
		opacity: 0.3;
		cursor: default;
	}
	.rail-controls span {
		min-width: 2.8rem;
		text-align: center;
		font-size: 0.85rem;
	}
	.tool-rail {
		display: flex;
		align-items: start;
		gap: 1.5rem;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		overscroll-behavior-x: contain;
		padding-bottom: 1.25rem;
		scrollbar-color: #586647 #d2d8c7;
		scrollbar-width: thin;
	}
	.tool-block {
		flex: 0 0 calc((100% - 2rem) / 2);
		min-width: 0;
		scroll-snap-align: start;
		background: #fff9ec;
		border: 1px solid #183c4d36;
		border-radius: 0.35rem;
		overflow: hidden;
		box-shadow: 0 4px 12px #183c4d0b;
	}
	.tool-cover {
		position: relative;
		padding: 1.5rem 1.6rem 1rem;
		color: var(--tool-ink);
		background: var(--tool-tint);
		min-height: 23rem;
	}
	.tool-number {
		position: absolute;
		left: 1.6rem;
		top: 1.5rem;
		font-family: var(--atv-font-display);
		font-size: 1.3rem;
	}
	.tool-cover img {
		display: block;
		width: 100%;
		max-width: 15rem;
		height: 9rem;
		object-fit: contain;
		margin: 0 auto 1rem;
		mix-blend-mode: multiply;
	}
	.tool-cover h3 {
		font-family: var(--atv-font-display);
		font-size: clamp(1.8rem, 2.7vw, 2.6rem);
		line-height: 1.12;
		margin: 0.5rem 0 0.8rem;
	}
	.tool-cover p {
		line-height: 1.5;
		margin-bottom: 0.5rem;
	}
	.tool-body {
		padding: 1.25rem 1.5rem;
	}
	.tool-open {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		width: 100%;
		min-height: 3.2rem;
		padding: 0.8rem 1rem;
		border: 0;
		border-radius: 0.2rem;
		background: var(--tool-ink);
		color: #fffaf0;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	.tool-open span {
		font-size: 1.4rem;
	}
	.tool-interaction {
		padding-top: 1.5rem;
	}
	.standalone {
		display: inline-block;
		margin-top: 1rem;
		font-size: 0.8rem;
	}
	.collection-end {
		margin-top: 1.5rem;
		font-size: 0.9rem;
	}
	@media (max-width: 700px) {
		.collection-heading {
			display: block;
		}
		.rail-controls {
			margin-top: 1.2rem;
		}
		.tool-rail {
			width: calc(100% - 1.25rem);
			margin-left: 1.25rem;
			padding-right: 1.25rem;
			gap: 1rem;
		}
		.tool-block {
			flex-basis: calc(100% - 1.75rem);
		}
		.tool-cover {
			padding: 1.4rem;
			min-height: 22rem;
		}
		.tool-body {
			padding: 1.25rem;
		}
	}
</style>
