<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { page } from '$app/state';
	import { freeTools } from '$lib/data/free-tools';
	import { interestNavigation } from '$lib/data/public-navigation';
	import { freeToolDesign } from './free-tool-design';
	import FreeToolExperience from './FreeToolExperience.svelte';
	import { trackHomeEvent } from '$lib/analytics/home-events';
	let {
		canSave = false,
		hasAccount = false,
		onToolOpenChange
	}: {
		canSave?: boolean;
		hasAccount?: boolean;
		onToolOpenChange?: (open: boolean) => void;
	} = $props();
	let opened = $state<string[]>([]);
	let selected = $state<string | null>(null);
	let columns = $state(3);
	let ready = $state(false);
	const openKey = 'atv-home-open-tool';
	const panelOrder = (index: number) => (Math.floor(index / columns) + 1) * columns * 2 - 1;
	function rememberSelection() {
		try {
			if (selected) sessionStorage.setItem(openKey, selected);
			else sessionStorage.removeItem(openKey);
		} catch {
			/* Optional same-tab continuity; never used as a quota. */
		}
	}
	async function select(id: string, focus = true) {
		if (focus) trackHomeEvent('tool_select', { tool_id: id, context: 'home', cta: 'open' });
		if (!opened.includes(id)) opened = [...opened, id];
		selected = id;
		rememberSelection();
		onToolOpenChange?.(true);
		await tick();
		if (focus) {
			const panel = document.getElementById(`interactive-${id}`);
			panel?.focus({ preventScroll: true });
			panel?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
		}
	}
	async function close(id: string) {
		selected = null;
		rememberSelection();
		onToolOpenChange?.(false);
		await tick();
		document.getElementById(`open-${id}`)?.focus({ preventScroll: true });
	}
	$effect(() => {
		if (!ready) return;
		const requested = page.url.searchParams.get('ferramenta');
		if (requested && freeTools.some((tool) => tool.id === requested)) {
			// A menu link can navigate within this mounted home. Keep existing experiences alive.
			untrack(() => void select(requested));
		}
	});
	onMount(() => {
		const resize = () => {
			columns = window.innerWidth <= 620 ? 1 : window.innerWidth <= 1020 ? 2 : 3;
		};
		resize();
		window.addEventListener('resize', resize, { passive: true });
		try {
			const previous = sessionStorage.getItem(openKey);
			if (
				!page.url.searchParams.has('ferramenta') &&
				freeTools.some((tool) => tool.id === previous)
			)
				void select(previous!, false);
		} catch {
			/* A disabled browser store does not prevent use. */
		}
		ready = true;
		return () => {
			window.removeEventListener('resize', resize);
			onToolOpenChange?.(false);
		};
	});
</script>

