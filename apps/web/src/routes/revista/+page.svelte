<script lang="ts">
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { interestNavigation } from '$lib/data/public-navigation';
	import { mvpArt, mvpThemes } from '$lib/data/mvp-visual';
	let { data } = $props();
	const currentTopic = $derived(interestNavigation.find((item) => item.id === data.selected));
	const featured = $derived(
		!data.query && !data.kind && data.order === 'recentes' ? data.articles[0] : null
	);
	const remaining = $derived(featured ? data.articles.slice(1) : data.articles);
	const topicFor = (id: string) => interestNavigation.find((item) => item.id === id);
	const themeFor = (id: string) => mvpThemes[id as keyof typeof mvpThemes] ?? mvpThemes['meu-ceu'];
	function topicHref(id?: string): string {
		const params = new SvelteURLSearchParams();
		if (id) params.set('tema', id);
		if (data.query) params.set('q', data.query);
		if (data.kind) params.set('tipo', data.kind);
		if (data.order !== 'recentes') params.set('ordem', data.order);
		return `/revista${params.size ? `?${params.toString()}` : ''}`;
	}
	const date = (value: string) =>
		new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'America/Sao_Paulo' }).format(
			new Date(value)
		);
</script>

<section class="magazine container">
	<header class="magazine-masthead">
		<p class="eyebrow">Ideias para entender. Espaço para descobrir.</p>
		<h1>Revista <span>ATVNA</span></h1>
		<p class="magazine-intro">
			Leia sobre astrologia, relacionamentos, carreira, Tarot e sonhos. Encontre uma dúvida sua e
			comece por ela.
		</p>
	</header>
	<nav class="topics" aria-label="Assuntos da Revista">
		<a href={topicHref()} aria-current={!data.selected ? 'page' : undefined}>Todos os assuntos</a>
		{#each interestNavigation as item (item.id)}<a
				href={topicHref(item.id)}
				aria-current={data.selected === item.id ? 'page' : undefined}>{item.label}</a
			>{/each}
	</nav>
	<form
		class="magazine-search"
		action="/revista"
		method="GET"
		role="search"
		aria-label="Buscar na Revista"
	>
		{#if data.selected}<input type="hidden" name="tema" value={data.selected} />{/if}
		<div class="search-field">
			<label for="revista-busca">O que você quer entender?</label><input
				id="revista-busca"
				type="search"
				name="q"
				value={data.query}
				placeholder="Busque um assunto"
				maxlength="160"
			/>
		</div>
		<div>
			<label for="revista-tipo">Tipo de leitura</label><select id="revista-tipo" name="tipo"
				><option value="" selected={!data.kind}>Todos os tipos</option
				>{#each data.kinds as kind (kind.id)}<option
						value={kind.id}
						selected={data.kind === kind.id}>{kind.label}</option
					>{/each}</select
			>
		</div>
		<div>
			<label for="revista-ordem">Ordenar por</label><select id="revista-ordem" name="ordem"
				><option value="recentes" selected={data.order === 'recentes'}>Mais recentes</option><option
					value="titulo"
					selected={data.order === 'titulo'}>Título: A a Z</option
				></select
			>
		</div>
		<button class="button" type="submit">Buscar</button>
	</form>
	<div class="results-heading">
		<h2>{currentTopic ? currentTopic.label : 'Para ler agora'}</h2>
		<p aria-live="polite">
			{data.articles.length}
			{data.articles.length === 1 ? 'artigo' : 'artigos'}{data.query ? ` para “${data.query}”` : ''}
		</p>
	</div>
	{#if featured}
		<article
			class="featured"
			style={`--topic-tint: ${themeFor(featured.topicId).tint}; --topic-ink: ${themeFor(featured.topicId).ink};`}
		>
			<div class="featured-art">
				<img src={mvpArt(themeFor(featured.topicId).art)} alt="" width="500" height="500" />
			</div>
			<div class="featured-copy">
				<p class="eyebrow">
					{featured.kindLabel} · {topicFor(featured.topicId)?.label ?? 'Revista'}
				</p>
				<h3><a href={featured.path}>{featured.title}</a></h3>
				<p>{featured.description}</p>
				<a class="article-link" href={featured.path}>Ler artigo <span aria-hidden="true">↗</span></a
				><time datetime={featured.publishedAt}>{date(featured.publishedAt)}</time>
			</div>
		</article>
	{/if}
	{#if remaining.length}
		<div class="article-grid">
			{#each remaining as article (article.id)}
				<article class="article-card" style={`--topic-tint: ${themeFor(article.topicId).tint};`}>
					<div class="article-art">
						<img
							src={mvpArt(themeFor(article.topicId).art)}
							alt=""
							width="180"
							height="180"
							loading="lazy"
						/>
						<p class="eyebrow">{topicFor(article.topicId)?.label ?? 'Revista'}</p>
					</div>
					<div class="article-copy">
						<p class="eyebrow">{article.kindLabel}</p>
						<h3><a href={article.path}>{article.title}</a></h3>
						<p>{article.description}</p>
						<div class="article-meta">
							<a href={article.path}>Ler artigo <span aria-hidden="true">↗</span></a><time
								datetime={article.publishedAt}>{date(article.publishedAt)}</time
							>
						</div>
					</div>
				</article>
			{/each}
		</div>
	{:else if !featured}
		<div class="empty-results">
			<h3>
				{data.total
					? 'Nenhum artigo para esta busca.'
					: 'As próximas leituras estão em preparação.'}
			</h3>
			<p>
				{data.total
					? 'Tente outra palavra ou volte a todos os assuntos.'
					: 'Enquanto isso, conheça os seis universos e escolha por onde começar.'}
			</p>
			<a class="button secondary" href={data.total ? '/revista' : '/temas'}
				>{data.total ? 'Ver todos os artigos' : 'Explorar os universos'}</a
			>
		</div>
	{/if}
	<aside class="magazine-next" aria-labelledby="magazine-next-title">
		<div>
			<p class="eyebrow">Da leitura à sua experiência</p>
			<h2 id="magazine-next-title">
				{currentTopic ? 'Explore esse assunto no seu ritmo.' : 'Quer começar por você?'}
			</h2>
			<p>
				{currentTopic
					? currentTopic.description
					: 'As ferramentas são um primeiro contato com os seis universos. Escolha um tema e veja o que pode descobrir.'}
			</p>
		</div>
		<div class="next-actions">
			{#if currentTopic}<a class="button" href={currentTopic.toolHref}
					>{currentTopic.action} <span aria-hidden="true">↗</span></a
				><a href={currentTopic.href}>Conhecer as leituras deste universo</a>{:else}<a
					class="button"
					href="/ferramentas">Explorar ferramentas grátis <span aria-hidden="true">↗</span></a
				><a href="/temas">Conhecer os seis universos</a>{/if}
		</div>
	</aside>
</section>

<style>
	.magazine {
		padding-block: clamp(2.5rem, 6vw, 5rem);
	}
	.magazine-masthead {
		text-align: center;
		padding-bottom: clamp(2rem, 4vw, 3.5rem);
	}
	.magazine-masthead h1 {
		font: 500 clamp(3.5rem, 10vw, 8.5rem)/0.95 var(--atv-font-display);
		letter-spacing: -0.055em;
		margin: 1rem 0 1.5rem;
	}
	.magazine-masthead h1 span {
		white-space: nowrap;
	}
	.magazine-intro {
		max-width: 43rem;
		margin: auto;
		font: 400 clamp(1.15rem, 2vw, 1.45rem)/1.55 var(--atv-font-editorial);
	}
	.topics {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
		padding-block: 1.5rem;
		border-block: 1px solid var(--atv-border);
	}
	.topics a {
		display: flex;
		align-items: center;
		min-height: 44px;
		padding: 0.5rem 0.9rem;
		border: 1px solid var(--atv-border);
		border-radius: 999px;
		font: 500 0.85rem/1.3 var(--atv-font-ui);
		text-decoration: none;
	}
	.topics a[aria-current='page'] {
		background: #173b4a;
		color: #fff9e9;
		border-color: #173b4a;
	}
	.magazine-search {
		display: grid;
		grid-template-columns: minmax(180px, 1.6fr) 1fr 1fr auto;
		gap: 1rem;
		align-items: end;
		padding-block: 1.75rem;
	}
	.magazine-search label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.8rem;
		font-weight: 600;
	}
	.magazine-search input,
	.magazine-search select {
		width: 100%;
		height: 48px;
		padding: 0.65rem;
		border: 1px solid var(--atv-border);
		background: var(--atv-paper-0);
		color: var(--atv-text-primary);
		font: 400 0.95rem var(--atv-font-ui);
	}
	.magazine-search button {
		min-height: 48px;
	}
	.results-heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin-block: 1rem 1.5rem;
	}
	.results-heading h2 {
		font: 500 clamp(1.65rem, 3vw, 2.5rem)/1.1 var(--atv-font-display);
		margin: 0;
	}
	.results-heading p {
		font-size: 0.85rem;
		margin: 0;
		text-align: right;
	}
	.featured {
		display: grid;
		grid-template-columns: 0.9fr 1.1fr;
		background: var(--atv-paper-0);
		margin-bottom: 2rem;
	}
	.featured-art {
		display: grid;
		place-items: center;
		padding: 2rem;
		background: var(--topic-tint);
	}
	.featured-art img {
		width: 100%;
		max-width: 320px;
		height: auto;
		mix-blend-mode: multiply;
	}
	.featured-copy {
		padding: clamp(1.5rem, 4vw, 3.5rem);
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: center;
	}
	.featured-copy h3 {
		font: 500 clamp(2rem, 3.5vw, 3.3rem)/1.08 var(--atv-font-display);
		margin: 0 0 1rem;
	}
	.featured-copy h3 a,
	.article-copy h3 a {
		text-decoration: none;
	}
	.featured-copy h3 a:hover,
	.article-copy h3 a:hover {
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}
	.featured-copy > p:not(.eyebrow) {
		line-height: 1.65;
		margin: 0 0 1rem;
	}
	.article-link {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		gap: 1rem;
		font-weight: 600;
	}
	time {
		font: 400 0.75rem/1.4 var(--atv-font-ui);
	}
	.featured-copy time {
		margin-top: 0.5rem;
	}
	.article-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
	}
	.article-card {
		display: flex;
		flex-direction: column;
		border-bottom: 1px solid var(--atv-border);
		min-width: 0;
	}
	.article-art {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 140px;
		padding: 1rem 1.25rem;
		gap: 1rem;
		background: var(--topic-tint);
	}
	.article-art img {
		height: 100px;
		width: 100px;
		object-fit: contain;
		mix-blend-mode: multiply;
	}
	.article-art p {
		margin: 0;
		font-size: 0.68rem;
		text-align: right;
	}
	.article-copy {
		padding: 1.4rem 0 1.1rem;
		display: flex;
		flex-direction: column;
		flex: 1;
	}
	.article-copy .eyebrow {
		margin: 0 0 0.5rem;
	}
	.article-copy h3 {
		font: 500 1.55rem/1.2 var(--atv-font-display);
		margin: 0;
	}
	.article-copy > p:not(.eyebrow) {
		line-height: 1.65;
		font-size: 0.95rem;
	}
	.article-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		margin-top: auto;
	}
	.article-meta a {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		font-weight: 600;
	}
	.magazine-next {
		display: grid;
		grid-template-columns: 1.3fr 1fr;
		gap: 3rem;
		align-items: center;
		border-block: 1px solid var(--atv-border);
		padding-block: 2.5rem;
		margin-top: 3rem;
	}
	.magazine-next h2 {
		font: 500 clamp(1.9rem, 3vw, 2.6rem)/1.1 var(--atv-font-display);
		margin: 0;
	}
	.magazine-next p {
		max-width: 35rem;
		line-height: 1.6;
	}
	.next-actions {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 1rem;
	}
	.next-actions > a {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
	.empty-results {
		padding: 3rem 1.5rem;
		text-align: center;
		background: var(--atv-paper-0);
	}
	.empty-results h3 {
		font: 500 2rem/1.15 var(--atv-font-display);
		margin-top: 0;
	}
	@media (max-width: 900px) {
		.magazine-search {
			grid-template-columns: 1fr 1fr;
		}
		.article-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		.featured-copy {
			padding: 1.5rem;
		}
		.magazine-next {
			gap: 1.5rem;
		}
	}
	@media (max-width: 600px) {
		.magazine-masthead {
			text-align: left;
		}
		.magazine-masthead h1 {
			max-width: 6ch;
		}
		.topics {
			flex-wrap: nowrap;
			justify-content: flex-start;
			overflow-x: auto;
			padding-inline: 0.2rem;
		}
		.topics a {
			flex-shrink: 0;
		}
		.magazine-search {
			grid-template-columns: 1fr 1fr;
			gap: 0.75rem;
		}
		.search-field,
		.magazine-search button {
			grid-column: 1 / -1;
		}
		.featured,
		.article-grid,
		.magazine-next {
			grid-template-columns: 1fr;
		}
		.featured-art {
			padding: 1.25rem;
		}
		.featured-art img {
			max-width: 190px;
		}
		.featured-copy h3 {
			font-size: 2rem;
		}
		.article-art {
			min-height: 110px;
		}
		.article-art img {
			height: 85px;
			width: 85px;
		}
		.results-heading {
			align-items: flex-start;
		}
		.results-heading h2 {
			max-width: 65%;
		}
	}
</style>
