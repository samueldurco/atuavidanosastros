<script lang="ts">
	import AstrologicalChart from '$lib/components/AstrologicalChart.svelte';
	import sample from '$lib/data/home-reading-sample.json';

	const chapter = sample.excerpts[0];
	const synthesis = sample.excerpts[1];
	const pillars = [
		...sample.chart.positions.filter(({ body }) => ['sun', 'moon'].includes(body)),
		...sample.chart.angles.filter(({ body }) => body === 'ascendant')
	];
</script>

<section class="reading-sample" id="amostra" aria-labelledby="reading-sample-heading">
	<div class="sample-wrap">
		<header class="sample-intro">
			<p class="sample-eyebrow">02 / Por dentro de uma leitura</p>
			<h2 id="reading-sample-heading">Do desenho do céu<br />à sua <em>leitura.</em></h2>
			<p class="sample-description">
				O mapa reúne posições. A leitura aproxima essas referências e abre perguntas. Veja como isso
				aparece em um trecho do Mapa Astral, nossa leitura completa avulsa.
			</p>
		</header>

		<div class="sample-book">
			<aside class="map-page" aria-labelledby="sample-profile-heading">
				<div class="page-label"><span>Mapa Astral</span><span>Amostra demonstrativa</span></div>
				<h3 id="sample-profile-heading">Um perfil fictício,<br />um mapa calculado.</h3>
				<p class="profile-data">
					{sample.profile.date} · {sample.profile.time}<br />{sample.profile.location}
				</p>
				<p class="fiction-note">{sample.profile.note}</p>
				<div class="sample-map">
					<AstrologicalChart
						svg={sample.chart.svg}
						title="Mapa do perfil fictício"
						positions={sample.chart.positions}
						cusps={sample.chart.cusps}
						ascendant={sample.chart.angles.find(({ body }) => body === 'ascendant')?.longitude}
						midheaven={sample.chart.angles.find(({ body }) => body === 'midheaven')?.longitude}
					/>
				</div>
				<dl class="sample-pillars">
					{#each pillars as pillar (pillar.body)}
						<div>
							<dt>{pillar.name}</dt>
							<dd>{pillar.sign}<span>{pillar.degree}</span></dd>
						</div>
					{/each}
				</dl>
				<p class="method-note">{sample.limits.method}. {sample.limits.calculation}</p>
			</aside>

			<div class="text-page">
				<p class="chapter-label">Trecho da leitura · Sol e Lua</p>
				<h3>{chapter.title}</h3>
				<div class="chapter-copy">
					{#each chapter.text.split('\n\n') as paragraph (paragraph)}
						<p>{paragraph}</p>
					{/each}
				</div>
				<details class="sample-synthesis">
					<summary>Ler a síntese deste mapa <span aria-hidden="true">+</span></summary>
					<div class="synthesis-copy">
						<h4>{synthesis.title}</h4>
						{#each synthesis.text.split('\n\n') as paragraph (paragraph)}
							<p>{paragraph}</p>
						{/each}
					</div>
				</details>
				<div class="reflection">
					<p class="chapter-label">Uma pergunta para levar</p>
					<p>{sample.question}</p>
				</div>
				<p class="excerpt-note">
					Dois trechos da composição atual, gerados com os dados fictícios ao lado. Esta é uma
					demonstração parcial; a leitura pessoal depende dos dados informados.
				</p>
			</div>
		</div>

		<footer class="sample-footer">
			<p>{sample.limits.interpretation}</p>
			<a
				href="/produtos/mapa-astral-completo"
				data-atv-event="home_path_select"
				data-atv-context="reading-sample"
				data-atv-cta="birth-chart">Conhecer a leitura completa <span aria-hidden="true">↗</span></a
			>
		</footer>
	</div>
</section>

<style>
	.reading-sample {
		color: #183746;
		padding: 88px 0;
		font-family: var(--atv-font-ui, Onest, sans-serif);
		background: #e9e7da;
	}
	.sample-wrap {
		width: min(1160px, calc(100% - 80px));
		margin-inline: auto;
	}
	.sample-intro {
		max-width: 660px;
		margin-bottom: 36px;
	}
	.sample-eyebrow,
	.chapter-label {
		margin: 0 0 16px;
		font-size: 0.75rem;
		font-weight: 600;
		line-height: 1.5;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	.sample-intro h2 {
		margin: 0 0 20px;
		font: 400 clamp(2.5rem, 4.5vw, 3.5rem) / 1.08
			var(--atv-font-display, Newsreader, Georgia, serif);
		letter-spacing: -0.025em;
	}
	.sample-intro h2 em {
		font-weight: 400;
	}
	.sample-description {
		max-width: 58ch;
		margin: 0;
		font-size: 1rem;
		line-height: 1.75;
	}
	.sample-book {
		display: grid;
		grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
		border: 1px solid #c7bfac;
		background: #fff8e9;
		box-shadow:
			0 4px 0 #dad3c2,
			0 5px 0 #c7bfac,
			0 18px 32px #1837460d;
	}
	.map-page {
		min-width: 0;
		padding: 32px;
		border-right: 1px solid #c7bfac;
		background: linear-gradient(90deg, transparent 96%, #18374606), #f6efdf;
	}
	.page-label {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 8px 16px;
		margin-bottom: 32px;
		font-size: 0.6875rem;
		line-height: 1.5;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.page-label span:first-child {
		font-weight: 600;
		color: #174c69;
	}
	.map-page h3 {
		margin: 0 0 16px;
		font: 400 2rem / 1.12 var(--atv-font-display, Newsreader, Georgia, serif);
	}
	.profile-data {
		font-size: 0.875rem;
		line-height: 1.6;
		margin: 0 0 12px;
	}
	.fiction-note,
	.method-note,
	.excerpt-note {
		color: #596365;
		font-size: 0.8125rem;
		line-height: 1.65;
	}
	.fiction-note {
		max-width: 46ch;
		margin: 0 0 24px;
	}
	.sample-map {
		margin-inline: -12px;
	}
	.sample-pillars {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
		margin: 24px 0 16px;
		padding-top: 20px;
		border-top: 1px solid #c7bfac;
	}
	.sample-pillars dt {
		font-size: 0.75rem;
		line-height: 1.5;
		margin-bottom: 6px;
	}
	.sample-pillars dd {
		margin: 0;
		font: 500 1.125rem / 1.3 var(--atv-font-display, Newsreader, Georgia, serif);
	}
	.sample-pillars dd span {
		display: block;
		margin-top: 4px;
		font: 400 0.75rem / 1.5 var(--atv-font-ui, Onest, sans-serif);
		color: #596365;
	}
	.method-note {
		margin: 0;
	}
	.text-page {
		min-width: 0;
		padding: 40px;
	}
	.text-page h3 {
		margin: 0 0 24px;
		font: 400 clamp(1.75rem, 2.5vw, 2.25rem) / 1.14
			var(--atv-font-display, Newsreader, Georgia, serif);
		letter-spacing: -0.015em;
	}
	.chapter-copy,
	.synthesis-copy {
		font: 400 1.0625rem / 1.75 var(--atv-font-ui, Onest, sans-serif);
	}
	.chapter-copy p,
	.synthesis-copy p {
		margin: 0 0 20px;
	}
	.sample-synthesis {
		margin-top: 28px;
		border-block: 1px solid #c7bfac;
	}
	.sample-synthesis summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		min-height: 52px;
		padding-block: 12px;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 600;
		list-style: none;
	}
	.sample-synthesis summary::-webkit-details-marker {
		display: none;
	}
	.sample-synthesis summary span {
		font-size: 1.5rem;
		font-weight: 400;
	}
	.sample-synthesis[open] summary span {
		transform: rotate(45deg);
	}
	.synthesis-copy {
		padding-block: 16px 8px;
	}
	.synthesis-copy h4 {
		margin: 0 0 20px;
		font: 400 1.625rem / 1.2 var(--atv-font-display, Newsreader, Georgia, serif);
	}
	.reflection {
		margin: 28px 0 24px;
		padding-left: 20px;
		border-left: 2px solid #a36632;
	}
	.reflection .chapter-label {
		margin-bottom: 10px;
	}
	.reflection > p:last-child {
		margin: 0;
		font: 400 1.375rem / 1.4 var(--atv-font-display, Newsreader, Georgia, serif);
	}
	.excerpt-note {
		margin: 0;
	}
	.sample-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 20px 32px;
		margin-top: 28px;
	}
	.sample-footer p {
		max-width: 64ch;
		margin: 0;
		color: #596365;
		font-size: 0.8125rem;
		line-height: 1.65;
	}
	.sample-footer a {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 24px;
		flex-shrink: 0;
		min-height: 48px;
		padding: 12px 20px;
		border: 1px solid #183746;
		color: #fff8e9;
		background: #183746;
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
	}
	.sample-footer a:hover {
		background: #174c69;
	}
	.sample-footer a:focus-visible,
	.sample-synthesis summary:focus-visible {
		outline: 3px solid #174c69;
		outline-offset: 4px;
	}
	@media (max-width: 900px) {
		.sample-wrap {
			width: min(1160px, calc(100% - 48px));
		}
		.map-page,
		.text-page {
			padding: 24px;
		}
		.sample-footer {
			align-items: flex-start;
			flex-direction: column;
		}
	}
	@media (max-width: 700px) {
		.reading-sample {
			padding-block: 56px;
		}
		.sample-wrap {
			width: calc(100% - 32px);
		}
		.sample-book {
			grid-template-columns: minmax(0, 1fr);
		}
		.map-page {
			border-right: 0;
			border-bottom: 1px solid #c7bfac;
			background: #f6efdf;
		}
		.page-label {
			margin-bottom: 24px;
		}
		.sample-map {
			max-width: 420px;
			margin-inline: auto;
		}
		.text-page {
			padding-block: 32px;
		}
	}
	@media (max-width: 360px) {
		.map-page,
		.text-page {
			padding-inline: 16px;
		}
		.sample-pillars {
			gap: 8px;
		}
	}
</style>
