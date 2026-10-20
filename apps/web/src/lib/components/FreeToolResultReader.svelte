<script lang="ts">
	import type { FreeToolResult } from '$lib/free-tools';
	import { freeToolById } from '$lib/data/free-tools';
	let { result }: { result: FreeToolResult } = $props();
	let chartZoom = $state(1);
	let chartViewport = $state<HTMLDivElement>();
	const chartId = $props.id();
	const chartSource = $derived(
		result.chart ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.chart.svg)}` : ''
	);
	$effect(() => {
		if (result) chartZoom = 1;
	});
	$effect(() => {
		if (chartZoom === 1) chartViewport?.scrollTo({ top: 0, left: 0 });
	});
	const date = (value: string) =>
		new Date(value).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
</script>

<section class="section">
	<div class="container reader">
		<a href="/biblioteca">← Biblioteca</a>
		<p class="eyebrow">Resultado gratuito salvo · {date(result.createdAt)}</p>
		<h1 class="h1">{result.title}</h1>
		<p class="lead">{result.summary}</p>
		{#if result.chart}
			<section class="chart-panel" aria-labelledby={`${chartId}-title`}>
				<div class="chart-heading">
					<div>
						<p class="eyebrow">Seu céu em detalhes</p>
						<h2 id={`${chartId}-title`}>Mandala do mapa</h2>
					</div>
					<a class="chart-download" href={chartSource} download={`mapa-${result.tool}.svg`}
						>Baixar SVG</a
					>
				</div>
				<p class="chart-help" id={`${chartId}-help`}>
					Amplie para ler os símbolos e graus. Na imagem ampliada, deslize ou use as setas do
					teclado para explorar.
				</p>
				<div class="chart-controls" role="group" aria-label="Ampliação da mandala">
					<button
						type="button"
						aria-label="Reduzir mandala"
						aria-controls={`${chartId}-viewport`}
						disabled={chartZoom === 1}
						onclick={() => (chartZoom = Math.max(1, chartZoom - 0.5))}>−</button
					>
					<output aria-live="polite" aria-label="Ampliação atual">{chartZoom * 100}%</output>
					<button
						type="button"
						aria-label="Ampliar mandala"
						aria-controls={`${chartId}-viewport`}
						disabled={chartZoom === 3}
						onclick={() => (chartZoom = Math.min(3, chartZoom + 0.5))}>+</button
					>
					<button type="button" disabled={chartZoom === 1} onclick={() => (chartZoom = 1)}
						>Ajustar à tela</button
					>
				</div>
				<!-- svelte-ignore a11y_no_noninteractive_tabindex (A região rolável precisa receber foco para exploração com as setas do teclado.) -->
				<div
					class="chart-viewport"
					bind:this={chartViewport}
					id={`${chartId}-viewport`}
					role="region"
					aria-label="Mandala ampliável"
					aria-describedby={`${chartId}-help`}
					tabindex="0"
				>
					<div class="chart-canvas" style:width={`${chartZoom * 100}%`}>
						<img
							class="mandala"
							src={chartSource}
							alt="Mandala do mapa calculado. Consulte os dados e a leitura deste resultado para compreender as posições."
							width="1000"
							height="1000"
						/>
					</div>
				</div>
			</section>
		{/if}
		<dl class="facts">
			{#each result.facts as fact (fact.id)}<div>
					<dt>{fact.label}</dt>
					<dd>{fact.value}</dd>
				</div>{/each}
		</dl>
		{#each result.sections as section (section.id)}<section class="card">
				<h2>{section.title}</h2>
				<p class="body">{section.body}</p>
			</section>{/each}
		{#if result.limits.length}<aside class="limits">
				<h2>Como usar este resultado</h2>
				<ul>
					{#each result.limits as limit, index (index)}<li>{limit}</li>{/each}
				</ul>
			</aside>{/if}
		<a class="btn btn-primary" href={freeToolById(result.tool)?.href ?? '/ferramentas'}
			>Voltar à ferramenta</a
		>
	</div>
</section>

<style>
	.reader {
		max-width: 60rem;
	}
	.reader > section,
	.limits {
		margin-block: 1.5rem;
	}
	.body {
		white-space: pre-wrap;
	}
	.chart-panel {
		margin-block: 1.5rem;
		margin-inline: auto;
		width: 100%;
		max-width: 46rem;
		box-sizing: border-box;
		padding: clamp(0.75rem, 2vw, 1.5rem);
		border: 1px solid var(--atv-border);
		border-top: 3px solid var(--universe-panel, #174c69);
		border-radius: var(--atv-radius-md);
		background: var(--atv-surface);
	}
	.chart-heading,
	.chart-controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}
	.chart-heading {
		justify-content: space-between;
		gap: 0.75rem;
	}
	.chart-heading h2 {
		margin: 0;
		font: 500 1.5rem/1.25 var(--atv-font-display);
	}
	.chart-heading .eyebrow {
		margin: 0 0 0.25rem;
	}
	.chart-help {
		font: 0.875rem/1.6 var(--atv-font-ui);
		color: var(--atv-text-secondary);
		max-width: 64ch;
	}
	.chart-controls {
		margin-block: 1rem;
		font-family: var(--atv-font-ui);
	}
	.chart-controls button,
	.chart-download {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		min-width: 44px;
		min-height: 44px;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-sm, 6px);
		background: var(--atv-surface);
		color: var(--atv-text-primary);
		font: 500 0.875rem/1.3 var(--atv-font-ui);
		text-decoration: none;
		cursor: pointer;
	}
	.chart-controls button:disabled {
		opacity: 0.45;
		cursor: default;
	}
	.chart-controls output {
		min-width: 3.5rem;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}
	.chart-controls button:focus-visible,
	.chart-download:focus-visible,
	.chart-viewport:focus-visible {
		outline: 3px solid var(--universe-panel, #174c69);
		outline-offset: 3px;
	}
	.chart-viewport {
		overflow: auto;
		max-height: min(75vh, 56rem);
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-sm, 6px);
		background: #faf7f0;
		overscroll-behavior: contain;
	}
	.chart-canvas {
		min-width: 100%;
	}
	.mandala {
		display: block;
		width: 100%;
		max-width: none;
		height: auto;
	}
	.facts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
		gap: 1rem;
	}
	.facts div {
		padding: 1rem;
		background: var(--atv-surface-raised);
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-md);
	}
	dt {
		font-weight: 600;
	}
	dd {
		margin: 0.5rem 0 0;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.limits {
		padding: 1.25rem;
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-md);
	}
	li {
		margin-block: 0.5rem;
	}
</style>
