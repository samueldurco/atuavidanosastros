<script lang="ts">
	import type { ProductCartography } from '$lib/product-cartography';
	import { productFactLabel } from '$lib/product-fact-label';
	import { buildNatalChartScene, chartSceneSvg } from '$lib/trials/chart-engine-v2';
	import { bodyNames } from '$lib/trials/cartography';
	import AstrologicalChart from './AstrologicalChart.svelte';
	let {
		geometry,
		facts
	}: { geometry: ProductCartography; facts: { id: string; display: string }[] } = $props();
	const svg = $derived(
		chartSceneSvg(
			buildNatalChartScene(
				{ ...geometry, aspects: [], tracks: new Map<string, number>() },
				{},
				{ title: 'Seu mapa astral', subtitle: 'Zodíaco tropical · posições do cálculo salvo' }
			)
		)
	);
	const display = (id: string) =>
		facts.find((fact) => fact.id === id)?.display ?? 'Consulte a base preservada';
</script>

<section id="cartografia" aria-labelledby="cartography-heading">
	<p class="eyebrow">Mapa de nascimento</p>
	<h2 id="cartography-heading">O desenho do seu mapa</h2>
	<AstrologicalChart
		{svg}
		positions={geometry.positions.map((position) => ({
			...position,
			name: bodyNames[position.body]
		}))}
		ascendant={geometry.angles.ascendant}
		midheaven={geometry.angles.midheaven}
		cusps={geometry.houses.cusps}
		downloadName="mapa-astral.svg"
	/>
	<details class="source-positions">
		<summary>Consultar as posições na base desta leitura</summary>
		<ul aria-label="Posições natais e seus dados de origem">
			{#each geometry.positions as position (position.body)}
				<li>
					<a href={`#fact-position-${position.body}`}>
						<strong
							>{productFactLabel('birth-chart', `position-${position.body}`).split(' (')[0]}</strong
						>
						<span>{display(`position-${position.body}`)}</span>
					</a>
				</li>
			{/each}
		</ul>
		<p class="angles">
			{#if geometry.angles.ascendant !== null}<a href="#fact-angle-ascendant">Ascendente</a>{/if}
			{#if geometry.angles.midheaven !== null}<a href="#fact-angle-midheaven">Meio do Céu</a>{/if}
		</p>
		<p class="note">
			Esta versão preserva a geometria experimental do cálculo salvo. <a href="#origem"
				>Ver origem e limites</a
			>.
		</p>
	</details>
</section>

<style>
	section {
		min-width: 0;
		scroll-margin-top: 2rem;
		margin-bottom: 3rem;
		overflow-wrap: anywhere;
	}
	h2 {
		margin: 0 0 1rem;
	}
	.eyebrow {
		color: var(--atv-text-muted, #596365);
		font-size: 0.75rem;
		letter-spacing: 0.13em;
		text-transform: uppercase;
	}
	.source-positions {
		padding: 1rem 0;
		border-bottom: 1px solid var(--atv-border, #c7bfac);
		font-size: 0.9rem;
	}
	summary {
		min-height: 44px;
		align-content: center;
		cursor: pointer;
	}
	ul {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
		gap: 0.65rem 1.5rem;
		padding: 0;
		list-style: none;
	}
	li a {
		display: grid;
		gap: 0.2rem;
		padding: 0.3rem 0;
	}
	a {
		color: var(--atv-text-primary, #183746);
		text-underline-offset: 0.2em;
	}
	.angles {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.note {
		color: var(--atv-text-muted, #596365);
		font-size: 0.85rem;
		line-height: 1.6;
	}
</style>
