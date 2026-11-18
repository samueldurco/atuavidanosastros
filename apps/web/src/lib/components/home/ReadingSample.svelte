<script lang="ts">
	import { chartImageSource, chartWheelSvg } from '$lib/astrological-chart-presentation';
	import sample from '$lib/data/home-reading-sample.json';
	import { readingSample, sampleTarotPositions } from '$lib/data/reading-samples';
	import { tarotArtwork } from '$lib/trials/tarot-artwork';

	let selection = $state<'chart' | 'tarot'>('chart');
	const chart = chartImageSource(chartWheelSvg(sample.chart.svg));
	const pillars = [
		...sample.chart.positions.filter(({ body }) => ['sun', 'moon'].includes(body)),
		...sample.chart.angles.filter(({ body }) => body === 'ascendant')
	];
	const tarot = readingSample('tarot-situation-challenge-advice');
	const positions = tarot ? sampleTarotPositions(tarot) : [];
	const chartDeliverables = [
		{ title: 'Sua mandala astrológica', text: 'O desenho do céu no momento do seu nascimento.' },
		{
			title: 'Sua interpretação personalizada',
			text: 'Uma leitura que relaciona os diferentes pontos do seu mapa.'
		},
		{
			title: 'Sol, Lua e Ascendente',
			text: 'Seus signos, planetas e casas, organizados para consulta.'
		},
		{
			title: 'Seus aspectos planetários',
			text: 'As relações entre os planetas e seus significados na leitura.'
		}
	];
	const tarotDeliverables = [
		{ title: 'Suas cartas', text: 'As três cartas e a posição de cada uma na tiragem.' },
		{
			title: 'A interpretação de cada carta',
			text: 'O significado de cada carta em relação à sua pergunta.'
		},
		{
			title: 'A leitura do conjunto',
			text: 'Uma síntese que conecta situação, desafio e conselho.'
		}
	];
</script>

