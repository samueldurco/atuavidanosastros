<script lang="ts">
	import MvpProductCard from '$lib/components/MvpProductCard.svelte';
	import { mvpArt, mvpAssets, mvpTheme, mvpThemes } from '$lib/data/mvp-visual';
	import { editorialPages, signNames } from '$lib/data/site';
	let { data } = $props();
	const theme = $derived(mvpTheme(data.topic.id));
	const careerGuideSlugs = [
		'carreira-no-mapa-astral',
		'casa-10',
		'vocacao-no-mapa-astral'
	] as const;
</script>

<svelte:head>
	<link
		rel="preload"
		as="image"
		type="image/webp"
		href={`${mvpAssets}/universos/fundo-${theme}.webp`}
		media={theme === 'tarot' ? '(min-width: 681px)' : undefined}
		fetchpriority="high"
	/>
</svelte:head>

<div class="mvp-public">
	<div class="theme-{theme}">
		<section class="universe-hero">
			<div class="universe-hero-surface">
				<div class="universe-hero-copy">
					<nav class="topic-breadcrumb" aria-label="Caminho da página">
						<a href="/explorar">Explorar</a><span aria-hidden="true"> / </span><a href="/temas"
							>Temas</a
						><span aria-hidden="true"> / </span><span aria-current="page">{data.topic.label}</span>
					</nav>
					<p class="eyebrow">Explore este tema</p>
					<h1>{data.topic.label}</h1>
					<p class="lead">{data.topic.description}</p>
					<div class="entry-actions">
						<a class="button primary" href="#por-onde-comecar">Por onde começar?</a>
						<a class="text-link" href="#leituras">Conhecer as leituras digitais</a>
					</div>
				</div>
				<div class="universe-hero-emblem" aria-hidden="true">
					<img src={mvpArt(mvpThemes[theme].art)} alt="" width="550" height="420" />
				</div>
			</div>
		</section>
		<section class="wrap topic-entry" id="por-onde-comecar" aria-labelledby="entry-title">
			<p class="eyebrow">Para começar</p>
			<h2 id="entry-title">{data.introduction.heading}</h2>
			{#if data.topic.id === 'ciclos' && !data.horoscopeSigns.length}
				<p>
					Ainda não há leituras por signo no acervo.{#if data.articles.length}
						Você pode consultar os guias sobre ciclos mais abaixo.{/if}
				</p>
			{:else}
				<p>{data.introduction.text}</p>
			{/if}
			{#if data.topic.id === 'ciclos'}
				{#if data.horoscopeSigns.length}
					<nav class="sign-picker" aria-label="Horóscopo por signo">
						{#each data.horoscopeSigns as sign (sign)}
							<a href={'/horoscopo/' + sign} aria-label={'Horóscopo de ' + signNames[sign]}
								>{signNames[sign]}</a
							>
						{/each}
					</nav>
				{/if}
				<a class="text-link" href="/horoscopo">Consultar todos os períodos do horóscopo</a>
			{:else}
				<div class="entry-actions">
					{#if data.articles.length}
						<a class="text-link" href={data.articles[0].path}>{data.articles[0].title}</a>
					{/if}
					{#if data.startTool}
						<a
							class="text-link"
							href={data.startTool.href}
							data-atv-event="tool_select"
							data-atv-tool={data.startTool.id}
							data-atv-universe={data.topic.id}
							data-atv-context="universe">{data.startTool.action}</a
						>
					{/if}
					{#if data.topic.id === 'meu-ceu'}
						<a class="text-link" href="/signos">Conhecer os 12 signos</a>
					{/if}
				</div>
			{/if}
		</section>
		<section class="wrap section" aria-labelledby="free-tools-title">
			<p class="eyebrow">Experimente</p>
			<h2 id="free-tools-title">Comece gratuitamente</h2>
			<div class="tool-grid">
				{#each data.tools as tool (tool.id)}
					<article class="card tool-card">
						<p class="availability" class:partial={tool.availability === 'partial'}>
							{tool.availabilityLabel}
						</p>
						<h3>{tool.label}</h3>
						<p>{tool.description}</p>
						<p class="requirements">{tool.requirements}</p>
						<a
							class="tool-action"
							href={tool.href}
							data-atv-event="tool_select"
							data-atv-tool={tool.id}
							data-atv-universe={data.topic.id}
							data-atv-context="universe">{tool.action} <span aria-hidden="true">→</span></a
						>
					</article>
				{/each}
			</div>
		</section>
		<section class="universe-readings section" id="leituras" aria-labelledby="readings-title">
			<div class="wrap">
				<p class="eyebrow">Escolha o que faz sentido para você</p>
				<h2 id="readings-title">Leituras digitais de {data.topic.label}</h2>
				<p class="section-intro">
					Compare o foco de cada leitura e os dados necessários. Cada página informa o conteúdo e a
					disponibilidade.
				</p>
				<div class="grid grid-3 reading-options">
					{#each data.products as product (product.id)}<MvpProductCard {product} showInput />{/each}
				</div>
				<a class="back-link" href="/leituras"
					>Ver o catálogo de leituras digitais <span aria-hidden="true">→</span></a
				>
			</div>
		</section>
		<section class="universe-editorial-band" aria-labelledby="articles-title">
			<div class="wrap universe-editorial-inner">
				<div>
					{#if theme === 'sonhos'}<img
							class="universe-lettering"
							src={mvpArt('lettering-sonhar')}
							alt="Sonhar"
							width="660"
							height="210"
							loading="lazy"
						/>{/if}
					<p class="eyebrow">Entenda o assunto</p>
					<h2 id="articles-title">Para continuar a leitura</h2>
					{#if data.articles.length}<div class="article-grid">
							{#each data.articles as article (article.id)}<article>
									<h3><a href={article.path}>{article.title}</a></h3>
									<p>{article.description}</p>
								</article>{/each}
						</div>{/if}
					{#if data.topic.id === 'proposito'}
						<nav class="career-links" aria-label="Outros caminhos para explorar carreira">
							<ul>
								{#each careerGuideSlugs as slug (slug)}
									<li><a href={'/' + slug}>{editorialPages[slug].title}</a></li>
								{/each}
								<li><a href="/meio-do-ceu">Entender o Meio do Céu no mapa astral</a></li>
								<li><a href="/mapa-de-proposito">Conhecer o Mapa de Carreira em preparação</a></li>
							</ul>
						</nav>
					{/if}
					<a class="back-link" href={'/revista?tema=' + data.topic.id}
						>{data.topic.editorial} <span aria-hidden="true">→</span></a
					>
				</div>
			</div>
		</section>
	</div>
</div>

<style>
	.topic-breadcrumb {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 24px;
		font-size: 13px;
	}
	.topic-breadcrumb a {
		color: inherit;
		text-underline-offset: 3px;
	}
	.back-link,
	.tool-action {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 48px;
	}
	.universe-hero-copy .back-link {
		margin-bottom: 1.25rem;
	}
	.entry-actions,
	.sign-picker {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.65rem 1rem;
	}
	.topic-entry {
		padding-block: clamp(2rem, 5vw, 4.5rem) 0;
		scroll-margin-top: 5rem;
	}
	.topic-entry h2,
	.topic-entry > p {
		max-width: 58ch;
	}
	.topic-entry .text-link,
	.entry-actions .text-link,
	.career-links a,
	.sign-picker a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}
	.career-links ul {
		margin-block: 1rem;
		padding-inline-start: 1.25rem;
	}
	.sign-picker {
		max-width: 54rem;
		margin-block: 1rem;
		gap: 0.35rem 0.65rem;
	}
	.sign-picker a {
		padding-inline: 1rem;
		border: 1px solid var(--atv-border);
		border-radius: 100vw;
	}
	.tool-grid,
	.article-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.5rem;
		margin-top: 1.5rem;
	}
	.tool-card {
		display: flex;
		flex-direction: column;
		padding: 2rem;
		border-top: 4px solid var(--universe-accent);
		background-image: url('/brand/mvp/assets/papel-fino.webp');
	}
	.tool-card .tool-action {
		margin-top: auto;
	}
	.availability {
		font-size: 0.8rem;
		font-weight: 600;
	}
	.partial {
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}
	.requirements {
		font-size: 0.9rem;
		color: var(--atv-text-secondary);
	}
	.section-intro {
		max-width: 44rem;
	}
	.reading-options {
		margin-block: 2rem;
	}
	.article-grid article {
		padding-top: 1rem;
		border-top: 1px solid var(--atv-border);
	}
	.article-grid h3 {
		font-size: 1.5rem;
	}
	@media (max-width: 650px) {
		.tool-grid,
		.article-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
