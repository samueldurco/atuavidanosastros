<script lang="ts">
	import { chartImageSource, chartWheelSvg } from '$lib/astrological-chart-presentation';
	import natalSample from '$lib/data/home-reading-sample.json';
	import { readingSample, sampleTarotPositions } from '$lib/data/reading-samples';
	import { mvpProductDesign } from '$lib/data/mvp-visual';
	import { tarotArtwork } from '$lib/trials/tarot-artwork';

	let { productId, expanded = false }: { productId: string; expanded?: boolean } = $props();
	const sample = $derived(readingSample(productId));
	const palette = $derived(mvpProductDesign(productId));
	const positions = $derived(sample ? sampleTarotPositions(sample) : []);
	const chart = chartImageSource(chartWheelSvg(natalSample.chart.svg));
</script>

{#if sample}
	<div
		class="preview {sample.layout}"
		class:expanded
		data-reading-sample={productId}
		style:--preview-field={sample.layout === 'editorial' ? palette?.tint : undefined}
		style:--preview-ink={sample.layout === 'editorial' ? palette?.ink : undefined}
	>
		<div class="reader">
			<div class="reader-header"><span>ATVNA</span><span>Amostra da leitura · fictícia</span></div>
			<p class="sample-title">{sample.title}</p>
			<p class="context">{sample.context}</p>
			{#if sample.layout === 'chart'}
				<div class="chart-preview">
					<img
						src={chart}
						alt="Roda do mapa astral calculado para o perfil fictício de 12 de maio de 1998"
						width="360"
						height="360"
						loading="lazy"
					/>
					<div>
						<p class="reader-label">Sol e Lua · trecho da leitura</p>
						<p class="excerpt">
							{expanded ? sample.sections[0].text : sample.sections[0].text.split('. ')[0] + '.'}
						</p>
					</div>
				</div>
			{:else if sample.cards}
				<ol
					class="tarot-board"
					class:three={sample.cards.length === 3}
					style:--count={sample.cards.length}
					aria-label="Posições e cartas da demonstração"
				>
					{#each sample.cards as card, i (card.id)}
						<li
							style:left={sample.cards.length === 3 ? undefined : `${positions[i].x}%`}
							style:top={sample.cards.length === 3 ? undefined : `${positions[i].y}%`}
						>
							<span class="position">{sample.cards.length === 3 ? positions[i].name : i + 1}</span>
							<img
								src={tarotArtwork(card.id)}
								alt={card.name}
								width="600"
								height="1040"
								loading="lazy"
							/>
							{#if sample.cards.length === 3}<span class="card-name">{card.name}</span>{/if}
							<span class="sr-only">{sample.cards.length === 3 ? '' : positions[i].name}</span>
						</li>
					{/each}
				</ol>
				<p class="credit">
					{sample.cards.length} cartas de exemplo · Pamela Colman Smith · Rider–Waite–Smith
				</p>
			{:else if sample.facts}
				<dl class="sample-facts">
					{#each sample.facts as fact (fact.label)}<div>
							<dt>{fact.label}</dt>
							<dd>{fact.value}</dd>
						</div>{/each}
				</dl>
			{/if}
			{#if sample.layout !== 'chart' || expanded}
				<div class="sample-sections">
					{#each expanded ? sample.sections : sample.sections.slice(0, 1) as chapter, i (chapter.title)}
						{#if sample.layout !== 'chart' || i > 0}
							<section>
								<p class="reader-label">{chapter.title}</p>
								<p class="excerpt">{chapter.text}</p>
							</section>
						{/if}
					{/each}
				</div>
			{/if}
			{#if expanded && sample.cards && sample.cards.length !== 3}
				<ol class="position-key" aria-label="Legenda das posições">
					{#each sample.cards as card, i (card.id)}<li>
							<strong>{positions[i].name}</strong><span>{card.name}</span>
						</li>{/each}
				</ol>
			{/if}
			<p class="sample-note">{expanded ? sample.note : 'Exemplo ilustrativo · dados fictícios'}</p>
		</div>
	</div>
{/if}

<style>
	.preview {
		width: 100%;
		--preview-field: #dce7e7;
		--preview-ink: #23505e;
		box-sizing: border-box;
		display: grid;
		place-items: center;
		min-height: 19rem;
		height: 100%;
		padding: clamp(0.8rem, 2vw, 1.65rem);
		background: var(--preview-field);
		color: #173e4a;
	}
	.tarot {
		--preview-field: #ebd9b8;
		--preview-ink: #80522d;
	}
	.dream,
	.journal {
		--preview-field: #e3dfec;
		--preview-ink: #5a4b73;
	}
	.pair {
		--preview-field: #e9dce0;
		--preview-ink: #824c5f;
	}
	.period {
		--preview-field: #dce4d6;
		--preview-ink: #536447;
	}
	.editorial {
		--preview-field: #e8dfcc;
		--preview-ink: #6b5941;
	}
	.reader {
		box-sizing: border-box;
		width: 100%;
		max-width: 29rem;
		padding: 0.85rem;
		border: 1px solid color-mix(in srgb, var(--preview-ink) 45%, #fff8e9);
		background: #fff9ed;
		box-shadow: 0 7px 18px #18374618;
	}
	.reader-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		border-bottom: 1px solid #c9ccbd;
		padding-bottom: 0.55rem;
		margin-bottom: 0.8rem;
		font:
			500 0.6rem/1.4 'Onest',
			Arial,
			sans-serif;
		letter-spacing: 0.04em;
		color: var(--preview-ink);
	}
	.sample-title {
		margin: 0 0 0.55rem;
		font:
			500 1.1rem/1.15 'Newsreader',
			Georgia,
			serif;
	}
	.context,
	.excerpt {
		margin: 0;
		font:
			400 0.73rem/1.65 'Onest',
			Arial,
			sans-serif;
		white-space: pre-line;
	}
	.context {
		color: #4b605e;
		margin-bottom: 0.85rem;
	}
	.reader-label {
		margin: 0 0 0.4rem;
		color: var(--preview-ink);
		font:
			600 0.64rem/1.45 'Onest',
			Arial,
			sans-serif;
	}
	.sample-sections {
		display: grid;
		gap: 1.25rem;
	}
	.sample-facts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(5rem, 1fr));
		gap: 0.5rem;
		margin: 0 0 1rem;
	}
	.sample-facts div {
		padding: 0.5rem;
		border-top: 2px solid var(--preview-ink);
		background: color-mix(in srgb, var(--preview-field) 40%, transparent);
	}
	dt {
		font:
			500 0.61rem/1.5 'Onest',
			Arial,
			sans-serif;
		color: var(--preview-ink);
	}
	dd {
		margin: 0.2rem 0 0;
		overflow-wrap: anywhere;
		font:
			500 0.88rem/1.2 'Newsreader',
			Georgia,
			serif;
	}
	.chart-preview {
		display: grid;
		grid-template-columns: 0.9fr 1fr;
		gap: 0.7rem;
		align-items: center;
	}
	.chart-preview img {
		display: block;
		width: 100%;
		height: auto;
	}
	.sample-note,
	.credit {
		margin: 0.8rem 0 0;
		font:
			400 0.6rem/1.5 'Onest',
			Arial,
			sans-serif;
		color: #626455;
	}
	.sample-note {
		border-top: 1px solid #d2d1c1;
		padding-top: 0.5rem;
	}
	.tarot-board {
		position: relative;
		aspect-ratio: 1.2;
		padding: 0;
		margin: 0.5rem auto;
		max-width: 30rem;
		list-style: none;
	}
	.tarot-board li {
		position: absolute;
		width: 11%;
		transform: translate(-50%, -50%);
		text-align: center;
	}
	.tarot-board img {
		display: block;
		width: 100%;
		height: auto;
		border: 1px solid #b4a486;
	}
	.position {
		display: block;
		color: var(--preview-ink);
		font:
			600 0.58rem/1.5 'Onest',
			Arial,
			sans-serif;
	}
	.tarot-board.three {
		aspect-ratio: auto;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.8rem;
	}
	.three li {
		position: static;
		width: auto;
		transform: none;
	}
	.three img {
		width: 72%;
		max-width: 7rem;
		margin: 0.3rem auto;
	}
	.card-name {
		display: block;
		font:
			500 0.65rem/1.4 'Onest',
			Arial,
			sans-serif;
	}
	.position-key {
		columns: 2;
		column-gap: 2rem;
		padding-left: 1.5rem;
		margin: 1.5rem 0;
		font:
			400 0.85rem/1.6 'Onest',
			Arial,
			sans-serif;
	}
	.position-key li {
		break-inside: avoid;
		padding: 0 0 0.7rem 0.2rem;
	}
	.position-key strong,
	.position-key span {
		display: block;
	}
	.preview:not(.expanded) .context,
	.preview:not(.expanded) .sample-sections .excerpt {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		overflow: hidden;
	}
	.preview:not(.expanded) .context {
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}
	.expanded {
		height: auto;
		padding: clamp(1rem, 4vw, 3.5rem);
	}
	.expanded .reader {
		max-width: 60rem;
		padding: clamp(1rem, 4vw, 3rem);
	}
	.expanded .reader-header,
	.expanded .reader-label {
		font-size: 0.78rem;
	}
	.expanded .sample-title {
		font-size: clamp(1.5rem, 3vw, 2.5rem);
	}
	.expanded .context,
	.expanded .excerpt {
		font-size: 1rem;
		line-height: 1.85;
	}
	.expanded .context {
		margin-bottom: 1.5rem;
	}
	.expanded .sample-facts {
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: 1rem;
		margin-bottom: 1.75rem;
	}
	.expanded .sample-facts div {
		padding: 1rem;
	}
	.expanded dt,
	.expanded .position,
	.expanded .card-name {
		font-size: 0.8rem;
	}
	.expanded dd {
		font-size: 1.3rem;
	}
	.expanded .sample-note,
	.expanded .credit {
		font-size: 0.75rem;
	}
	.expanded .chart-preview {
		grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr);
		margin-bottom: 2rem;
		gap: 2rem;
	}
	.expanded .tarot-board {
		margin: 2rem auto;
	}
	.expanded .tarot-board.three {
		max-width: 32rem;
	}
	@media (max-width: 600px) {
		.expanded .chart-preview {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
		.expanded .chart-preview img {
			max-width: 22rem;
			margin: auto;
		}
		.position-key {
			columns: 1;
		}
	}
</style>