<section class="reading-sample" id="amostra" aria-labelledby="reading-sample-heading">
	<div class="sample-wrap">
		<header class="sample-intro">
			<div>
				<p class="sample-eyebrow">02 / Por dentro da leitura</p>
				<h2 id="reading-sample-heading">Veja o que você <em>recebe.</em></h2>
			</div>
			<div class="sample-switch" role="group" aria-label="Escolha a leitura de exemplo">
				<button
					type="button"
					aria-pressed={selection === 'chart'}
					aria-controls="sample-delivery"
					onclick={() => (selection = 'chart')}>Mapa Astral</button
				>
				<button
					type="button"
					aria-pressed={selection === 'tarot'}
					aria-controls="sample-delivery"
					onclick={() => (selection = 'tarot')}>Tarot</button
				>
			</div>
		</header>

		<div id="sample-delivery" class="sample-delivery" class:tarot={selection === 'tarot'}>
			<div class="sample-preview">
				{#if selection === 'chart'}
					<div class="chart-sheet">
						<p class="sheet-label">Mapa Astral <span>Exemplo fictício</span></p>
						<img
							class="chart-image"
							src={chart}
							alt="Mandala calculada para o perfil fictício de 12 de maio de 1998, às 9h, em São Paulo"
							width="260"
							height="260"
							loading="lazy"
						/>
						<dl class="sample-pillars">
							{#each pillars as pillar (pillar.body)}
								<div>
									<dt>{pillar.name}</dt>
									<dd>{pillar.sign}</dd>
								</div>
							{/each}
						</dl>
					</div>
				{:else if tarot}
					<div class="tarot-sheet">
						<p class="sheet-label">Tarot · 3 cartas <span>Exemplo fictício</span></p>
						<ol class="sample-cards" aria-label="Cartas escolhidas para o exemplo">
							{#each tarot.cards ?? [] as card, i (card.id)}
								<li>
									<span class="position">{positions[i].name}</span>
									<img
										src={tarotArtwork(card.id)}
										alt={card.name}
										width="600"
										height="1040"
										loading="lazy"
									/>
									<span class="card-name">{card.name}</span>
								</li>
							{/each}
						</ol>
					</div>
				{/if}
			</div>

			<div class="delivery-copy">
				<h3>{selection === 'chart' ? 'No seu Mapa Astral' : 'No seu Tarot de 3 cartas'}</h3>
				<dl class="deliverables">
					{#each selection === 'chart' ? chartDeliverables : tarotDeliverables as item, i (item.title)}
						<div>
							<dt><span aria-hidden="true">0{i + 1}</span>{item.title}</dt>
							<dd>{item.text}</dd>
						</div>
					{/each}
				</dl>
				<a
					class="sample-link"
					href={selection === 'chart'
						? '/produtos/mapa-astral-completo#amostra'
						: '/produtos/tarot-3-cartas#amostra'}
					data-atv-event="home_path_select"
					data-atv-context="reading-sample"
					data-atv-cta={selection === 'chart' ? 'birth-chart' : 'tarot'}
				>
					Ver exemplo completo <span aria-hidden="true">↗</span>
				</a>
			</div>
		</div>
		<p class="sample-note">
			{selection === 'chart'
				? 'Prévia com dados fictícios. Cálculo experimental: zodíaco tropical e casas Placidus.'
				: 'Exemplo com pergunta fictícia e cartas escolhidas para demonstração. Arte: Pamela Colman Smith · Rider–Waite–Smith.'}
			Leitura simbólica para reflexão.
		</p>
	</div>
</section>

<style>
	.reading-sample {
		padding: 64px 0;
		background: #e9e7da;
		color: #183746;
		scroll-margin-top: 96px;
	}
	.sample-wrap {
		width: min(1160px, calc(100% - 80px));
		margin: 0 auto;
	}
	.sample-intro {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 24px;
		margin-bottom: 28px;
	}
	.sample-eyebrow,
	.sheet-label,
	.delivery-copy h3 {
		margin: 0;
		font:
			500 0.75rem/1.5 'Onest',
			sans-serif;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	h2 {
		margin: 12px 0 0;
		font:
			400 clamp(2rem, 3.5vw, 3rem) / 1.08 'Newsreader',
			Georgia,
			serif;
		letter-spacing: -0.025em;
	}
	h2 em {
		font-weight: 400;
	}
	.sample-switch {
		display: flex;
		flex-shrink: 0;
		gap: 4px;
		padding: 4px;
		border: 1px solid #b8baa9;
	}
	.sample-switch button {
		min-height: 44px;
		padding: 8px 20px;
		border: 0;
		background: transparent;
		color: #183746;
		font:
			500 0.875rem/1.4 'Onest',
			sans-serif;
		cursor: pointer;
	}
	.sample-switch button[aria-pressed='true'] {
		background: #183746;
		color: #fff8e9;
	}
	.sample-switch button:hover:not([aria-pressed='true']) {
		background: #d5d9c6;
	}
	button:focus-visible,
	a:focus-visible {
		outline: 2px solid #174c69;
		outline-offset: 4px;
	}
	.sample-delivery {
		--sample-ink: #174c69;
		display: grid;
		grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.35fr);
		border: 1px solid #c7bfac;
		background: #fff8e9;
	}
	.sample-delivery.tarot {
		--sample-ink: #92501f;
	}
	.sample-preview {
		display: grid;
		align-items: center;
		min-width: 0;
		padding: 24px;
		border-right: 1px solid #c7bfac;
		background: #f0ebdc;
	}
	.tarot .sample-preview {
		background: #eddfc8;
	}
	.chart-sheet,
	.tarot-sheet {
		width: 100%;
		max-width: 360px;
		margin: 0 auto;
	}
	.sheet-label {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		color: var(--sample-ink);
		font-size: 0.625rem;
		letter-spacing: 0.04em;
	}
	.sheet-label span {
		color: #596365;
	}
	.chart-image {
		display: block;
		width: 240px;
		max-width: 100%;
		height: auto;
		margin: 12px auto;
	}
	.sample-pillars {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
		margin: 0;
		padding-top: 12px;
		border-top: 1px solid #c7bfac;
	}
	.sample-pillars dt,
	.position,
	.card-name {
		font:
			400 0.6875rem/1.4 'Onest',
			sans-serif;
	}
	.sample-pillars dd {
		margin: 4px 0 0;
		font:
			400 1.125rem/1.2 'Newsreader',
			Georgia,
			serif;
	}
	.delivery-copy {
		align-self: center;
		padding: 28px 32px 20px;
	}
	.delivery-copy h3 {
		color: var(--sample-ink);
	}
	.deliverables {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 28px 24px;
		margin: 24px 0 16px;
	}
	.deliverables dt {
		font:
			400 1.375rem/1.1 'Newsreader',
			Georgia,
			serif;
	}
	.deliverables dt span {
		display: block;
		margin-bottom: 8px;
		color: var(--sample-ink);
		font:
			500 0.6875rem/1.4 'Onest',
			sans-serif;
	}
	.deliverables dd {
		margin: 8px 0 0;
		color: #596365;
		font:
			400 0.8125rem/1.55 'Onest',
			sans-serif;
	}
	.sample-link {
		display: inline-flex;
		align-items: center;
		gap: 24px;
		min-height: 44px;
		color: var(--sample-ink);
		font:
			500 0.875rem/1.4 'Onest',
			sans-serif;
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	.sample-link:hover {
		text-decoration-thickness: 2px;
	}
	.sample-note {
		max-width: 78ch;
		margin: 16px 0 0;
		color: #596365;
		font:
			400 0.6875rem/1.6 'Onest',
			sans-serif;
	}
	.sample-cards {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
		margin: 24px 0 20px;
		padding: 0;
		list-style: none;
		text-align: center;
	}
	.sample-cards img {
		display: block;
		width: 100%;
		height: auto;
		margin: 8px 0;
		border: 1px solid #a78860;
	}
	@media (max-width: 850px) {
		.sample-wrap {
			width: calc(100% - 48px);
		}
		.sample-intro {
			align-items: start;
			flex-direction: column;
		}
		.sample-delivery {
			grid-template-columns: minmax(0, 0.85fr) minmax(0, 1fr);
		}
		.sample-preview {
			padding: 20px;
		}
		.delivery-copy {
			padding: 24px;
		}
		.deliverables {
			grid-template-columns: 1fr;
			gap: 20px;
		}
		.deliverables dt span {
			display: inline;
			margin-right: 8px;
		}
	}
	@media (max-width: 560px) {
		.reading-sample {
			padding: 40px 0;
		}
		.sample-wrap {
			width: calc(100% - 32px);
		}
		.sample-intro {
			gap: 20px;
			margin-bottom: 20px;
		}
		.sample-switch {
			align-self: stretch;
		}
		.sample-switch button {
			flex: 1;
		}
		.sample-delivery {
			grid-template-columns: minmax(0, 1fr);
		}
		.sample-preview {
			padding: 16px;
			border-right: 0;
			border-bottom: 1px solid #c7bfac;
		}
		.chart-sheet {
			display: grid;
			grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
			align-items: center;
			gap: 12px 16px;
		}
		.sheet-label {
			grid-column: 1 / -1;
		}
		.chart-image {
			width: 152px;
			margin: 0 auto;
		}
		.sample-pillars {
			grid-template-columns: 1fr;
			gap: 12px;
			padding: 0 0 0 12px;
			border-top: 0;
			border-left: 1px solid #c7bfac;
		}
		.sample-pillars dd {
			margin-top: 2px;
		}
		.delivery-copy {
			padding: 24px 20px 16px;
		}
		.deliverables {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 20px 16px;
			margin-top: 20px;
		}
		.deliverables dt {
			font-size: 1.1875rem;
		}
		.deliverables dt span {
			display: block;
			margin-bottom: 6px;
		}
		.deliverables dd {
			font-size: 0.75rem;
		}
		.sample-cards {
			max-width: 270px;
			margin: 16px auto;
		}
		.tarot .deliverables {
			grid-template-columns: 1fr;
			gap: 16px;
		}
		.tarot .deliverables dt span {
			display: inline;
			margin-right: 8px;
		}
	}
</style>
