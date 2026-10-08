<script lang="ts">
	import type { SavedTrial } from '$lib/trials/reading';
	import { buildChartScene, chartSceneSvg } from '$lib/trials/chart-engine-v2';
	import { SYNASTRY_VERSION } from '$lib/trials/reconstruction/synastry-facts';
	import {
		trialGeometry,
		bodyNames,
		bodyGlyphs,
		signNames,
		nominalDegree
	} from '$lib/trials/cartography';
	let { saved }: { saved: SavedTrial } = $props();
	const reconstructed = $derived(saved.calculation.version === SYNASTRY_VERSION);
	const people = $derived([
		{ key: 'first' as const, name: saved.input.presentation?.name ?? 'Pessoa A' },
		{ key: 'second' as const, name: saved.input.presentation?.partnerName ?? 'Pessoa B' }
	]);
	const point = (a: number, r: number) => ({
		x: 180 - r * Math.cos((a * Math.PI) / 180),
		y: 180 + r * Math.sin((a * Math.PI) / 180)
	});
</script>

<section aria-label="Fatores natais das duas pessoas" class="pair-charts">
	{#each people as person (person.key)}
		{@const geometry = trialGeometry(saved, person.key)}
		<figure>
			<figcaption>{person.name}</figcaption>
			{#if reconstructed}
				{@const svg = chartSceneSvg(buildChartScene(saved, { person: person.key }))
					.replaceAll('chart-title', `pair-${person.key}-title`)
					.replaceAll('chart-description', `pair-${person.key}-description`)}
				<!-- Locally generated SVG from the validated saved calculation. -->
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<div class="individual-chart">{@html svg}</div>
			{:else}
				<svg viewBox="0 0 360 360" role="img" aria-label={`Posições natais de ${person.name}`}>
					<circle cx="180" cy="180" r="142" fill="#fcfaf6" stroke="#142139" />
					{#each signNames as name, i (name)}
						{@const label = point(i * 30 + 15, 161)}
						{@const tick = point(i * 30, 142)}
						{@const inner = point(i * 30, 132)}
						<line x1={tick.x} y1={tick.y} x2={inner.x} y2={inner.y} stroke="#ad884c" />
						<text
							x={label.x}
							y={label.y}
							text-anchor="middle"
							dominant-baseline="middle"
							font-size="9"
							fill="#142139">{name}</text
						>
					{/each}
					{#each geometry.positions as planet (planet.body)}
						{@const p = point(planet.longitude, 119 - (geometry.tracks.get(planet.body) ?? 0) * 20)}
						<g data-body={planet.body} transform={`translate(${p.x} ${p.y}) scale(.6)`}>
							<title>{bodyNames[planet.body]}: {nominalDegree(planet.longitude)}</title>
							<circle r="12" fill="#fcfaf6" />
							<path d={bodyGlyphs[planet.body]} fill="none" stroke="#142139" stroke-width="1.8" />
						</g>
					{/each}
				</svg>
			{/if}
			<ul>
				{#each geometry.positions as planet (planet.body)}<li>
						{bodyNames[planet.body]} · {nominalDegree(planet.longitude)}
					</li>{/each}
			</ul>
		</figure>
	{/each}
	<p>
		{#if reconstructed}
			Cada mapa mostra suas posições natais, com casas e ângulos quando calculáveis. A mandala de
			comparação e os capítulos relacionam os dois mapas; as casas desenhadas na comparação
			pertencem à pessoa B.
		{:else}
			As imagens mostram posições planetárias calculadas. Casas e ângulos não estão incluídos neste
			recorte. {saved.product_id === 'pair-preview'
				? 'A Combinação do Casal compara Lua, Vênus e Marte de cada pessoa; não calcula aspectos entre mapas.'
				: 'Os contatos entre as duas pessoas são explorados nos capítulos.'}
		{/if}
	</p>
</section>

<style>
	.pair-charts {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.25rem;
		margin: 1.5rem 0;
	}
	figure {
		margin: 0;
		padding: 1rem;
		border: 1px solid #ded6c8;
		border-radius: 1rem;
		background: #fcfaf6;
	}
	figcaption {
		font: 500 1.6rem var(--atv-font-display, Georgia);
		text-align: center;
		overflow-wrap: anywhere;
	}
	svg {
		width: 100%;
		height: auto;
	}
	.individual-chart :global(svg) {
		width: 100%;
		height: auto;
	}
	ul {
		columns: 2;
		padding: 0;
		list-style: none;
		font-size: 0.8rem;
		line-height: 1.8;
	}
	p {
		grid-column: 1/-1;
		font-size: 0.85rem;
	}
	@media (max-width: 640px) {
		.pair-charts {
			grid-template-columns: 1fr;
		}
	}
</style>
