<script lang="ts">
	import { onMount } from 'svelte';
	import {
		chartImageSource,
		chartPosition,
		chartWheelSvg
	} from '$lib/astrological-chart-presentation';
	let {
		svg,
		title = 'Seu mapa astral',
		positions = [],
		ascendant = null,
		midheaven = null,
		cusps = [],
		downloadName
	}: {
		svg: string;
		title?: string;
		positions?: { body: string; name: string; longitude: number }[];
		ascendant?: number | null;
		midheaven?: number | null;
		cusps?: number[];
		downloadName?: string;
	} = $props();
	const chartId = $props.id();
	let dialog: HTMLDialogElement;
	let openButton: HTMLButtonElement;
	let hydrated = $state(false);
	let expanded = $state(false);
	onMount(() => {
		hydrated = true;
	});
	const source = $derived(chartImageSource(chartWheelSvg(svg)));
	const originalSource = $derived(chartImageSource(svg));
	const hasAspects = $derived(svg.includes('data-layer="aspects"'));
	const rows = $derived([
		...positions.map((position) => ({
			name: position.name,
			...chartPosition(position.longitude, cusps)
		})),
		...(ascendant === null ? [] : [{ name: 'Ascendente', ...chartPosition(ascendant) }]),
		...(midheaven === null ? [] : [{ name: 'Meio do Céu', ...chartPosition(midheaven) }])
	]);
	function expand() {
		if (!hydrated || dialog.open) return;
		expanded = true;
		dialog.showModal();
	}
	function close() {
		// A queued close from an earlier opening must not clear a reopened map.
		if (dialog.open) return;
		expanded = false;
		openButton?.focus();
	}
</script>

