<script lang="ts">
	import MagazineBulletin from '$lib/components/MagazineBulletin.svelte';
	import { magazineSections } from '$lib/data/magazine-navigation';
	import { mvpArt, mvpThemes } from '$lib/data/mvp-visual';
	import { interestNavigation } from '$lib/data/public-navigation';
	import { signNames } from '$lib/data/site';

	let { data, form } = $props();
	const [lead, ...secondary] = $derived(data.featured);
	const themeFor = (topicId?: keyof typeof mvpThemes) => mvpThemes[topicId ?? 'meu-ceu'];
	const topicLabel = (topicId: string | undefined) =>
		interestNavigation.find((topic) => topic.id === topicId)?.label;
	const date = new Intl.DateTimeFormat('pt-BR', {
		dateStyle: 'medium',
		timeZone: 'UTC'
	});
</script>

<div class="magazine container">
	<header class="masthead">
		<div>
			<h1>Revista ATVNA</h1>
			<p>Trânsitos astrológicos, guias e horóscopos.</p>
		</div>
		<form
			class="search"
			action="/revista#acervo"
			method="GET"
			role="search"
			aria-label="Buscar na Revista"
		>
			<label for="revista-busca">Buscar na Revista</label>
			<div class="search-fields">
				<input
					id="revista-busca"
					type="search"
					name="q"
					value={data.query}
					placeholder="Ex.: Mercúrio retrógrado"
					maxlength="160"
				/>
				<button type="submit">Buscar</button>
			</div>
		</form>
	</header>

	<nav class="sections" aria-label="Seções da Revista">
		{#each magazineSections as section (section.id)}
			<a href={`/revista#${section.id}`}>{section.label}</a>
		{/each}
		<a href="#acervo">Acervo</a>
	</nav>

	{#if data.showCover}
		{#if lead}
			<section id="em-destaque" aria-labelledby="featured-title">
				<h2 id="featured-title">Em destaque</h2>
				<div class="features">
					<article class="featured">
						<div class="feature-art" style:--feature-tint={themeFor(lead.topicId).tint}>
							<img src={mvpArt(themeFor(lead.topicId).art)} alt="" width="220" height="220" />
						</div>
						<div class="feature-copy">
							<p class="category">{topicLabel(lead.topicId) ?? lead.kindLabel}</p>
							<h3><a href={lead.path}>{lead.title}</a></h3>
							<p>{lead.description}</p>
						</div>
					</article>
					{#if secondary.length}
						<div class="secondary">
							{#each secondary as item (item.id)}
								<article>
									<p class="category">{topicLabel(item.topicId) ?? item.kindLabel}</p>
									<h3><a href={item.path}>{item.title}</a></h3>
								</article>
							{/each}
						</div>
					{/if}
				</div>
			</section>
		{/if}

		{#if data.topics.length}
			<section id="guias-e-artigos" aria-labelledby="guides-title">
				<h2 id="guides-title">Guias e artigos</h2>
				<div class="topics">
					{#each data.topics as topic (topic.id)}
						<div class="topic">
							<img
								src={mvpArt(themeFor(topic.id).art)}
								alt=""
								width="58"
								height="58"
								loading="lazy"
							/>
							<div>
								<h3><a href={topic.href}>{topic.label} <span aria-hidden="true">↗</span></a></h3>
								<a class="topic-read" href={topic.read.path}>{topic.read.title}</a>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<MagazineBulletin receipt={form?.bulletin} />

		<section id="horoscopo-da-semana" aria-labelledby="weekly-title">
			<div class="section-heading">
				<h2 id="weekly-title">Horóscopo da semana</h2>
				<a href="/horoscopo">Ver horóscopo diário</a>
			</div>
			<p>Escolha seu signo para ler a previsão da semana.</p>
			<ul class="signs">
				{#each data.weeklySigns as sign (sign.label)}
					<li><a href={sign.href}>{sign.label}</a></li>
				{/each}
			</ul>
		</section>
	{/if}

	<section id="acervo" aria-labelledby="archive-title">
		<div class="section-heading">
			<h2 id="archive-title">
				{data.query ? 'Resultados da busca' : (data.selectedLabel ?? 'Acervo')}
			</h2>
			{#if !data.showCover}<a href="/revista">Voltar à capa</a>{/if}
		</div>
		{#if data.query}
			<p>{data.total} {data.total === 1 ? 'resultado' : 'resultados'} para “{data.query}”</p>
		{/if}
		{#if data.articles.length}
			<div class="archive">
				{#each data.articles as article (article.id)}
					<article class="article-card">
						<p class="category">{article.kindLabel}</p>
						{#if article.editions && article.editions.length > 1}
							<details>
								<summary>{article.title}</summary>
								<ul class="signs">
									{#each article.editions as edition (edition.sign)}
										<li><a href={edition.path}>{signNames[edition.sign]}</a></li>
									{/each}
								</ul>
							</details>
						{:else if article.editions?.[0]}
							<h3>
								<a href={article.editions[0].path}
									>{article.title} para {signNames[article.editions[0].sign]}</a
								>
							</h3>
						{:else}
							<h3><a href={article.path}>{article.title}</a></h3>
						{/if}
						<time datetime={article.publishedAt}>{date.format(new Date(article.publishedAt))}</time>
					</article>
				{/each}
			</div>
			{#if data.pagination.items.length > 1}
				<nav class="pagination" aria-label="Paginação do acervo">
					{#if data.pagination.previous}
						<a href={data.pagination.previous} rel="prev">Anterior</a>
					{/if}
					{#each data.pagination.items as item, index (item.number)}
						{#if index > 0 && data.pagination.items[index - 1].number + 1 < item.number}
							<span aria-hidden="true">…</span>
						{/if}
						<a
							href={item.href}
							aria-label={`Página ${item.number}`}
							aria-current={item.number === data.pagination.page ? 'page' : undefined}
							>{item.number}</a
						>
					{/each}
					{#if data.pagination.next}
						<a href={data.pagination.next} rel="next">Próxima</a>
					{/if}
				</nav>
			{/if}
		{:else}
			<p>
				Nenhuma leitura encontrada. Tente outra palavra ou <a href="/revista#acervo"
					>volte ao acervo</a
				>.
			</p>
		{/if}
	</section>
</div>

<style>
	.magazine {
		padding-block: clamp(1.5rem, 4vw, 3.5rem) 4rem;
	}
	.masthead {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(18rem, 26rem);
		align-items: end;
		gap: 1rem 2rem;
		padding-bottom: 1.35rem;
	}
	.masthead h1 {
		margin: 0;
		font-size: clamp(2.7rem, 6vw, 4.6rem);
		line-height: 1.05;
	}
	.masthead p,
	section > p {
		margin: 0.45rem 0 0;
	}
	.search label,
	.category {
		display: block;
		margin: 0 0 0.35rem;
		font-size: 0.82rem;
		font-weight: 700;
	}
	.search-fields {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.4rem;
	}
	.search input,
	.search button {
		min-height: 2.75rem;
		border: 1px solid var(--atv-text-primary);
		border-radius: 0.25rem;
		font: inherit;
		padding: 0.55rem 0.75rem;
	}
	.search input {
		width: 100%;
		background: var(--atv-paper-0);
		color: inherit;
	}
	.search button {
		background: var(--atv-text-primary);
		color: var(--atv-paper-0);
		font-weight: 650;
		cursor: pointer;
	}
	.sections {
		display: flex;
		gap: 0.25rem 1.5rem;
		flex-wrap: wrap;
		border-block: 1px solid var(--atv-border);
		padding-block: 0.2rem;
	}
	.sections a {
		padding-block: 0.55rem;
		font-size: 0.92rem;
		font-weight: 700;
	}
	section {
		margin-top: clamp(2rem, 4vw, 3rem);
		scroll-margin-top: 7rem;
	}
	.magazine :global(.bulletin) {
		margin-top: clamp(2rem, 4vw, 3rem);
	}
	section > h2,
	.section-heading h2 {
		margin: 0;
		font-size: clamp(1.75rem, 3vw, 2.45rem);
		line-height: 1.08;
	}
	section > h2 {
		margin-bottom: 0.95rem;
	}
	.features {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
		gap: 1rem 1.5rem;
	}
	.featured {
		display: grid;
		grid-template-columns: minmax(7rem, 0.72fr) minmax(0, 1.28fr);
		border: 1px solid var(--atv-border);
		align-items: stretch;
	}
	.feature-art {
		background: var(--feature-tint);
		display: grid;
		place-items: center;
		padding: 0.6rem;
	}
	.feature-art img {
		width: min(100%, 10rem);
		height: auto;
		object-fit: contain;
	}
	.feature-copy {
		padding: clamp(0.75rem, 2.5vw, 1.5rem);
		align-self: center;
	}
	.feature-copy h3,
	.secondary h3 {
		margin: 0;
		line-height: 1.15;
	}
	.feature-copy h3 {
		font-size: clamp(1.35rem, 2.35vw, 1.95rem);
	}
	.feature-copy > p:last-child {
		margin: 0.5rem 0 0;
		font-size: 0.9rem;
	}
	.secondary article {
		padding: 0.8rem 0;
		border-bottom: 1px solid var(--atv-border);
	}
	.secondary article:first-child {
		padding-top: 0.35rem;
	}
	.secondary h3 {
		font-size: clamp(1.14rem, 2vw, 1.5rem);
	}
	.topics {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0 1.3rem;
		border-top: 1px solid var(--atv-border);
	}
	.topic {
		display: grid;
		grid-template-columns: 3.5rem minmax(0, 1fr);
		align-items: center;
		gap: 0.8rem;
		padding-block: 0.9rem;
		border-bottom: 1px solid var(--atv-border);
	}
	.topic img {
		width: 100%;
		height: auto;
		object-fit: contain;
	}
	.topic h3 {
		font: 700 0.98rem/1.25 var(--atv-font-ui);
		margin: 0 0 0.2rem;
	}
	.topic-read {
		font-size: 0.84rem;
	}
	.section-heading {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.35rem 1rem;
	}
	.section-heading > a,
	.topic-read {
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}
	.signs {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(5.8rem, 1fr));
		gap: 0.35rem;
		list-style: none;
		margin: 0.65rem 0 0;
		padding: 0;
	}
	.signs a {
		display: block;
		padding: 0.45rem 0.2rem;
		border: 1px solid var(--atv-border);
		background: var(--atv-paper-1);
		text-align: center;
		font-size: 0.9rem;
		font-weight: 650;
	}
	.archive {
		margin-top: 0.7rem;
		border-top: 1px solid var(--atv-border);
	}
	.article-card {
		display: grid;
		grid-template-columns: 7rem minmax(0, 1fr) auto;
		gap: 0.3rem 0.8rem;
		align-items: baseline;
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--atv-border);
	}
	.article-card h3,
	summary {
		margin: 0;
		font-size: 1.03rem;
		font-weight: 650;
		font-family: var(--atv-font-ui);
	}
	summary {
		cursor: pointer;
	}
	.article-card .category,
	time {
		margin: 0;
		font-size: 0.8rem;
	}
	.pagination {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem;
		margin-top: 1.2rem;
	}
	.pagination a {
		min-width: 2.5rem;
		padding: 0.5rem 0.65rem;
		border: 1px solid var(--atv-border);
		text-align: center;
		font-size: 0.88rem;
	}
	.pagination [aria-current='page'] {
		background: var(--atv-text-primary);
		color: var(--atv-paper-0);
	}
	a:hover {
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}
	@media (max-width: 840px) {
		.topics {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 680px) {
		.masthead,
		.features {
			grid-template-columns: minmax(0, 1fr);
		}
		.article-card {
			grid-template-columns: minmax(0, 1fr) auto;
		}
		.article-card .category {
			grid-column: 1 / -1;
		}
		.secondary {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 0.7rem;
		}
		.secondary article {
			padding: 0.35rem 0 0.75rem;
		}
	}
	@media (max-width: 440px) {
		.topics {
			grid-template-columns: minmax(0, 1fr);
		}
		.featured {
			grid-template-columns: 5.75rem minmax(0, 1fr);
		}
		.article-card time {
			grid-column: 1 / -1;
		}
	}
</style>
