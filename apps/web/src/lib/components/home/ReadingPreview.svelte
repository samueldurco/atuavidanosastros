<script lang="ts">
	import { tarotMethodFor } from '@atv/domain';
	import { chartImageSource, chartWheelSvg } from '$lib/astrological-chart-presentation';
	import sample from '$lib/data/home-reading-sample.json';
	import { tarotArtwork } from '$lib/trials/tarot-artwork';

	let { productId }: { productId: string } = $props();
	const chart = chartImageSource(chartWheelSvg(sample.chart.svg));
	const chapter = sample.excerpts[0];
	const opening = chapter.text.split('. ')[0] + '.';
	const positions = tarotMethodFor('tarot-situation-challenge-advice')!.positions;
	const cards = [
		{ id: 'major-17', name: 'A Estrela' },
		{ id: 'major-9', name: 'O Eremita' },
		{ id: 'major-14', name: 'A Temperança' }
	];
</script>

<div class="preview" data-reading-sample={productId}>
	<div class="reader">
		<div class="reader-header">
			<span>ATVNA</span><span>Amostra da leitura</span>
		</div>
		{#if productId === 'birth-chart'}
			<div class="chart-preview">
				<img
					src={chart}
					alt="Roda do mapa astral calculado para um perfil fictício"
					width="160"
					height="160"
					loading="lazy"
				/>
				<div>
					<p class="reader-label">Perfil fictício · Sol e Lua</p>
					<p class="reader-title">{chapter.title}</p>
					<p class="excerpt">{opening}</p>
				</div>
			</div>
		{:else if productId === 'tarot-situation-challenge-advice'}
			<ol class="tarot-preview" aria-label="Tiragem de exemplo">
				{#each cards as card, i (card.id)}
					<li>
						<span class="reader-label">{positions[i].name}</span>
						<img src={tarotArtwork(card.id)} alt="" width="600" height="1040" loading="lazy" />
						<span class="card-name">{card.name}</span>
					</li>
				{/each}
			</ol>
			<p class="excerpt tarot-excerpt">
				A Temperança sugere retomar a conversa aos poucos. Combine quando voltar ao assunto e comece
				por uma pergunta.
			</p>
			<p class="credit">Cartas de Pamela Colman Smith · Rider–Waite–Smith</p>
		{:else}
			<div class="dream-preview">
				<p class="reader-label">Trecho do relato fictício</p>
				<blockquote>“Sonhei com uma ponte e senti curiosidade.”</blockquote>
				<p class="reader-label">Associação pessoal · Travessia</p>
				<p class="excerpt">
					Você associou a ponte a uma travessia. A curiosidade dá à cena um tom de aproximação e
					abre uma pergunta sobre o que havia do outro lado.
				</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.preview {
		--preview-field: #dce7e7;
		--preview-ink: #23505e;
		box-sizing: border-box;
		display: grid;
		place-items: center;
		min-height: 100%;
		padding: clamp(0.75rem, 2vw, 1.65rem);
		background: var(--preview-field);
	}
	.preview[data-reading-sample='tarot-situation-challenge-advice'] {
		--preview-field: #ebd9b8;
		--preview-ink: #80522d;
	}
	.preview[data-reading-sample='dream-reading'] {
		--preview-field: #e3dfec;
		--preview-ink: #5a4b73;
	}
	.reader {
		width: 100%;
		max-width: 29rem;
		padding: 0.75rem;
		border: 1px solid color-mix(in srgb, var(--preview-ink) 45%, #fff8e9);
		background: #fff9ed;
		box-shadow: 0 7px 18px #18374618;
	}
	.reader-header {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.15rem 0.5rem;
		padding-bottom: 0.4rem;
		border-bottom: 1px solid #1837462b;
	}
	.reader-header,
	.reader-label {
		color: var(--preview-ink);
		font: 600 0.63rem/1.35 var(--atv-font-ui);
		letter-spacing: 0.045em;
		text-transform: uppercase;
	}
	.chart-preview {
		display: grid;
		grid-template-columns: minmax(0, 0.75fr) minmax(0, 1fr);
		align-items: center;
		gap: 0.6rem;
		padding-top: 0.6rem;
	}
	.chart-preview img {
		width: 100%;
		height: auto;
	}
	.reader-label {
		margin: 0;
	}
	.reader-title,
	blockquote {
		margin: 0.3rem 0;
		font: 500 1rem/1.13 var(--atv-font-display);
	}
	.excerpt,
	.card-name,
	.credit {
		margin: 0;
		font: 400 0.7rem/1.4 var(--atv-font-ui);
	}
	.tarot-preview {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.25rem;
		margin: 0;
		padding: 0.5rem 0 0;
		list-style: none;
		text-align: center;
	}
	.tarot-preview li {
		display: grid;
		justify-items: center;
		gap: 0.2rem;
	}
	.tarot-preview img {
		width: 2.45rem;
		height: auto;
		border: 1px solid #80522d;
	}
	.tarot-excerpt {
		margin-top: 0.45rem;
	}
	.credit {
		margin-top: 0.25rem;
		color: #665747;
		font-size: 0.56rem;
	}
	.dream-preview {
		padding: 0.65rem 0 0.15rem;
	}
	blockquote {
		padding-inline-start: 0.55rem;
		border-inline-start: 2px solid var(--preview-ink);
		font-style: italic;
	}
	.dream-preview .reader-label:nth-of-type(2) {
		margin: 0.7rem 0 0.25rem;
	}
</style>
