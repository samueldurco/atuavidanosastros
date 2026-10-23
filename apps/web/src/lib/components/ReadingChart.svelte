<script lang="ts">
	import type { SavedTrial } from '$lib/trials/reading';
	import { buildChartScene, chartSceneSvg, type ChartOptions } from '$lib/trials/chart-engine-v2';
	import { formatCareerCompassFactDisplay } from '$lib/career-compass-fact-presentation';
	import AstrologicalChart from './AstrologicalChart.svelte';
	let { saved, onselect }: { saved: SavedTrial; onselect: (id: string) => void } = $props();
	let houses = $state(true),
		degrees = $state(true),
		aspects = $state<ChartOptions['aspects']>('major'),
		selected = $state(''),
		message = $state('');
	let weekDay = $state(0);
	let solarView = $state<ChartOptions['solarView']>('return');
	const weekDays = $derived(
		[
			'atv-private-week-synthesis/4.0.0',
			'atv-private-calendar-synthesis/4.0.0',
			'atv-private-thirty-day-synthesis/1.0.0'
		].includes(saved.calculation.version)
			? (saved.calculation.data.days as { date: string }[])
			: []
	);
	const chart = $derived.by(() => {
		try {
			const scene = buildChartScene(saved, {
				houses,
				degrees,
				aspects,
				selectedFactId: selected,
				weekDay,
				solarView
			});
			return { svg: chartSceneSvg(scene), width: scene.width, height: scene.height, error: '' };
		} catch {
			return {
				svg: '',
				width: 900,
				height: 1100,
				error:
					'Não foi possível apresentar o gráfico desta versão. Os fatos calculados continuam disponíveis abaixo.'
			};
		}
	});
	const factors = $derived(
		saved.calculation.facts.filter((f) => {
			if (saved.calculation.version === 'atv-private-solar-synthesis/4.0.0')
				return solarView === 'return'
					? /^return-(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|ascendant|midheaven)$/.test(
							f.id
						)
					: f.id.startsWith('position-') || ['angle-ascendant', 'angle-midheaven'].includes(f.id);
			return (
				f.id.startsWith(`calendar-position-${weekDays[weekDay]?.date}-`) ||
				f.id.startsWith('position-') ||
				f.id.startsWith('sample-') ||
				f.id.startsWith('date-transit-') ||
				f.id.startsWith('return-') ||
				/^person-[ab]-(position-|angle-)/.test(f.id) ||
				(f.id.startsWith('cross-') &&
					saved.reading.sections.slice(0, -1).some((s) => s.factIds.includes(f.id))) ||
				['angle-ascendant', 'angle-midheaven'].includes(f.id)
			);
		})
	);
	function factorDisplay(display: string) {
		if (saved.product_id === 'career-compass') return formatCareerCompassFactDisplay(display);
		return saved.calculation.version === 'atv-private-solar-synthesis/4.0.0'
			? display.replace(/(\d+\.\d{2})\d+(?=°)/g, '$1').replace(/ da candidata\b/g, '')
			: display;
	}
	async function download(format: 'svg' | 'png') {
		let source = '',
			output = '';
		message = 'Preparando imagem…';
		try {
			const blob = new Blob([chart.svg], { type: 'image/svg+xml;charset=utf-8' });
			if (format === 'svg') output = URL.createObjectURL(blob);
			else {
				source = URL.createObjectURL(blob);
				const image = new Image();
				image.src = source;
				await image.decode();
				const canvas = document.createElement('canvas');
				canvas.width = 2700;
				canvas.height = Math.round((2700 * chart.height) / chart.width);
				const ctx = canvas.getContext('2d');
				if (!ctx) throw Error('Não foi possível preparar a imagem.');
				ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
				const png = await new Promise<Blob>((resolve, reject) =>
					canvas.toBlob(
						(b) => (b ? resolve(b) : reject(Error('Não foi possível preparar a imagem.'))),
						'image/png'
					)
				);
				output = URL.createObjectURL(png);
			}
			const link = document.createElement('a');
			link.href = output;
			link.download = `${saved.product_id}-${saved.id}.${format}`;
			link.click();
			message = 'Imagem pronta. Confira os downloads do navegador.';
		} catch (e) {
			message = e instanceof Error ? e.message : 'Não foi possível preparar a imagem.';
		} finally {
			if (source) URL.revokeObjectURL(source);
			if (output) setTimeout(() => URL.revokeObjectURL(output), 1000);
		}
	}