<section class="astrological-chart" aria-labelledby={`${chartId}-heading`}>
	<div class="chart-heading">
		<h3 id={`${chartId}-heading`}>{title}</h3>
		<button
			type="button"
			class="expand"
			bind:this={openButton}
			onclick={expand}
			disabled={!hydrated}
			aria-haspopup="dialog"
		>
			<svg viewBox="0 0 24 24" aria-hidden="true"
				><circle cx="10" cy="10" r="6.5" /><path d="m15 15 5 5M7 10h6m-3-3v6" /></svg
			>
			Ampliar mapa
		</button>
	</div>
	<img
		class="wheel"
		src={source}
		width="820"
		height="820"
		alt={`${title}: roda com signos, planetas e posições calculadas.`}
	/>
	{#if hasAspects}
		<p class="aspect-key">
			<span class="harmonious">Harmônicos</span><span class="tensions">Tensões</span>
		</p>
	{/if}
	{#if rows.length}
		<details class="positions">
			<summary
				>Posições do mapa <span
					>{positions.length} astros{cusps.length === 12 ? ' · casas calculadas' : ''}</span
				></summary
			>
			<div class="table-scroll">
				<table>
					<caption>Signos, graus e casas das posições calculadas</caption>
					<thead
						><tr
							><th scope="col">Astro / ponto</th><th scope="col">Signo</th><th scope="col">Grau</th
							>{#if cusps.length === 12}<th scope="col">Casa</th>{/if}</tr
						></thead
					>
					<tbody
						>{#each rows as row (row.name)}<tr
								><th scope="row">{row.name}</th><td>{row.sign}</td><td>{row.degree}</td
								>{#if cusps.length === 12}<td>{row.house ?? '—'}</td>{/if}</tr
							>{/each}</tbody
					>
				</table>
			</div>
		</details>
	{/if}
	{#if downloadName}<a class="download" href={originalSource} download={downloadName}
			>Baixar mapa completo em SVG <span aria-hidden="true">↓</span></a
		>{/if}
</section>

<dialog
	class="chart-dialog"
	bind:this={dialog}
	aria-labelledby={`${chartId}-dialog-title`}
	onclose={close}
>
	<div class="dialog-heading">
		<div>
			<h2 id={`${chartId}-dialog-title`}>{title}</h2>
			<p>Deslize para explorar os símbolos e graus.</p>
		</div>
		<button type="button" onclick={() => dialog.close()}
			>Fechar <span aria-hidden="true">×</span></button
		>
	</div>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex (A área rolável recebe foco para exploração com o teclado.) -->
	<div
		class="expanded-wheel"
		role="region"
		aria-label="Mapa ampliado; use a rolagem para explorar"
		tabindex="0"
	>
		{#if expanded}
			<img src={source} width="820" height="820" alt={`${title} ampliado.`} />
		{/if}
	</div>
</dialog>

<style>
	.astrological-chart {
		min-width: 0;
		width: 100%;
		color: var(--atv-text-primary, #183746);
		border-block: 1px solid var(--atv-border, #c7bfac);
		padding-block: 1rem;
	}
	.chart-heading {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem 1rem;
	}
	.astrological-chart h3 {
		margin: 0;
		font: 500 1.5rem/1.2 var(--atv-font-display, Georgia, serif);
		letter-spacing: -0.02em;
	}
	button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		min-height: 44px;
		padding: 0.5rem 0.65rem;
		border: 1px solid var(--atv-border, #c7bfac);
		border-radius: 0.2rem;
		background: transparent;
		color: inherit;
		font: 500 0.8125rem/1.3 var(--atv-font-ui, sans-serif);
		cursor: pointer;
	}
	.expand svg {
		width: 1.15rem;
		height: 1.15rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.5;
	}
	.wheel {
		display: block;
		width: 100%;
		max-width: 48rem;
		height: auto;
		margin: 0.5rem auto;
	}
	.aspect-key {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1rem;
		margin: 0.25rem 0 1rem;
		color: var(--atv-text-secondary, #596365);
		font: 0.75rem/1.5 var(--atv-font-ui, sans-serif);
	}
	.aspect-key span {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}
	.aspect-key span::before {
		content: '';
		width: 1.25rem;
		border-top: 2px solid #174c69;
	}
	.aspect-key .tensions::before {
		border-color: #99513d;
		border-top-style: dashed;
	}
	.positions {
		border-top: 1px solid var(--atv-border, #c7bfac);
		font: 0.875rem/1.5 var(--atv-font-ui, sans-serif);
	}
	summary {
		cursor: pointer;
		padding-block: 0.9rem;
		font-weight: 600;
	}
	summary span {
		display: block;
		margin: 0.2rem 0 0 1rem;
		color: var(--atv-text-secondary, #596365);
		font-size: 0.75rem;
		font-weight: 400;
	}
	.table-scroll {
		max-width: 100%;
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
		font: 0.8125rem/1.5 var(--atv-font-ui, sans-serif);
	}
	caption {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
	th,
	td {
		padding: 0.65rem 0.4rem;
		border-bottom: 1px solid var(--atv-border, #c7bfac);
		white-space: nowrap;
	}
	th:first-child,
	td:first-child {
		padding-left: 0;
	}
	th:last-child,
	td:last-child {
		padding-right: 0;
	}
	thead th {
		color: var(--atv-text-secondary, #596365);
		font-size: 0.6875rem;
		font-weight: 500;
	}
	tbody th {
		font-weight: 500;
	}
	td {
		font-variant-numeric: tabular-nums;
	}
	.download {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		min-height: 44px;
		color: inherit;
		font: 500 0.8125rem/1.4 var(--atv-font-ui, sans-serif);
		text-underline-offset: 0.2rem;
	}
	.chart-dialog {
		box-sizing: border-box;
		width: min(66rem, calc(100vw - 2rem));
		max-width: none;
		max-height: calc(100dvh - 2rem);
		padding: 0;
		border: 1px solid #c7bfac;
		border-radius: 0.35rem;
		color: #183746;
		background: #f6efdf;
	}
	.chart-dialog::backdrop {
		background: rgb(16 44 61 / 70%);
	}
	.dialog-heading {
		position: sticky;
		top: 0;
		z-index: 1;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid #c7bfac;
		background: #f6efdf;
	}
	.dialog-heading h2 {
		margin: 0;
		font: 500 1.6rem/1.2 var(--atv-font-display, Georgia, serif);
	}
	.dialog-heading p {
		margin: 0.35rem 0 0;
		font: 0.8125rem/1.5 var(--atv-font-ui, sans-serif);
		color: #596365;
	}
	.dialog-heading button {
		flex-shrink: 0;
	}
	.expanded-wheel {
		max-height: calc(100dvh - 10rem);
		overflow: auto;
		overscroll-behavior: contain;
	}
	.expanded-wheel img {
		display: block;
		width: 100%;
		min-width: 760px;
		height: auto;
	}
	button:focus-visible,
	summary:focus-visible,
	.expanded-wheel:focus-visible,
	a:focus-visible {
		outline: 3px solid #174c69;
		outline-offset: 3px;
	}
	@media (max-width: 480px) {
		.chart-dialog {
			width: calc(100vw - 1rem);
			max-height: calc(100dvh - 1rem);
		}
		.dialog-heading {
			padding: 0.8rem;
			gap: 0.5rem;
		}
		.dialog-heading h2 {
			font-size: 1.4rem;
		}
		.dialog-heading p {
			max-width: 24ch;
		}
		.astrological-chart h3 {
			font-size: 1.4rem;
		}
	}
</style>
