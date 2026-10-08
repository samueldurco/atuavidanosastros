<script lang="ts">
	import type { SavedTrial } from '$lib/trials/reading';
	import { buildChartScene, chartSceneSvg, type ChartOptions } from '$lib/trials/chart-engine-v2';
	let { saved, onselect }: { saved: SavedTrial; onselect: (id: string) => void } = $props();
	let houses = $state(true),
		degrees = $state(true),
		aspects = $state<ChartOptions['aspects']>('major'),
		zoom = $state(false),
		selected = $state(''),
		message = $state('');
	let panel: HTMLDivElement;
	const chart = $derived.by(() => {
		try {
			const scene = buildChartScene(saved, { houses, degrees, aspects, selectedFactId: selected });
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
		saved.calculation.facts.filter(
			(f) =>
				f.id.startsWith('position-') ||
				f.id.startsWith('sample-') ||
				f.id.startsWith('date-transit-') ||
				['angle-ascendant', 'angle-midheaven'].includes(f.id)
		)
	);
	async function fullscreen() {
		try {
			await panel.requestFullscreen();
		} catch {
			message = 'Use o botão Ampliar para explorar o mapa.';
			zoom = true;
		}
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

<div class="chart-panel" bind:this={panel}>
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
	<div class="actions">
		<button onclick={() => (zoom = !zoom)} aria-pressed={zoom}
			>{zoom ? 'Ajustar à tela' : 'Ampliar'}</button
		><button onclick={fullscreen}>Tela cheia</button>
	</div>
	{#if chart.error}<p role="status">{chart.error}</p>{:else}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable map needs keyboard focus.) -->
		<div
			class="viewport"
			tabindex="0"
			role="region"
			aria-label="Mapa ampliável; use a rolagem quando ampliado"
		>
			<!-- The SVG is generated locally from validated numbers and escaped text. -->
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<div class:zoom>{@html chart.svg}</div>
		</div>
	{/if}
	<div class="factors" aria-label="Selecione um fator para abrir o capítulo relacionado">
		{#each factors as fact (fact.id)}<button
				aria-pressed={selected === fact.id}
				onclick={() => {
					selected = fact.id;
					onselect(fact.id);
				}}>{fact.display}</button
			>{/each}
	</div>
	{#if chart.svg}<div class="actions">
			<button onclick={() => download('svg')}>Baixar SVG</button><button
				onclick={() => download('png')}>Baixar PNG</button
			>
		</div>{/if}
	<p class="status" role="status">{message}</p>
</div>

<style>
	.chart-panel {
		background: #faf6ed;
		color: #24374b;
		padding: 1rem;
		border-radius: 1rem;
		max-width: 100%;
	}
	.chart-panel:fullscreen {
		overflow: auto;
		padding: 1.5rem;
	}
	fieldset {
		border: 1px solid #967536;
		border-radius: 0.65rem;
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		padding: 0.8rem;
	}
	legend {
		font-weight: 600;
		padding: 0 0.3rem;
	}
	label {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.9rem;
	}
	select,
	button {
		font: inherit;
		color: inherit;
		background: #fffdf8;
		border: 1px solid #967536;
		border-radius: 0.5rem;
		min-height: 44px;
		padding: 0.5rem 0.7rem;
	}
	button {
		cursor: pointer;
	}
	button[aria-pressed='true'] {
		border: 2px solid #24374b;
		background: #eee5d3;
	}
	button:focus-visible,
	select:focus-visible,
	input:focus-visible,
	.viewport:focus-visible {
		outline: 3px solid #365d7d;
		outline-offset: 3px;
	}
	.actions {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
		margin: 0.8rem 0;
	}
	.viewport {
		overflow: auto;
		max-width: 100%;
		border-radius: 0.7rem;
	}
	.viewport :global(svg) {
		display: block;
		width: 100%;
		height: auto;
		min-width: 0;
	}
	.viewport .zoom {
		width: 900px;
		max-width: none;
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