</script>

<div class="chart-panel">
	{#if saved.calculation.version === 'atv-private-solar-synthesis/4.0.0'}
		<label
			>Carta apresentada <select bind:value={solarView}
				><option value="return">Revolução Solar · carta anual</option><option value="natal"
					>Mapa natal · referência do ciclo</option
				></select
			></label
		>
	{/if}
	{#if weekDays.length}
		<label
			>Data do céu apresentado <select
				bind:value={weekDay}
				onchange={() =>
					onselect(
						saved.product_id === 'personal-calendar'
							? `calendar-day-${weekDays[weekDay].date}`
							: `week-day-${weekDay + 1}`
					)}
				>{#each weekDays as day, i (day.date)}<option value={i}>{day.date} · 12h UTC</option
					>{/each}</select
			></label
		>
	{/if}
	<fieldset>
		<legend>Explore o seu mapa</legend>
		<label><input type="checkbox" bind:checked={houses} /> Casas disponíveis</label>
		<label><input type="checkbox" bind:checked={degrees} /> Graus</label>
		<label
			>Aspectos <select bind:value={aspects}
				><option value="major">Principais</option><option value="harmonious">Harmônicos</option
				><option value="tensions">Tensões</option><option value="none">Ocultar</option></select
			></label
		>
	</fieldset>
	{#if chart.error}<p role="status">{chart.error}</p>{:else}
		<AstrologicalChart svg={chart.svg} title="Mapa desta leitura" />
	{/if}
	<details class="map-factors">
		<summary>Posições e capítulos relacionados</summary>
		<div class="factors" aria-label="Selecione um fator para abrir o capítulo relacionado">
			{#each factors as fact (fact.id)}<button
					aria-pressed={selected === fact.id}
					onclick={() => {
						selected = fact.id;
						onselect(fact.id);
					}}>{factorDisplay(fact.display)}</button
				>{/each}
		</div>
	</details>
	{#if chart.svg}<div class="actions">
			<button onclick={() => download('svg')}>Baixar SVG</button><button
				onclick={() => download('png')}>Baixar PNG</button
			>
		</div>{/if}
	<p class="status" role="status">{message}</p>
</div>

<style>
	.chart-panel {
		color: var(--atv-text-primary, #183746);
		max-width: 100%;
		min-width: 0;
	}
	fieldset {
		min-width: 0;
		border: 1px solid var(--atv-border, #c7bfac);
		border-radius: 0.2rem;
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		padding: 0.8rem;
		margin: 1rem 0;
	}
	legend {
		font-weight: 600;
		padding: 0 0.3rem;
	}
	label {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.9rem;
	}
	select,
	button {
		font: inherit;
		color: inherit;
		background: var(--atv-surface, #f6efdf);
		border: 1px solid var(--atv-border, #c7bfac);
		border-radius: 0.2rem;
		min-height: 44px;
		padding: 0.5rem 0.7rem;
	}
	button {
		cursor: pointer;
	}
	select {
		min-width: 0;
		max-width: 100%;
	}
	button[aria-pressed='true'] {
		border-color: #174c69;
		background: #174c6912;
	}
	button:focus-visible,
	select:focus-visible,
	input:focus-visible,
	summary:focus-visible {
		outline: 3px solid #31566a;
		outline-offset: 3px;
	}
	.actions {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
		margin: 0.8rem 0;
	}
	.map-factors {
		padding-block: 0.9rem;
		border-bottom: 1px solid var(--atv-border, #c7bfac);
		font-size: 0.875rem;
	}
	summary {
		font-weight: 600;
		cursor: pointer;
	}
	.factors {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 0.8rem 0;
	}
	.factors button {
		text-align: left;
		font-size: 0.85rem;
	}
	.status {
		font-size: 0.85rem;
		min-height: 1.4em;
	}
</style>
