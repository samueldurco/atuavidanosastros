<script lang="ts">
	import { SITE, universes } from '$lib/data/site';
	import { mvpArt, mvpThemes } from '$lib/data/mvp-visual';
	import { editorialTopic } from '$lib/data/editorial-topics';
	import MvpUniverseCard from '$lib/components/MvpUniverseCard.svelte';
	import FreeToolsCollection from '$lib/components/free-tools/FreeToolsCollection.svelte';
	import ShopShowcase from '$lib/components/ShopShowcase.svelte';
	import SocialPresence from '$lib/components/SocialPresence.svelte';
	let { data } = $props();
</script>

<svelte:head>
	<title>{SITE.name} — {SITE.tagline}</title>
	<meta name="description" content={SITE.description} />
	<link rel="canonical" href={SITE.url} />
</svelte:head>

<div class="mvp-public">
	<section class="home-hero" data-stitch="PUB-01">
		<div class="wrap home-hero-grid">
			<div class="home-copy">
				<p class="eyebrow">Astrologia e autoconhecimento</p>
				<h1>Conheça seu mapa.<br />Explore seu <em>momento.</em></h1>
				<p class="lead">
					Seu mapa, seus relacionamentos, o trabalho e os sonhos. Escolha por onde começar a se
					conhecer.
				</p>
				<div class="home-hero-actions">
					<a class="button light" href="#ferramentas"
						>Experimente grátis <span aria-hidden="true">↗</span></a
					>
					<a class="home-hero-link" href="#universos"
						>Explore os seis universos <span aria-hidden="true">↓</span></a
					>
				</div>
			</div>
		</div>
	</section>

	<FreeToolsCollection
		canSave={Boolean(data.authConfigured && data.user)}
		hasAccount={Boolean(data.user)}
	/>

	<section class="wrap section home-discovery" id="universos" aria-labelledby="universes-heading">
		<header class="chapter-opening">
			<p class="eyebrow">Um assunto, diferentes formas de explorar</p>
			<h2 class="chapter-title" id="universes-heading">Explore os<br /><em>seis universos</em></h2>
			<p>Ferramentas, leituras digitais e artigos para o que interessa a você agora.</p>
		</header>
		<div class="grid grid-3">
			{#each universes as universe (universe.slug)}
				<MvpUniverseCard
					identity={universe.slug}
					title={universe.title}
					description={universe.description}
					href={universe.href}
					eyebrow={universe.eyebrow}
				/>
			{/each}
		</div>
		<nav class="catalog-paths" aria-label="Catálogos de produtos">
			<a href="/leituras">
				<span class="eyebrow">Leituras digitais</span>
				<strong>Uma leitura para você <span aria-hidden="true">↗</span></strong>
				<span
					>Compare leituras avulsas de mapa astral, previsões, amor, carreira, Tarot e sonhos.</span
				>
			</a>
			<a href="/loja">
				<span class="eyebrow">Produtos físicos · Loja dos Signos</span>
				<strong>Astrologia no seu espaço <span aria-hidden="true">↗</span></strong>
				<span>Conheça as primeiras artes da coleção de pôsteres, ainda em preparação.</span>
			</a>
		</nav>
		<div class="micro-pause" aria-hidden="true">
			<img src={mvpArt('fases-lunares')} alt="" width="320" height="90" loading="lazy" />
		</div>
	</section>

	<section class="magazine-section section" aria-labelledby="magazine-heading">
		<div class="wrap">
			<div class="section-heading">
				<div>
					<p class="eyebrow">Artigos, guias e histórias</p>
					<h2 class="chapter-title" id="magazine-heading">Revista <em>ATVNA</em></h2>
				</div>
				<a class="text-link" href="/revista">Explorar a revista <span aria-hidden="true">↗</span></a
				>
			</div>
			<p class="section-intro">
				Entenda os símbolos, tire dúvidas e encontre novas formas de olhar para o seu dia.
			</p>
			<div class="grid grid-3">
				{#each data.articles as article (article.path)}
					{@const theme = mvpThemes[editorialTopic(article.path) ?? 'meu-ceu']}
					<article class="editorial-card card">
						<div class="editorial-art" style:background={theme.tint}>
							<img src={mvpArt(theme.art)} alt="" width="320" height="200" loading="lazy" />
						</div>
						<div class="card-body">
							<p class="eyebrow">Para ler e explorar</p>
							<h3><a href={article.path}>{article.title}</a></h3>
							<p>{article.description}</p>
							<a class="text-link" href={article.path}
								>Ler artigo <span aria-hidden="true">↗</span></a
							>
						</div>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<div class="wrap shop-section"><ShopShowcase /></div>

	<section class="membership-section section" aria-labelledby="membership-heading">
		<div class="wrap membership-grid">
			<div>
				<p class="eyebrow">Assinatura de leituras digitais</p>
				<h2 class="chapter-title" id="membership-heading">Seu momento.<br /><em>ATV+</em></h2>
				<p class="membership-intro">
					Escolha como acompanhar seus próximos 30 dias, com previsões e leituras que fazem sentido
					para você.
				</p>
				<a class="button light" href="/atv-mais"
					>Conhecer a assinatura ATV+ <span aria-hidden="true">↗</span></a
				>
			</div>
			<div class="membership-levels">
				<div>
					<span>01</span>
					<h3>Essencial</h3>
					<p>Uma previsão de 30 dias: geral ou de dinheiro e carreira.</p>
				</div>
				<div>
					<span>02</span>
					<h3>Ampliado</h3>
					<p>A previsão e uma leitura de Tarot de 3 cartas ou de um sonho.</p>
				</div>
				<div>
					<span>03</span>
					<h3>Premium</h3>
					<p>A previsão e mais opções para aprofundar suas questões com Tarot ou sonhos.</p>
				</div>
				<a href="/atv-mais">Compare o que está incluído →</a>
			</div>
		</div>
	</section>

	<section class="wrap section"><SocialPresence /></section>
	<div class="wrap method-note">
		<p>Quer entender como funciona uma leitura?</p>
		<a href="/metodo">Conheça nosso método <span aria-hidden="true">↗</span></a>
	</div>
</div>

<style>
	.home-copy .lead {
		color: #fff8e9;
		max-width: 35rem;
	}
	.chapter-title {
		font: 500 clamp(2.8rem, 6vw, 6rem)/1.02 var(--atv-font-display);
		letter-spacing: -0.045em;
	}
	.chapter-title em {
		font-weight: 400;
	}
	.catalog-paths {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.5rem;
		margin-top: 2.5rem;
	}
	.catalog-paths a {
		display: grid;
		gap: 0.75rem;
		padding: clamp(1.25rem, 3vw, 2rem);
		border: 1px solid #c7bfac;
		border-radius: 4px;
		color: inherit;
		text-decoration: none;
	}
	.catalog-paths a:hover {
		background: #fff8e9;
	}
	.catalog-paths strong {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		font: 500 1.8rem/1.15 var(--atv-font-display);
	}
	.catalog-paths .eyebrow {
		margin: 0;
	}
	.catalog-paths a > span:last-child {
		line-height: 1.6;
	}
	@media (max-width: 680px) {
		.catalog-paths {
			grid-template-columns: 1fr;
		}
	}
	.micro-pause {
		display: flex;
		justify-content: center;
		margin-top: 3rem;
	}
	.micro-pause img {
		width: min(320px, 65%);
		height: 90px;
		object-fit: contain;
	}
	.magazine-section {
		background: #e8dfc944;
		border-block: 1px solid #173c4d20;
	}
	.section-heading {
		display: flex;
		justify-content: space-between;
		gap: 2rem;
		align-items: end;
	}
	.section-heading h2 {
		margin: 0.4rem 0 0;
	}
	.section-intro {
		max-width: 40rem;
		margin: 1.5rem 0 2.5rem;
		font: 1.2rem/1.6 var(--atv-font-editorial);
	}
	.editorial-card {
		padding: 0;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}
	.editorial-art {
		padding: 1rem;
	}
	.editorial-art img {
		width: 100%;
		height: 11rem;
		object-fit: contain;
		mix-blend-mode: multiply;
	}
	.card-body {
		padding: 1.6rem;
		flex: 1;
	}
	.card-body h3 a {
		color: inherit;
		text-decoration: none;
	}
	.shop-section {
		padding-block: 2rem;
	}
	.membership-section {
		background: #102c3d url('/brand/mvp/assets/universos/fundo-home.webp') center/cover;
		color: #fff8e9;
	}
	.membership-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4rem;
		padding: clamp(1.5rem, 4vw, 3rem);
		background: #102c3dec;
	}
	.membership-grid h2,
	.membership-grid h3,
	.membership-grid .eyebrow {
		color: inherit;
	}
	.membership-grid h2 {
		margin: 1rem 0;
	}
	.membership-intro {
		max-width: 34rem;
		font: 1.25rem/1.6 var(--atv-font-editorial);
		margin-bottom: 2rem;
	}
	.membership-levels {
		align-self: center;
	}
	.membership-levels > div {
		position: relative;
		padding: 0.8rem 0 1.2rem 2.5rem;
		border-bottom: 1px solid #fff8e933;
	}
	.membership-levels span {
		position: absolute;
		left: 0;
		top: 1.1rem;
		color: #e9c09c;
		font: 0.85rem var(--atv-font-ui);
	}
	.membership-levels h3 {
		margin: 0 0 0.4rem;
	}
	.membership-levels p {
		margin: 0;
		line-height: 1.6;
	}
	.membership-levels > a {
		display: inline-block;
		color: #fff8e9;
		margin-top: 1.5rem;
	}
	.method-note {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		border-top: 1px solid #173c4d33;
		padding-block: 1.5rem;
	}
	.method-note p {
		margin: 0;
	}
	@media (max-width: 700px) {
		.section-heading,
		.method-note {
			display: block;
		}
		.section-heading > a {
			display: inline-block;
			margin-top: 1.2rem;
		}
		.membership-grid {
			grid-template-columns: 1fr;
			gap: 2rem;
		}
		.chapter-title {
			font-size: clamp(2.8rem, 10vw, 4.5rem);
		}
		.method-note a {
			display: inline-block;
			margin-top: 0.5rem;
		}
	}
</style>
