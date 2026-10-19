<script lang="ts">
	import type { EditorialDocument } from '$lib/server/editorial';
	import { editorialTopic } from '$lib/data/editorial-topics';
	import { interestNavigation } from '$lib/data/public-navigation';
	import { mvpArt, mvpThemes } from '$lib/data/mvp-visual';
	import { publicEditorialAuthor } from '$lib/data/editorial-author';
	let {
		document,
		related = []
	}: { document: EditorialDocument; related?: { path: string; title: string }[] } = $props();
	const topic = $derived(
		interestNavigation.find((item) => item.id === editorialTopic(document.path))
	);
	const theme = $derived(topic ? mvpThemes[topic.id] : mvpThemes['meu-ceu']);
	const author = $derived(publicEditorialAuthor(document.author));
	const kindLabels: Record<string, string> = {
		reporting: 'Reportagem',
		column: 'Coluna',
		horoscope: 'Horóscopo',
		guide: 'Guia',
		'sign-profile': 'Perfil de signo',
		compatibility: 'Relacionamentos'
	};
	function date(value: string): string {
		return new Intl.DateTimeFormat('pt-BR', {
			dateStyle: 'long',
			timeStyle: 'short',
			timeZone: 'America/Sao_Paulo'
		}).format(new Date(value));
	}
</script>

