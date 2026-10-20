<script lang="ts">
	import { signs, signNames } from '$lib/data/site';
	import { horoscopePeriods, periodNames, horoscopeRange } from '$lib/public-horoscope';
	import type { PublicHoroscopeIndex } from '$lib/server/public-horoscope-index';
	import HoroscopeFollow from './HoroscopeFollow.svelte';
	let { data }: { data: PublicHoroscopeIndex } = $props();
	const path = $derived(data.sign ? `/horoscopo/${data.sign}` : '/horoscopo');
</script>

<section class="section">
	<div class="horoscope-wrap">
		<nav class="breadcrumb" aria-label="Caminho do horóscopo">
			<a href="/temas/previsoes">Previsões</a>{#if data.sign}<span aria-hidden="true"> / </span><a
					href="/horoscopo">Todos os signos</a
				>{/if}
		</nav>
		<p class="eyebrow">Céu do período</p>
		<h1 class="h1">
			{data.sign ? `Horóscopo de ${signNames[data.sign]}` : 'Horóscopo dos 12 signos'}
		</h1>
		<p class="lead">
			Consulte as publicações por signo e período. Cada leitura reúne uma interpretação geral do
			céu, com a data a que se refere. Seu mapa natal acrescenta uma perspectiva pessoal.
		</p>
		<nav class="periods" aria-label="Período da leitura">
			{#each horoscopePeriods as period (period)}<a
					href={`${path}?period=${period}&year=${data.year}`}
					aria-current={data.period === period ? 'page' : undefined}>{periodNames[period]}</a
				>{/each}
		</nav>
		{#if !data.sign}
			{#if !data.currentSigns.length}
				<section class="current card" aria-labelledby="availability-heading">
					<p class="eyebrow">{periodNames[data.period]} atual · períodos em UTC</p>
					<h2 id="availability-heading">A leitura deste período ainda não foi publicada</h2>
					<p>
						Você pode consultar a disponibilidade de cada signo ou guardar sua preferência neste
						navegador.
						{#if data.supportingGuides.length}
							Os guias sobre ciclos, mais abaixo, são conteúdos educativos que você já pode ler.
						{/if}
					</p>
				</section>
			{/if}
			<div class="sign-grid">
				{#each signs as sign (sign)}
					<a
						class="sign-card card"
						href={`/horoscopo/${sign}?period=${data.period}&year=${data.year}`}
					>
						<h2>{signNames[sign]}</h2>
						<span>
							{data.currentSigns.includes(sign)
								? 'Ler a publicação atual'
								: 'Consultar disponibilidade e histórico'}
							<span aria-hidden="true">→</span>
						</span>
					</a>
				{/each}
			</div>
		{:else}
			<section class="current card" aria-labelledby="current-heading">
				<p class="eyebrow">{periodNames[data.period]} atual · períodos em UTC</p>
				<h2 id="current-heading">
					{data.current ? data.current.title : 'A leitura deste período ainda não foi publicada'}
				</h2>
				{#if data.current}
					<p>{horoscopeRange(data.current)}</p>
					<p>{data.current.description}</p>
					<a class="button" href={data.current.path}>Ler o horóscopo completo</a>
				{:else}<p>
						Não há uma leitura atual de {signNames[data.sign]} para este período. Você pode consultar
						publicações anteriores, quando disponíveis, ou guardar sua preferência neste navegador.
					</p>{/if}
			</section>
		{/if}
		{#if data.supportingGuides.length}
			<section class="supporting-guides" aria-labelledby="guides-heading">
				<h2 id="guides-heading">Para entender os ciclos</h2>
				<p>
					Guias educativos sobre os movimentos do céu. Não são previsões para o período escolhido.
				</p>
				<div class="guide-grid">
					{#each data.supportingGuides as guide (guide.path)}
						<article class="card guide-card">
							<h3><a href={guide.path}>{guide.title}</a></h3>
							<p>{guide.description}</p>
						</article>
					{/each}
				</div>
			</section>
		{/if}
		<section class="history" aria-labelledby="history-heading">
			<h2 id="history-heading">Histórico de leituras</h2>
			<form method="GET" action={path} class="year-form">
				<input type="hidden" name="period" value={data.period} />
				<label for="horoscope-year">Ano de início da leitura</label>
				<input
					id="horoscope-year"
					name="year"
					type="number"
					min="1900"
					max="2099"
					step="1"
					value={data.year}
					required
				/>
				<button class="button secondary" type="submit">Ver histórico</button>
			</form>
			<p class="history-note">
				{periodNames[data.period]} · {data.year}. Dia e mês civis; semanas começam na segunda-feira.
				Datas em UTC.
			</p>
			{#if data.history.length}
				<ol class="history-list">
					{#each data.history as entry (entry.id)}<li class="card">
							<p class="eyebrow">{signNames[entry.sign]} · {horoscopeRange(entry)}</p>
							<h3><a href={entry.path}>{entry.title}</a></h3>
							<p>{entry.description}</p>
						</li>{/each}
				</ol>
			{:else}<p class="empty-history">
					Ainda não há leituras publicadas para este período e ano.
				</p>{/if}
		</section>
		{#key `${data.sign}:${data.period}`}<HoroscopeFollow
				entries={data.entries}
				serverNow={data.serverNow}
				initialSign={data.sign ?? 'aries'}
				initialPeriod={data.period}
			/>{/key}
		<p class="method">
			<a href="/metodo">Método e limites das leituras</a> ·
			<a href="/testar-produtos/week-reading">Conhecer a leitura personalizada da semana</a>
		</p>
	</div>
</section>

<style>
	.horoscope-wrap {
		width: min(100% - 2 * var(--atv-page-margin), 70rem);
		margin-inline: auto;
	}
	.lead {
		max-width: 65ch;
	}
	.periods {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-block: 2rem;
	}
	.periods a {
		min-width: 5rem;
		min-height: 2.75rem;
		padding: 0.7rem 1.2rem;
		border: 1px solid var(--atv-border);
		border-radius: 999px;
		text-align: center;
		text-decoration: none;
	}
	.periods a[aria-current] {
		background: var(--atv-action);
		color: var(--atv-surface-page);
	}
	.sign-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
		margin-top: 1.5rem;
	}
	.sign-card {
		display: block;
		padding: 1.4rem;
		text-decoration: none;
	}
	.sign-card h2 {
		margin-top: 0;
	}
	.sign-card span {
		font-size: 0.95rem;
	}
	.current {
		padding: clamp(1.25rem, 3vw, 2rem);
		max-width: 50rem;
	}
	.history {
		margin-top: 3rem;
	}
	.supporting-guides {
		margin-top: 2rem;
	}
	.guide-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
		gap: 1rem;
	}
	.guide-card {
		padding: 1.5rem;
	}
	.guide-card h3 {
		margin-top: 0;
	}
	.year-form {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
	.year-form input {
		min-height: 2.75rem;
		width: 7rem;
	}
	.history-note {
		font-size: 0.95rem;
	}
	.history-list {
		list-style: none;
		margin: 1.5rem 0 0;
		padding: 0;
		display: grid;
		gap: 1rem;
	}
	.history-list li {
		padding: 1.5rem;
	}
	.empty-history {
		padding-block: 1rem;
	}
	.method {
		margin-top: 2rem;
	}
	@media (max-width: 48rem) {
		.sign-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 25rem) {
		.sign-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
