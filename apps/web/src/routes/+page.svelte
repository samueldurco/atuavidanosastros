<script lang="ts">
	import { SITE, universes } from '$lib/data/site';
	import { mvpArt, mvpThemes } from '$lib/data/mvp-visual';
	import { editorialTopic } from '$lib/data/editorial-topics';
	import FreeToolsCollection from '$lib/components/free-tools/FreeToolsCollection.svelte';
	import DigitalShowcase from '$lib/components/home/DigitalShowcase.svelte';
	import ShopHomeShowcase from '$lib/components/home/ShopHomeShowcase.svelte';
	import '$lib/styles/home-approved.css';
	let { data } = $props();
	let toolActive = $state(false);
</script>

<svelte:head>
	<title>{SITE.name} — uma descoberta de cada vez</title>
	<link rel="canonical" href={SITE.url} />
	<meta
		name="description"
		content="Ferramentas grátis, produtos digitais e histórias para ampliar seu olhar. Explore astrologia, Tarot, sonhos e a Loja dos Signos."
	/>
	<link
		rel="preload"
		href="/brand/home-approved/newsreader-italic-latin-variable.woff2"
		as="font"
		type="font/woff2"
		crossorigin="anonymous"
	/>
</svelte:head>

<div class="approved-home">
	<section class="approved-hero" aria-labelledby="home-heading">
		<div class="hero-inner">
			<div class="hero-brand" role="img" aria-label="A tua vida nos astros">
				<img src="/brand/mvp/assets/marca-escura.svg" alt="" width="110" height="110" /><span
					class="hero-wordmark"
					aria-hidden="true"><span>A tua vida</span><strong>nos astros</strong></span
				>
			</div>
			<p class="eyebrow">Astrologia · Tarot · Sonhos</p>
			<h1 id="home-heading">Conheça seu mapa.<br /><em>Explore seu momento.</em></h1>
			<p class="hero-description">
				Ferramentas gratuitas, leituras pessoais e histórias para ampliar seu olhar. Escolha um
				caminho e faça uma descoberta de cada vez.
			</p>
			<div class="hero-paths">
				<a
					href="#ferramentas"
					data-atv-event="home_path_select"
					data-atv-context="hero"
					data-atv-cta="tools"
					>Experimentar uma ferramenta grátis <span aria-hidden="true">↗</span></a
				><a
					href="#produtos"
					data-atv-event="home_path_select"
					data-atv-context="hero"
					data-atv-cta="products">Conhecer produtos digitais <span aria-hidden="true">↗</span></a
				>
			</div>
			<p class="hero-note">Um primeiro passo pode abrir um universo.</p>
		</div>
	</section>
	<FreeToolsCollection onToolOpenChange={(open) => (toolActive = open)} />
	<section class="home-section digital-section" id="produtos" aria-labelledby="products-heading">
		<div class="home-wrap">
			<header class="home-section-head">
				<div>
					<p class="eyebrow">02 / Produtos digitais</p>
					<h2 id="products-heading">Leituras para você.<br /><em>Um tema de cada vez.</em></h2>
				</div>
				<p>
					Conheça nossos produtos: escolha uma leitura avulsa para aprofundar um tema ou o ATV+ para
					acompanhar seus ciclos.
				</p>
			</header>
			<DigitalShowcase {toolActive} highlights={data.digitalHighlights} />
		</div>
	</section>
	<section class="home-section universe-section" id="universos" aria-labelledby="universes-heading">
		<div class="home-wrap">
			<header class="home-section-head">
				<div>
					<p class="eyebrow">03 / Seis universos</p>
					<h2 id="universes-heading">Por onde seu olhar<br /><em>quer caminhar?</em></h2>
				</div>
				<p>Do seu céu aos símbolos dos sonhos, encontre um lugar para a sua curiosidade.</p>
			</header>
			<div class="home-universe-grid">
				{#each universes as universe, index (universe.slug)}
					{@const theme = mvpThemes[universe.slug]}
					{@const recent = data.contextualArticles[universe.slug]}
					<article
						class="home-universe"
						style={`--universe-ink:${theme.ink};--universe-tint:${theme.tint}`}
					>
						<a class="universe-main" href={universe.href}
							><span class="universe-number">{String(index + 1).padStart(2, '0')}</span><img
								src={mvpArt(theme.art)}
								alt=""
								width="240"
								height="200"
								loading="lazy"
							/><span class="eyebrow">{universe.eyebrow}</span>
							<h3>{universe.title}</h3>
							<span class="universe-arrow" aria-hidden="true">↗</span></a
						>{#if recent}<a class="universe-recent" href={recent.path}
								><span>Para explorar neste universo</span><strong
									>{recent.title} <span aria-hidden="true">↗</span></strong
								></a
							>{/if}
					</article>
				{/each}
			</div>
		</div>
	</section>
	<section class="home-section" id="revista" aria-labelledby="magazine-heading">
		<div class="home-wrap">
			<header class="home-section-head">
				<div>
					<p class="eyebrow">04 / Revista · em destaque</p>
					<h2 id="magazine-heading">Uma pausa <em>para ler.</em></h2>
				</div>
				<div>
					<p>Ideias e símbolos para olhar a vida com mais curiosidade.</p>
					<a class="home-text-link" href="/revista"
						>Explorar a revista <span aria-hidden="true">↗</span></a
					>
				</div>
			</header>
			<div class="home-article-grid">
				{#each data.articles as article (article.path)}
					{@const topic = editorialTopic(article.path) ?? 'meu-ceu'}{@const theme =
						mvpThemes[topic]}
					<article class="home-article">
						<a
							class="article-image"
							href={article.path}
							tabindex="-1"
							aria-hidden="true"
							style:background={theme.tint}
							><img
								src={article.image?.path ?? mvpArt(theme.art)}
								alt=""
								width="480"
								height="320"
								loading="lazy"
								class:engraving={!article.image}
							/></a
						>
						<p class="eyebrow">
							{universes.find((u) => u.slug === topic)?.title ?? 'Revista ATVNA'} ·
							<time datetime={article.publishedAt}
								>{new Intl.DateTimeFormat('pt-BR', {
									day: '2-digit',
									month: 'short',
									timeZone: 'America/Sao_Paulo'
								}).format(new Date(article.publishedAt))}</time
							>
						</p>
						<h3><a href={article.path}>{article.title}</a></h3>
						<p>{article.description}</p>
						<a class="home-text-link" href={article.path}
							>Ler artigo <span aria-hidden="true">↗</span></a
						>
					</article>
				{/each}
			</div>
		</div>
	</section>
	<section class="home-section home-shop" id="loja" aria-labelledby="shop-heading">
		<div class="home-wrap">
			<header class="home-section-head">
				<div>
					<p class="eyebrow">05 / Loja dos Signos</p>
					<h2 id="shop-heading">O seu universo,<br /><em>perto de você.</em></h2>
				</div>
				<p>Artes dos signos em roupas, objetos e pequenos companheiros do cotidiano.</p>
			</header>
			<ShopHomeShowcase {toolActive} highlights={data.shopHighlights} />
		</div>
	</section>
</div>
