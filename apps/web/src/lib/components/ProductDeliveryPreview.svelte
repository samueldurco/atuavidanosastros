<script lang="ts">
	import { chartImageSource, chartWheelSvg } from '$lib/astrological-chart-presentation';
	import natalSample from '$lib/data/home-reading-sample.json';
	import { readingSample, sampleTarotPositions } from '$lib/data/reading-samples';
	import { productDeliveryPresentation } from '$lib/data/product-delivery-presentation';
	import { mvpProductDesign } from '$lib/data/mvp-visual';
	import { tarotArtwork } from '$lib/trials/tarot-artwork';
	import MvpProductArt from './MvpProductArt.svelte';
	import '$lib/styles/mvp-product-art.css';
	let { productId }: { productId: string } = $props();
	let expanded = $state(false);
	const sample = $derived(readingSample(productId));
	const design = $derived(mvpProductDesign(productId));
	const presentation = $derived(
		productDeliveryPresentation[productId as keyof typeof productDeliveryPresentation]
	);
	const positions = $derived(sample ? sampleTarotPositions(sample) : []);
	const chart = chartImageSource(chartWheelSvg(natalSample.chart.svg));
</script>

{#if sample}
	<div
		class="delivery-preview"
		data-reading-sample={productId}
		data-family={presentation?.family}
		style:--delivery-ink={design?.ink}
		style:--delivery-tint={design?.tint}
	>
		<div class="scene-caption">
			<span>Abra. Explore. Leia com calma.</span><span>Prévia ilustrada · conteúdo fictício</span>
		</div>
		<div class="delivery-reader">
			<div class="reader-toolbar">
				<span class="window-dots" aria-hidden="true"><i></i><i></i><i></i></span><span
					>ATVNA <span aria-hidden="true">/</span> Leitura digital</span
				><span class="toolbar-mark" aria-hidden="true">✦</span>
			</div>
			<div class="open-reading">
				<div class="sample-visual-page">
					<p class="page-kicker">01 <span>Um olhar sobre a leitura</span></p>
					<h3 class="sample-title">{sample.title}</h3>
					<p class="context">{sample.context}</p>
					<div
						class="sample-illustration"
						class:chart-preview={sample.layout === 'chart'}
						class:cards-preview={!!sample.cards}
					>
						{#if sample.layout === 'chart'}
							<img
								src={chart}
								alt="Roda do mapa astral calculado para o perfil fictício de 12 de maio de 1998"
								width="440"
								height="440"
								loading="lazy"
							/>
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
										<span class="position"
											>{sample.cards.length === 3 ? positions[i].name : i + 1}</span
										>
										<img
											src={tarotArtwork(card.id)}
											alt={card.name}
											width="600"
											height="1040"
											loading="lazy"
										/>
										{#if sample.cards.length === 3}<span class="card-name">{card.name}</span
											>{:else}<span class="sr-only">{positions[i].name}</span>{/if}
									</li>
								{/each}
							</ol>
						{:else}
							<div class="engraved-page" aria-hidden="true"><MvpProductArt {productId} /></div>
						{/if}
					</div>
					{#if sample.cards}<p class="art-credit">
							{sample.cards.length} cartas de exemplo · Pamela Colman Smith · Rider–Waite–Smith
						</p>{/if}
					{#if sample.facts}<dl class="sample-facts">
							{#each sample.facts as fact (fact.label)}<div>
									<dt>{fact.label}</dt>
									<dd>{fact.value}</dd>
								</div>{/each}
						</dl>{/if}
					{#if presentation}<div class="reading-index">
							<p>Nesta leitura</p>
							<ol>
								{#each presentation.labels as label, i (label)}<li>
										<span aria-hidden="true">0{i + 1}</span>{label}
									</li>{/each}
							</ol>
						</div>{/if}
					<p class="page-imprint">A Tua Vida nos Astros <span aria-hidden="true">✦</span></p>
				</div>
				<div class="sample-copy-page">
					<div class="reader-header">
						<span>ATVNA</span><span>Amostra da leitura · fictícia</span>
					</div>
					<div class="sample-sections" class:expanded id={`sample-chapters-${productId}`}>
						{#each sample.sections as chapter, i (chapter.title)}
							<section class="reading-chapter" class:long={chapter.text.length > 420}>
								<span class="chapter-number" aria-hidden="true"
									>{String(i + 1).padStart(2, '0')}</span
								>
								<h4 class="reader-label">{chapter.title}</h4>
								<p class="excerpt">{chapter.text}</p>
							</section>
						{/each}
					</div>
					{#if sample.sections.some((chapter) => chapter.text.length > 420)}
						<button
							class="expand-sample"
							aria-expanded={expanded}
							aria-controls={`sample-chapters-${productId}`}
							onclick={() => (expanded = !expanded)}
						>
							{expanded ? 'Recolher os trechos' : 'Ler os trechos completos'}
							<span aria-hidden="true">{expanded ? '−' : '+'}</span>
						</button>
					{/if}
					{#if sample.cards && sample.cards.length !== 3}<ol
							class="position-key"
							aria-label="Legenda das posições"
						>
							{#each sample.cards as card, i (card.id)}<li>
									<strong>{positions[i].name}</strong><span>{card.name}</span>
								</li>{/each}
						</ol>{/if}
					<div class="page-ending" aria-hidden="true"><span></span>✦<span></span></div>
					<p class="reader-foot">Um exemplo do conteúdo, para você conhecer a leitura.</p>
				</div>
			</div>
		</div>
		<p class="sample-note">{sample.note}</p>
	</div>
{/if}

<style>
	.delivery-preview {
		--delivery-ink: #174c69;
		--delivery-tint: #dce7e7;
		min-width: 0;
		color: #183746;
	}
	.scene-caption {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		padding: 0 0 16px;
		font:
			500 11px/1.5 'Onest',
			sans-serif;
		letter-spacing: 0.04em;
		color: var(--delivery-ink);
	}
	.delivery-reader {
		border: 1px solid color-mix(in srgb, var(--delivery-ink) 35%, #f6efdf);
		border-radius: 12px;
		overflow: hidden;
		box-shadow:
			0 24px 55px #18374620,
			0 3px 0 #c7bfac;
		background: #fff8e9;
		min-width: 0;
	}
	.reader-toolbar {
		display: flex;
		align-items: center;
		gap: 18px;
		background: var(--delivery-ink);
		color: #fff8e9;
		padding: 14px 22px;
		font:
			500 11px/1.5 'Onest',
			sans-serif;
		letter-spacing: 0.04em;
	}
	.window-dots {
		display: flex;
		gap: 5px;
	}
	.window-dots i {
		display: block;
		width: 6px;
		height: 6px;
		border: 1px solid currentColor;
		border-radius: 50%;
		opacity: 0.7;
	}
	.toolbar-mark {
		margin-left: auto;
		font-size: 18px;
	}
	.open-reading {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
	}
	.sample-visual-page,
	.sample-copy-page {
		min-width: 0;
		padding: clamp(22px, 3.3vw, 44px);
		position: relative;
	}
	.sample-visual-page {
		background: var(--delivery-tint);
		background-image:
			linear-gradient(90deg, transparent 96%, #1837460c), url('/brand/mvp/assets/papel-fino.webp');
		background-blend-mode: multiply;
		border-right: 1px solid #18374620;
		display: flex;
		flex-direction: column;
	}
	.page-kicker {
		display: flex;
		gap: 12px;
		align-items: center;
		margin: 0 0 24px;
		font:
			500 11px/1.5 'Onest',
			sans-serif;
		color: var(--delivery-ink);
	}
	.page-kicker span {
		border-left: 1px solid currentColor;
		padding-left: 12px;
	}
	.sample-title {
		font:
			400 clamp(26px, 2.7vw, 36px)/1.08 'Newsreader',
			Georgia,
			serif;
		margin: 0 0 12px;
		color: var(--delivery-ink);
		text-wrap: balance;
	}
	.context {
		font:
			400 13px/1.7 'Onest',
			sans-serif;
		margin: 0;
		color: #183746;
	}
	.sample-illustration {
		display: grid;
		place-items: center;
		margin: 24px 0 20px;
		min-width: 0;
		position: relative;
	}
	.engraved-page {
		width: 100%;
		max-width: 390px;
		aspect-ratio: 600/440;
	}
	.engraved-page :global(.product-art) {
		height: 100% !important;
		min-height: 0 !important;
		aspect-ratio: 600/440;
		background: transparent !important;
		border: 0 !important;
	}
	.engraved-page :global(.pa-canvas) {
		height: 100% !important;
		min-height: 0 !important;
	}
	.chart-preview img {
		width: min(100%, 390px);
		height: auto;
		filter: drop-shadow(0 8px 12px #18374615);
	}
	.sample-facts {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 0 0 24px;
	}
	.sample-facts div {
		flex: 1 1 80px;
		border-top: 1px solid var(--delivery-ink);
		padding: 10px 8px;
		background: #fff8e963;
	}
	dt {
		font:
			500 10px/1.5 'Onest',
			sans-serif;
	}
	dd {
		margin: 5px 0 0;
		font:
			400 20px/1.15 'Newsreader',
			Georgia,
			serif;
		color: var(--delivery-ink);
	}
	.reading-index {
		margin-top: auto;
		border-top: 1px solid #18374630;
		padding-top: 15px;
	}
	.reading-index > p {
		font:
			500 10px/1.4 'Onest',
			sans-serif;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		margin: 0 0 10px;
	}
	.reading-index ol {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 8px;
	}
	.reading-index li {
		display: flex;
		gap: 13px;
		font:
			400 12px/1.5 'Onest',
			sans-serif;
	}
	.reading-index li span {
		color: var(--delivery-ink);
		font-size: 10px;
		padding-top: 1px;
	}
	.page-imprint {
		display: flex;
		justify-content: space-between;
		font:
			500 9px/1.5 'Onest',
			sans-serif;
		margin: 28px 0 0;
		letter-spacing: 0.04em;
	}
	.sample-copy-page {
		background: #fff8e9 url('/brand/mvp/assets/papel-fino.webp') center/cover;
		box-shadow: inset 8px 0 16px #18374605;
		display: flex;
		flex-direction: column;
	}
	.reader-header {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		border-bottom: 1px solid #c7bfac;
		padding-bottom: 14px;
		margin-bottom: 30px;
		font:
			500 10px/1.5 'Onest',
			sans-serif;
		color: var(--delivery-ink);
	}
	.sample-sections {
		display: grid;
		gap: 30px;
	}
	.reading-chapter {
		position: relative;
		min-width: 0;
	}
	.chapter-number {
		font:
			400 31px/1 'Newsreader',
			Georgia,
			serif;
		color: var(--delivery-ink);
		display: block;
		margin-bottom: 14px;
		opacity: 0.65;
	}
	.reader-label {
		font:
			400 clamp(23px, 2vw, 28px)/1.15 'Newsreader',
			Georgia,
			serif;
		margin: 0 0 14px;
		color: var(--delivery-ink);
		text-wrap: balance;
	}
	.excerpt {
		margin: 0;
		font:
			400 14px/1.9 'Onest',
			sans-serif;
		white-space: pre-line;
		overflow-wrap: anywhere;
	}
	.sample-sections:not(.expanded) .long .excerpt {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 7;
		line-clamp: 7;
		overflow: hidden;
	}
	.expand-sample {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 18px;
		width: 100%;
		min-height: 48px;
		margin-top: 24px;
		padding: 12px 0;
		border: 0;
		border-top: 1px solid #c7bfac;
		background: transparent;
		color: var(--delivery-ink);
		font:
			500 12px/1.6 'Onest',
			sans-serif;
		text-align: left;
		cursor: pointer;
	}
	.expand-sample span {
		font-size: 24px;
	}
	.expand-sample:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 4px;
	}
	.page-ending {
		display: flex;
		align-items: center;
		gap: 15px;
		color: var(--delivery-ink);
		margin: 32px 0 15px;
	}
	.page-ending span {
		height: 1px;
		background: #c7bfac;
		flex: 1;
	}
	.reader-foot {
		font:
			400 10px/1.6 'Onest',
			sans-serif;
		margin: 0;
		text-align: center;
		color: #596365;
	}
	.sample-note {
		max-width: 85ch;
		margin: 24px auto 0;
		font:
			400 12px/1.7 'Onest',
			sans-serif;
		text-align: center;
		color: #596365;
	}
	.tarot-board {
		position: relative;
		width: 100%;
		height: 420px;
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.tarot-board li {
		position: absolute;
		transform: translate(-50%, -50%);
		width: 17%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
	}
	.tarot-board img {
		width: 100%;
		height: auto;
		border: 2px solid #fff8e9;
		box-shadow: 0 5px 9px #18374625;
	}
	.position {
		font:
			500 9px/1.3 'Onest',
			sans-serif;
		text-align: center;
	}
	.tarot-board.three {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
		height: auto;
		padding: 10px 0 0;
		align-items: start;
	}
	.tarot-board.three li {
		position: static;
		transform: none;
		width: auto;
	}
	.tarot-board.three img {
		width: 100%;
		max-width: 108px;
	}
	.card-name {
		font:
			400 15px/1.2 'Newsreader',
			Georgia,
			serif;
		text-align: center;
	}
	.art-credit {
		font:
			400 9px/1.6 'Onest',
			sans-serif;
		text-align: center;
		margin: 0 0 22px;
	}
	.position-key {
		list-style: none;
		padding: 0;
		margin: 25px 0 0;
		border-top: 1px solid #c7bfac;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		padding-top: 20px;
	}
	.position-key li {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font:
			400 11px/1.5 'Onest',
			sans-serif;
	}
	.position-key strong {
		font-weight: 500;
		color: var(--delivery-ink);
	}
	@media (min-width: 1000px) {
		.delivery-reader {
			transform: perspective(2000px) rotateX(1deg);
		}
		.sample-copy-page {
			padding-top: 32px;
		}
	}
	@media (max-width: 700px) {
		.scene-caption {
			flex-direction: column;
			gap: 4px;
			font-size: 10px;
		}
		.open-reading {
			grid-template-columns: minmax(0, 1fr);
		}
		.delivery-reader {
			border-radius: 9px;
		}
		.reader-toolbar {
			padding: 12px 15px;
			gap: 12px;
			font-size: 10px;
		}
		.sample-visual-page {
			border-right: 0;
			border-bottom: 1px solid #18374625;
			padding: 24px 20px;
		}
		.sample-copy-page {
			padding: 24px 20px;
		}
		.sample-title {
			font-size: 30px;
		}
		.page-kicker {
			margin-bottom: 20px;
		}
		.sample-illustration {
			margin: 18px 0;
		}
		.engraved-page {
			max-width: 330px;
		}
		.chart-preview img {
			max-width: 330px;
		}
		.reader-label {
			font-size: 25px;
		}
		.excerpt {
			font-size: 14px;
			line-height: 1.85;
		}
		.reader-header {
			font-size: 9px;
			gap: 6px;
			margin-bottom: 25px;
		}
		.sample-note {
			text-align: left;
			font-size: 11px;
		}
		.sample-facts {
			gap: 6px;
		}
		.sample-facts div {
			flex-basis: 60px;
		}
		dd {
			font-size: 18px;
		}
		.tarot-board {
			height: 360px;
		}
		.tarot-board.three {
			gap: 8px;
		}
		.card-name {
			font-size: 13px;
		}
		.position {
			font-size: 8px;
		}
	}
</style>