<section class="tool-collection section" id="ferramentas" aria-labelledby="tools-heading">
	<div class="wrap collection-heading">
		<div>
			<p class="eyebrow">01 / Um primeiro olhar</p>
			<h2 id="tools-heading">Ferramentas grátis</h2>
			<p>Uma pergunta, um ponto de partida. Explore seu céu, seus vínculos e seus símbolos.</p>
		</div>
		<span class="collection-note">Nove caminhos.<br />Comece pelo que faz sentido hoje.</span>
	</div>
	<div class="tool-grid wrap">
		{#each freeTools as tool, index (tool.id)}
			{@const design = freeToolDesign(tool)}
			{@const universe = interestNavigation.find((item) => item.id === tool.topicId)}
			<article
				class="tool-card"
				data-tool={tool.id}
				class:selected={selected === tool.id}
				style={`--tool-ink:${design.ink};--tool-tint:${design.tint};order:${index * 2}`}
			>
				<button
					id={`open-${tool.id}`}
					class="tool-open"
					type="button"
					aria-expanded={selected === tool.id}
					aria-controls={`interactive-${tool.id}`}
					onclick={() => (selected === tool.id ? close(tool.id) : select(tool.id))}
				>
					<img src={design.art} alt="" width="110" height="110" loading="lazy" />
					<span class="tool-copy"
						><span class="tool-kicker"
							>{universe?.label} <span aria-hidden="true">/</span> Grátis</span
						>
						<span class="tool-name">{tool.label}</span><span class="tool-description"
							>{tool.description}</span
						></span
					>
					<span class="tool-mark" aria-hidden="true">{selected === tool.id ? '−' : '+'}</span>
				</button>
			</article>
			<div
				id={`interactive-${tool.id}`}
				class="tool-panel"
				data-tool-panel={tool.id}
				role="region"
				aria-label={tool.label}
				tabindex="-1"
				hidden={selected !== tool.id}
				style={`--tool-ink:${design.ink};--tool-tint:${design.tint};order:${panelOrder(index)}`}
			>
				{#if opened.includes(tool.id)}
					<div class="panel-heading">
						<div>
							<p class="eyebrow">{universe?.label} / Ferramenta gratuita</p>
							<h3>{tool.label}</h3>
						</div>
						<button
							class="tool-close"
							type="button"
							onclick={() => close(tool.id)}
							aria-label={`Fechar ${tool.label}`}>Fechar <span aria-hidden="true">×</span></button
						>
					</div>
					<div class="panel-intro">
						<img src={design.art} alt="" width="180" height="130" loading="lazy" />
						<div>
							<p>{tool.description}</p>
							<p class="requirements">{tool.requirements}</p>
						</div>
					</div>
					<FreeToolExperience
						data={{ tool, canSave, hasAccount }}
						embedded
						active={selected === tool.id}
					/>
				{/if}
			</div>
		{/each}
	</div>
</section>

<style>
	.tool-collection {
		background: #e7eadf;
		border-block: 1px solid #173c4d22;
	}
	.collection-heading {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 2rem;
		margin-bottom: 2.1rem;
	}
	h2 {
		font: 500 clamp(2.8rem, 5.4vw, 4.6rem)/1.03 var(--atv-font-display);
		letter-spacing: -0.035em;
		margin: 0.55rem 0 1rem;
	}
	.collection-heading p:not(.eyebrow) {
		max-width: 36rem;
		line-height: 1.65;
		margin: 0;
	}
	.collection-note {
		text-align: right;
		font-size: 0.85rem;
		line-height: 1.6;
		color: #4d5d50;
	}
	.tool-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.8rem;
		align-items: stretch;
	}
	.tool-card {
		min-width: 0;
		background: #faf5e9;
		border: 1px solid #183c4d35;
		border-radius: 0.2rem;
		transition:
			border-color 160ms,
			background 160ms;
	}
	.tool-card.selected {
		background: var(--tool-tint);
		border-color: var(--tool-ink);
		box-shadow: inset 0 -3px var(--tool-ink);
	}
	.tool-open {
		position: relative;
		display: grid;
		grid-template-columns: 76px minmax(0, 1fr) 14px;
		gap: 0.8rem;
		align-items: center;
		width: 100%;
		height: 100%;
		min-height: 12rem;
		border: 0;
		padding: 1.15rem;
		background: none;
		color: #203e43;
		text-align: left;
		font: inherit;
		cursor: pointer;
	}
	.tool-open:hover {
		background: #ffffff40;
	}
	.tool-open:focus-visible,
	.tool-close:focus-visible {
		outline: 3px solid var(--tool-ink);
		outline-offset: 4px;
	}
	.tool-open img {
		width: 76px;
		height: 100px;
		object-fit: contain;
		mix-blend-mode: multiply;
	}
	.tool-copy {
		display: grid;
		gap: 0.55rem;
	}
	.tool-kicker {
		color: var(--tool-ink);
		font-size: 0.6rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-weight: 650;
	}
	.tool-kicker span {
		padding-inline: 0.15rem;
	}
	.tool-name {
		font: 500 1.55rem/1.05 var(--atv-font-display);
		letter-spacing: -0.02em;
	}
	.tool-description {
		font-size: 0.76rem;
		line-height: 1.55;
		color: #4b5953;
	}
	.tool-mark {
		align-self: end;
		color: var(--tool-ink);
		font-size: 1.5rem;
	}
	.tool-panel {
		grid-column: 1 / -1;
		min-width: 0;
		background: #faf5e9;
		border: 1px solid var(--tool-ink);
		border-top: 4px solid var(--tool-ink);
		padding: clamp(1.2rem, 3.5vw, 3rem);
		margin-block: 0.2rem 0.65rem;
		scroll-margin-top: 6rem;
	}
	.tool-panel[hidden] {
		display: none;
	}
	.tool-panel:focus {
		outline: none;
	}
	.panel-heading {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 1rem;
		padding-bottom: 1.1rem;
		border-bottom: 1px solid #173c4d2e;
	}
	.panel-heading .eyebrow {
		color: var(--tool-ink);
	}
	.panel-heading h3 {
		font: 500 clamp(2rem, 3.8vw, 3rem)/1.1 var(--atv-font-display);
		margin: 0.5rem 0 0;
		letter-spacing: -0.025em;
	}
	.tool-close {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		background: transparent;
		color: #203e43;
		border: 1px solid #183c4d55;
		padding: 0.6rem 0.8rem;
		border-radius: 0.15rem;
		font: inherit;
		font-size: 0.8rem;
		min-height: 44px;
		cursor: pointer;
	}
	.tool-close span {
		font-size: 1.2rem;
	}
	.panel-intro {
		display: flex;
		align-items: center;
		gap: 1.6rem;
		max-width: 52rem;
		margin-block: 1.3rem;
	}
	.panel-intro img {
		width: 115px;
		height: 100px;
		object-fit: contain;
		mix-blend-mode: multiply;
	}
	.panel-intro p {
		margin: 0.5rem 0;
		line-height: 1.6;
	}
	.panel-intro .requirements {
		font-size: 0.8rem;
		color: #536055;
	}
	@media (max-width: 1020px) {
		.tool-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 620px) {
		.tool-grid {
			grid-template-columns: minmax(0, 1fr);
		}
		.collection-heading {
			display: block;
		}
		.collection-note {
			display: none;
		}
		.tool-open {
			min-height: 10rem;
			grid-template-columns: 68px minmax(0, 1fr) 14px;
			padding: 1rem;
		}
		.tool-open img {
			width: 68px;
			height: 90px;
		}
		.tool-name {
			font-size: 1.65rem;
		}
		.tool-description {
			font-size: 0.8rem;
		}
		.panel-heading h3 {
			font-size: 2rem;
		}
		.panel-heading .eyebrow {
			font-size: 0.6rem;
		}
		.panel-intro {
			gap: 1rem;
		}
		.panel-intro img {
			width: 65px;
			height: 80px;
		}
		.panel-intro p {
			font-size: 0.86rem;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.tool-card {
			transition: none;
		}
	}
</style>
