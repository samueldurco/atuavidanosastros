<script lang="ts">
	import type { FreeToolResult } from '$lib/free-tools';
	import { freeToolReadingFacts } from '$lib/free-tool-result-presentation';
	import { freeToolById } from '$lib/data/free-tools';
	import AstrologicalChart from './AstrologicalChart.svelte';
	import TarotCard from './TarotCard.svelte';
	let { result }: { result: FreeToolResult } = $props();
	const readingFacts = $derived(freeToolReadingFacts(result));
	const date = (value: string) =>
		new Date(value).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
</script>

<section class="section">
	<div class="container reader">
		<a href="/biblioteca">← Biblioteca</a>
		<p class="eyebrow">Resultado gratuito salvo · {date(result.createdAt)}</p>
		<h1 class="h1">{result.title}</h1>
		<p class="lead">{result.summary}</p>
		{#if result.draw}<TarotCard cardId={result.draw.cardId} name={result.draw.name} />{/if}
		{#if result.chart}
			<AstrologicalChart
				svg={result.chart.svg}
				positions={result.chart.positions}
				ascendant={result.chart.ascendant}
				midheaven={result.chart.midheaven}
				cusps={result.chart.cusps}
				downloadName={`mapa-${result.tool}.svg`}
			/>
		{/if}
		{#if readingFacts.length}<dl class="facts">
				{#each readingFacts as fact (fact.id)}<div>
						<dt>{fact.label}</dt>
						<dd>{fact.value}</dd>
					</div>{/each}
			</dl>{/if}
		{#each result.sections as section (section.id)}<section class="reading-section">
				<h2>{section.title}</h2>
				<p class="body">{section.body}</p>
			</section>{/each}
		{#if result.limits.length}<details class="limits">
				<summary>Sobre esta leitura</summary>
				<ul>
					{#each result.limits as limit, index (index)}<li>{limit}</li>{/each}
				</ul>
			</details>{/if}
		<a class="btn btn-primary" href={freeToolById(result.tool)?.href ?? '/ferramentas'}
			>Voltar à ferramenta</a
		>
	</div>
</section>

<style>
	.reader {
		max-width: 48rem;
		min-width: 0;
	}
	.lead {
		font: 400 1.25rem/1.65 var(--atv-font-display);
		margin-block: 1rem 1.5rem;
	}
	.reading-section {
		margin-block: 1.5rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--atv-border, #c7bfac);
	}
	.reading-section h2 {
		margin: 0 0 0.75rem;
		font: 500 clamp(1.5rem, 3vw, 2rem)/1.2 var(--atv-font-display);
		letter-spacing: -0.02em;
	}
	.body {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		font: 400 1rem/1.8 var(--atv-font-ui);
		margin: 0;
	}
	.facts {
		display: grid;
		gap: 0.75rem;
		margin-block: 1.5rem;
	}
	.facts div {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr);
		gap: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--atv-border, #c7bfac);
		font-size: 0.875rem;
	}
	dt {
		font-weight: 600;
	}
	dd {
		margin: 0;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.limits {
		margin-block: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--atv-border, #c7bfac);
		font-size: 0.875rem;
	}
	.limits summary {
		cursor: pointer;
		font-weight: 600;
	}
	li {
		margin-block: 0.5rem;
	}
	@media (max-width: 480px) {
		.facts div {
			grid-template-columns: 1fr;
			gap: 0.25rem;
		}
	}
</style>