<article class="editorial-article container">
	<nav class="breadcrumb" aria-label="Caminho do artigo">
		<a href="/">Início</a><span aria-hidden="true">/</span><a href="/revista">Revista ATVNA</a
		>{#if topic}<span aria-hidden="true">/</span><a href={`/revista?tema=${topic.id}`}
				>{topic.label}</a
			>{/if}
	</nav>
	<header class="article-header" style={`--topic-tint: ${theme.tint};`}>
		<div>
			<p class="eyebrow">
				{kindLabels[document.kind] ?? 'Artigo'}{#if topic}
					· {topic.label}{/if}
			</p>
			<h1>{document.title}</h1>
			<p class="lead">{document.description}</p>
			<p class="byline">
				Por <a href={`/pessoas/${author.id}`}>{author.name}</a>
			</p>
			<p class="article-date">
				Publicado em <time datetime={document.publishedAt}>{date(document.publishedAt)}</time> (horário
				de Brasília).
			</p>
			{#if document.modifiedAt !== document.publishedAt}<p class="article-date">
					Atualizado em <time datetime={document.modifiedAt}>{date(document.modifiedAt)}</time> (horário
					de Brasília).
				</p>{/if}
		</div>
		{#if !document.image}<div class="article-emblem">
				<img src={mvpArt(theme.art)} alt="" width="360" height="360" />
			</div>{/if}
	</header>
	<div class="article-layout">
		<aside class="article-sidebar">
			<nav aria-label="Neste artigo">
				<p class="eyebrow">Neste artigo</p>
				<ol>
					{#each document.sections as section, index (index)}<li>
							<a href={`#artigo-secao-${index + 1}`}>{section.heading}</a>
						</li>{/each}
				</ol>
				<a class="back-to-magazine" href={topic ? `/revista?tema=${topic.id}` : '/revista'}
					>Mais artigos {topic ? 'deste assunto' : 'da Revista'}
					<span aria-hidden="true">↗</span></a
				>
			</nav>
		</aside>
		<div class="article-body">
			{#if document.image}<figure>
					<img
						src={document.image.path}
						alt={document.image.alt}
						width={document.image.width}
						height={document.image.height}
					/>
					<figcaption>{document.image.credit} · {document.image.license}</figcaption>
				</figure>{/if}
			{#each document.sections as section, sectionIndex (sectionIndex)}<section
					class="article-section"
					aria-labelledby={`artigo-secao-${sectionIndex + 1}`}
				>
					<h2 id={`artigo-secao-${sectionIndex + 1}`}>{section.heading}</h2>
					{#each section.paragraphs as paragraph, paragraphIndex (paragraphIndex)}<p>
							{paragraph}
						</p>{/each}
				</section>{/each}
			{#if document.calculation}<aside class="calculation">
					<h2>Base calculada</h2>
					<p>Motor {document.calculation.engine}, versão {document.calculation.version}.</p>
					<p>
						Cobertura: <time datetime={document.calculation.coverageStart}
							>{date(document.calculation.coverageStart)}</time
						>
						a
						<time datetime={document.calculation.coverageEnd}
							>{date(document.calculation.coverageEnd)}</time
						> (horário de Brasília).
					</p>
				</aside>{/if}
			<section class="article-references">
				<h2>Fontes e referências</h2>
				<ul>
					{#each document.sources as source, sourceIndex (sourceIndex)}<li>
							<a href={source.url} rel="noopener noreferrer">{source.title}</a>
						</li>{/each}
				</ul>
			</section>
			{#if topic}<aside class="article-next" style={`--topic-tint: ${theme.tint};`}>
					<p class="eyebrow">Explore por você</p>
					<h2>Seu próximo passo em {topic.label.toLowerCase()}.</h2>
					<p>{topic.description}</p>
					<a class="button" href={topic.toolHref}
						>{topic.action} <span aria-hidden="true">↗</span></a
					><a class="universe-link" href={topic.href}>Conhecer as leituras deste universo</a>
				</aside>{/if}
			<div class="article-service">
				<a href="/metodo">Conheça nosso método</a><a href="/fale-conosco?assunto=correcao"
					>Sugerir uma correção</a
				>
			</div>
		</div>
	</div>
	{#if related.length}<nav class="related-articles" aria-label="Artigos relacionados">
			<div class="related-heading">
				<h2>Continue a leitura</h2>
				<a href="/revista">Ver a Revista <span aria-hidden="true">↗</span></a>
			</div>
			<ul>
				{#each related as guide (guide.path)}<li>
						<a href={guide.path}>{guide.title}<span aria-hidden="true">↗</span></a>
					</li>{/each}
			</ul>
		</nav>{/if}
</article>

<style>
	.editorial-article {
		padding-block: 1.75rem 4rem;
	}
	.breadcrumb {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		font-size: 0.8rem;
	}
	.breadcrumb a {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
	.article-header {
		display: flex;
		gap: 3rem;
		align-items: center;
		padding-bottom: 2.5rem;
		border-bottom: 1px solid var(--atv-border);
	}
	.article-header > div:first-child {
		flex: 1;
		min-width: 0;
	}
	.article-header h1 {
		max-width: 23ch;
		margin: 1rem 0 1.5rem;
		font: 500 clamp(2.5rem, 4.4vw, 4.4rem)/1.05 var(--atv-font-display);
		letter-spacing: -0.035em;
	}
	.article-header .lead {
		max-width: 62ch;
		margin-bottom: 1.5rem;
	}
	.byline {
		font-size: 0.9rem;
		margin-bottom: 0.6rem;
	}
	.article-date {
		font-size: 0.75rem;
		margin: 0.4rem 0;
		line-height: 1.6;
	}
	.article-emblem {
		width: 25%;
		max-width: 260px;
		flex-shrink: 0;
		padding: 1rem;
		background: var(--topic-tint);
		border-radius: 50%;
	}
	.article-emblem img {
		mix-blend-mode: multiply;
		display: block;
	}
	.article-layout {
		display: grid;
		grid-template-columns: 230px minmax(0, 1fr);
		gap: clamp(2rem, 5vw, 5rem);
		padding-top: 2.5rem;
	}
	.article-sidebar nav {
		position: sticky;
		top: 6rem;
	}
	.article-sidebar ol {
		margin: 0 0 1.5rem;
		padding-left: 1.25rem;
		font-size: 0.85rem;
	}
	.article-sidebar li {
		margin-block: 0.25rem;
	}
	.article-sidebar a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		line-height: 1.5;
	}
	.back-to-magazine {
		border-top: 1px solid var(--atv-border);
		padding-block: 0.75rem;
		gap: 0.5rem;
		font-size: 0.85rem;
	}
	.article-body {
		max-width: 74ch;
		min-width: 0;
	}
	.article-section h2 {
		font: 500 clamp(1.65rem, 2.5vw, 2.25rem)/1.15 var(--atv-font-display);
		margin: 0 0 1rem;
		scroll-margin-top: 7rem;
	}
	.article-section p {
		font: 400 1.13rem/1.85 var(--atv-font-editorial);
		margin: 0 0 1.1rem;
	}
	.article-section + .article-section {
		margin-top: 2.5rem;
	}
	img {
		max-width: 100%;
		height: auto;
	}
	figure {
		margin: 0 0 2rem;
	}
	figcaption {
		margin-top: 0.75rem;
		font-size: 0.75rem;
	}
	.calculation,
	.article-references {
		padding-top: 1.5rem;
		margin-top: 2rem;
		border-top: 1px solid var(--atv-border);
	}
	.calculation h2,
	.article-references h2 {
		font: 500 1.5rem/1.2 var(--atv-font-display);
	}
	.calculation p,
	.article-references li {
		font-size: 0.85rem;
		line-height: 1.65;
	}
	.article-references ul {
		padding-left: 1.25rem;
	}
	.article-references a {
		overflow-wrap: anywhere;
	}
	.article-next {
		margin-block: 2.5rem 1.5rem;
		padding: clamp(1.25rem, 3vw, 2rem);
		background: var(--topic-tint);
	}
	.article-next h2 {
		font: 500 clamp(1.7rem, 3vw, 2.2rem)/1.15 var(--atv-font-display);
		margin: 0;
	}
	.article-next > p:not(.eyebrow) {
		line-height: 1.7;
	}
	.universe-link {
		display: flex;
		align-items: center;
		min-height: 44px;
		margin-top: 0.75rem;
		font-size: 0.85rem;
	}
	.article-service {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		font-size: 0.8rem;
	}
	.article-service a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}
	.related-articles {
		border-top: 1px solid var(--atv-border);
		margin-top: 3rem;
		padding-top: 2rem;
	}
	.related-heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}
	.related-heading h2 {
		font: 500 2.3rem/1.1 var(--atv-font-display);
		margin: 0;
	}
	.related-heading > a {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		font-size: 0.85rem;
	}
	.related-articles ul {
		list-style: none;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
	}
	.related-articles li a {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		min-height: 90px;
		padding-block: 1.5rem;
		border-top: 1px solid var(--atv-border);
		font: 500 1.3rem/1.35 var(--atv-font-display);
	}
	@media (max-width: 850px) {
		.article-layout {
			grid-template-columns: 180px minmax(0, 1fr);
			gap: 2rem;
		}
		.article-emblem {
			width: 22%;
		}
		.article-header {
			gap: 1.5rem;
		}
		.related-articles ul {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (max-width: 650px) {
		.article-header {
			display: block;
		}
		.article-emblem {
			display: none;
		}
		.article-layout {
			grid-template-columns: 1fr;
			gap: 1rem;
			padding-top: 1rem;
		}
		.article-sidebar nav {
			position: static;
			border-bottom: 1px solid var(--atv-border);
			margin-bottom: 1rem;
		}
		.article-sidebar .back-to-magazine {
			display: none;
		}
		.article-sidebar ol {
			margin-bottom: 1rem;
		}
		.article-sidebar .eyebrow {
			margin-block: 0.5rem;
		}
		.article-sidebar li {
			margin: 0;
		}
		.article-section p {
			font-size: 1.08rem;
		}
		.related-articles ul {
			grid-template-columns: 1fr;
			gap: 0;
		}
		.related-heading {
			align-items: flex-start;
		}
		.related-heading h2 {
			max-width: 9ch;
		}
	}
</style>
