<script lang="ts">
	import { chartImageSource, chartWheelSvg } from '$lib/astrological-chart-presentation';
	import natalSample from '$lib/data/home-reading-sample.json';
	import { readingSample } from '$lib/data/reading-samples';
	import { customerProduct } from '$lib/data/product-copy';
	import { formatLabels } from '$lib/data/product-details';
	import MvpProductArt from './MvpProductArt.svelte';
	let {
		productId,
		formats,
		planned = true
	}: { productId: string; formats: readonly string[]; planned?: boolean } = $props();
	const sample = $derived(readingSample(productId));
	const product = $derived(customerProduct(productId));
	const chart = chartImageSource(chartWheelSvg(natalSample.chart.svg));
	const description: Record<string, string> = {
		web: 'O conteúdo em uma leitura digital, para explorar na tela.',
		pdf: 'As páginas da leitura em um arquivo para baixar e consultar.',
		svg: 'O desenho do mapa em um arquivo de imagem separado.',
		audio: 'A leitura também em formato de áudio, conforme a proposta do produto.',
		club: 'Um espaço na sua conta para acompanhar suas leituras.'
	};
</script>

{#if sample && product}
	<div class="delivery-formats" data-delivery-formats>
		{#each formats as format (format)}
			<figure class="delivery-format" data-delivery-format={format}>
				<div class="format-scene">
					{#if format === 'web' || format === 'club'}
						<div class="format-mockup phone-mockup">
							<div class="phone-speaker" aria-hidden="true"></div>
							<div class="phone-screen">
								<div class="mini-brand">ATVNA <span aria-hidden="true">✦</span></div>
								<div class="screen-art" aria-hidden="true"><MvpProductArt {productId} /></div>
								<p class="mini-title">{product.name}</p>
								<div class="mini-divider"></div>
								<p class="mini-section">{sample.sections[0].title}</p>
								<p class="mini-text">{sample.sections[0].text.split('. ')[0]}.</p>
							</div>
							<div class="phone-home" aria-hidden="true"></div>
						</div>
					{:else if format === 'pdf'}
						<div class="format-mockup pdf-mockup">
							<div class="pdf-sheet">
								<div class="mini-brand">ATVNA <span>PDF</span></div>
								<div class="pdf-art" aria-hidden="true"><MvpProductArt {productId} /></div>
								<p class="mini-title">{product.name}</p>
								<div class="mini-divider"></div>
								<p class="mini-section">{sample.sections[0].title}</p>
								<p class="mini-text">{sample.sections[0].text.split('. ')[0]}.</p>
								<span class="page-star" aria-hidden="true">✦</span>
							</div>
						</div>
					{:else if format === 'svg'}
						<div class="format-mockup map-mockup">
							<div class="mini-brand">ATVNA <span>SVG</span></div>
							<img
								src={chart}
								alt="Exemplo de imagem do mapa do perfil fictício"
								width="300"
								height="300"
								loading="lazy"
							/>
							<p class="mini-section">Seu mapa, em imagem</p>
							<p class="image-label">Exemplo com dados fictícios</p>
						</div>
					{:else if format === 'audio'}
						<div class="format-mockup audio-mockup">
							<div class="mini-brand">ATVNA <span>ÁUDIO</span></div>
							<div class="audio-art" aria-hidden="true"><MvpProductArt {productId} /></div>
							<p class="mini-title">{product.name}</p>
							<div class="waveform" aria-hidden="true">
								{#each Array.from({ length: 27 }, (_, i) => i) as i (i)}<span
										style:height={`${12 + ((i * 17 + 9) % 35)}px`}
									></span>{/each}
							</div>
							<p class="image-label">{planned ? 'Formato previsto' : 'Apresentação do formato'}</p>
						</div>
					{/if}
				</div>
				<figcaption>
					<p class="format-eyebrow">{planned ? 'Formato previsto' : 'Formato digital'}</p>
					<h3>{formatLabels[format]}</h3>
					<p>{description[format]}</p>
				</figcaption>
			</figure>
		{/each}
	</div>
	<p class="format-disclaimer">
		Mockups ilustrativos com conteúdo fictício.{planned
			? ' Os formatos e a apresentação final serão confirmados na liberação do produto.'
			: ' A apresentação adapta-se à tela e ao conteúdo da sua leitura.'}
	</p>
{/if}

<style>
	.delivery-formats {
		display: flex;
		flex-wrap: wrap;
		gap: 24px;
		min-width: 0;
	}
	.delivery-format {
		margin: 0;
		flex: 1 1 260px;
		min-width: 0;
	}
	.format-scene {
		min-height: 390px;
		display: grid;
		place-items: center;
		padding: 30px 25px;
		background: var(--product-tint, #dce7e7);
		background-image: url('/brand/mvp/assets/papel-fino.webp');
		background-blend-mode: multiply;
		overflow: hidden;
		position: relative;
	}
	.format-scene::before {
		content: '';
		position: absolute;
		width: 300px;
		height: 300px;
		border: 1px solid color-mix(in srgb, var(--product-ink, #174c69) 20%, transparent);
		border-radius: 50%;
		pointer-events: none;
	}
	.format-mockup {
		position: relative;
		box-sizing: border-box;
		min-width: 0;
		color: #183746;
		isolation: isolate;
		box-shadow: 12px 18px 24px #18374622;
	}
	.phone-screen,
	.pdf-sheet,
	.map-mockup,
	.audio-mockup {
		background-image: url('/brand/mvp/assets/papel-fino.webp') !important;
		background-size: cover !important;
	}
	.mini-brand {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		font:
			500 8px/1.5 'Onest',
			sans-serif;
		letter-spacing: 0.08em;
		border-bottom: 1px solid #c7bfac;
		padding-bottom: 8px;
	}
	.mini-title {
		font:
			400 22px/1.06 'Newsreader',
			Georgia,
			serif;
		margin: 10px 0;
		overflow-wrap: anywhere;
	}
	.mini-divider {
		height: 1px;
		background: #c7bfac;
		margin: 12px 0;
	}
	.mini-section {
		font:
			500 10px/1.5 'Onest',
			sans-serif;
		margin: 0 0 6px;
	}
	.mini-text {
		font:
			400 9px/1.65 'Onest',
			sans-serif;
		margin: 0;
	}
	.phone-mockup {
		width: 204px;
		border: 5px solid #183746;
		border-radius: 28px;
		background: #183746;
		box-shadow:
			12px 18px 24px #18374622,
			1px 0 0 2px #a8997c;
		padding: 8px 0 5px;
		transform: rotate(-3deg);
	}
	.phone-speaker {
		width: 40px;
		height: 4px;
		background: #f6efdf70;
		border-radius: 5px;
		margin: 0 auto 9px;
	}
	.phone-screen {
		padding: 14px;
		background: #fff8e9;
		border-radius: 14px;
		min-height: 300px;
	}
	.phone-home {
		width: 50px;
		height: 3px;
		background: #f6efdf80;
		border-radius: 3px;
		margin: 9px auto 0;
	}
	.screen-art {
		width: 100%;
		height: 100px;
		margin-top: 8px;
	}
	.phone-mockup .mini-title {
		font-size: 21px;
	}
	.pdf-mockup {
		width: min(100%, 245px);
		transform: rotate(4deg);
		background: #fff8e9;
	}
	.pdf-mockup::before,
	.pdf-mockup::after {
		content: '';
		position: absolute;
		inset: 0 14px 0 0;
		background: #fff8e9;
		border: 1px solid #c7bfac;
		z-index: -1;
		transform: translate(-6px, 5px) rotate(-3deg);
	}
	.pdf-mockup::after {
		transform: translate(-10px, 9px) rotate(-5deg);
	}
	.pdf-sheet {
		position: relative;
		border: 1px solid #c7bfac;
		padding: 18px;
		background: #fff8e9;
		min-height: 315px;
	}
	.pdf-art {
		width: 100%;
		height: 125px;
	}
	.page-star {
		display: block;
		margin-top: 16px;
		text-align: center;
		font-size: 13px;
		color: var(--product-ink, #174c69);
	}
	.map-mockup {
		width: min(100%, 285px);
		background: #fff8e9;
		border: 1px solid #c7bfac;
		padding: 18px;
		transform: rotate(-3deg);
	}
	.map-mockup img {
		width: 100%;
		height: auto;
		margin: 12px 0;
	}
	.map-mockup .mini-section {
		text-align: center;
	}
	.image-label {
		font:
			400 9px/1.6 'Onest',
			sans-serif;
		margin: 10px 0 0;
		text-align: center;
	}
	.audio-mockup {
		width: min(100%, 260px);
		background: #fff8e9;
		padding: 20px;
		border: 1px solid #c7bfac;
		transform: rotate(3deg);
	}
	.audio-art {
		height: 150px;
		width: 100%;
		margin: 10px 0;
	}
	.waveform {
		display: flex;
		gap: 3px;
		align-items: center;
		justify-content: center;
		min-height: 60px;
		margin-top: 12px;
		border-top: 1px solid #c7bfac;
		border-bottom: 1px solid #c7bfac;
		padding: 10px 0;
	}
	.waveform span {
		width: 3px;
		border-radius: 2px;
		background: var(--product-ink, #174c69);
	}
	.screen-art :global(.product-art),
	.pdf-art :global(.product-art),
	.audio-art :global(.product-art) {
		height: 100% !important;
		min-height: 0 !important;
		aspect-ratio: 600/440;
		background: transparent !important;
		border: 0 !important;
	}
	.screen-art :global(.pa-canvas),
	.pdf-art :global(.pa-canvas),
	.audio-art :global(.pa-canvas) {
		height: 100% !important;
		min-height: 0 !important;
	}
	figcaption {
		padding: 22px 0 0;
	}
	figcaption .format-eyebrow {
		font:
			500 10px/1.5 'Onest',
			sans-serif;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		margin: 0 0 8px;
		color: var(--product-ink, #174c69);
	}
	figcaption h3 {
		font:
			400 28px/1.1 'Newsreader',
			Georgia,
			serif;
		margin: 0 0 10px;
		color: var(--product-ink, #174c69);
	}
	figcaption > p:last-child {
		font:
			400 13px/1.7 'Onest',
			sans-serif;
		margin: 0;
		max-width: 42ch;
	}
	.format-disclaimer {
		font:
			400 11px/1.7 'Onest',
			sans-serif;
		color: #596365;
		margin: 28px 0 0;
		max-width: 85ch;
	}
	@media (min-width: 701px) {
		.delivery-format:only-child {
			display: grid;
			grid-template-columns: minmax(260px, 0.9fr) minmax(0, 1fr);
			gap: 48px;
			align-items: center;
		}
		.delivery-format:only-child figcaption {
			padding: 0;
		}
		.delivery-format:only-child figcaption h3 {
			font-size: 38px;
		}
	}
	@media (max-width: 700px) {
		.delivery-formats {
			gap: 35px;
		}
		.delivery-format {
			flex-basis: 100%;
		}
		.format-scene {
			min-height: 370px;
			padding: 28px 24px;
		}
		.format-mockup {
			max-width: calc(100% - 12px);
		}
		figcaption {
			padding-top: 18px;
		}
		figcaption h3 {
			font-size: 27px;
		}
		.format-disclaimer {
			font-size: 11px;
		}
	}
</style>
