<script lang="ts">
	import { atvPlusPlans } from '@atv/domain';
	import { SITE, universes } from '$lib/data/site';
	import { mvpArt, mvpThemes } from '$lib/data/mvp-visual';
	import { customerProduct } from '$lib/data/product-copy';
	import { editorialTopic } from '$lib/data/editorial-topics';
	import { homeArticleArt, homeUniverseArt } from '$lib/home-art';
	import FreeToolsCollection from '$lib/components/free-tools/FreeToolsCollection.svelte';
	import HomeReadings from '$lib/components/home/HomeReadings.svelte';
	import ReadingSample from '$lib/components/home/ReadingSample.svelte';
	import ShopHomeShowcase from '$lib/components/home/ShopHomeShowcase.svelte';
	import '$lib/styles/home-approved.css';
	let { data } = $props();
	let toolActive = $state(false);
	const plus = customerProduct('atv-plus');
	const plusFormulas = [
		'1 previsão pessoal',
		'1 previsão + 1 leitura',
		'1 previsão + 2 leituras ou 1 método maior'
	];
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
			<div class="hero-copy">
				<div class="hero-brand-intro">
					<div class="hero-brand" role="img" aria-label="A tua vida nos astros">
						<span class="hero-wordmark" aria-hidden="true"
							><span>A tua vida</span><strong>nos astros</strong></span
						>
					</div>
					<p class="eyebrow hero-positioning">Astrologia · Tarot · Sonhos</p>
				</div>
				<h1 id="home-heading">Ferramentas e leituras para <em>explorar o seu momento.</em></h1>
				<p class="hero-description">
					Explore astrologia, tarot e sonhos. Comece por uma ferramenta gratuita e conheça leituras
					para aprofundar o que faz sentido para você.
				</p>
				<div class="hero-paths">
					<a
						href="#ferramentas"
						data-atv-event="home_path_select"
						data-atv-context="hero"
						data-atv-cta="tools">Explorar ferramentas grátis <span aria-hidden="true">↗</span></a
					><a
						href="#amostra"
						data-atv-event="home_path_select"
						data-atv-context="hero"
						data-atv-cta="sample">Por dentro de uma leitura <span aria-hidden="true">↓</span></a
					>
				</div>
				<p class="hero-note">Escolha seu interesse. A primeira descoberta é grátis.</p>
			</div>
			<div class="hero-art" aria-hidden="true">
				<img src={mvpArt('mandala-gravada')} alt="" width="640" height="640" fetchpriority="high" />
				<span>Um céu de possibilidades.<br /><em>Uma descoberta de cada vez.</em></span>
			</div>
		</div>
	</section>
	<FreeToolsCollection onToolOpenChange={(open) => (toolActive = open)} />
	<ReadingSample />
	<section class="home-section digital-section" id="produtos" aria-labelledby="products-heading">
		<div class="home-wrap">
			<header class="home-section-head">
				<div>
					<p class="eyebrow">03 / Leituras digitais avulsas</p>
					<h2 id="products-heading">Leituras para você.<br /><em>Um tema de cada vez.</em></h2>
				</div>
				<p>
					Uma leitura digital dedicada ao assunto que você quer explorar. Conheça o conteúdo, os
					dados necessários e a disponibilidade de cada produto.
				</p>
			</header>
			<HomeReadings highlights={data.digitalHighlights} />
		</div>
	</section>
	<section class="home-plus" id="atv-mais-home" aria-labelledby="home-plus-heading">
		<div class="home-wrap plus-layout">
			<div class="plus-intro">
				<p class="eyebrow">04 / Continue com ATV+</p>
				<h2 id="home-plus-heading">Um novo olhar,<br /><em>a cada ciclo.</em></h2>
				<p>
					Previsões e leituras em ciclos de 30 dias. Conheça as três formas de acompanhar o seu
					momento.
				</p>
				<a
					class="plus-action"
					href="/atv-mais"
					data-atv-event="product_click"
					data-atv-product="atv-plus"
					data-atv-context="subscription"
					data-atv-cta="offer">Conhecer os planos <span aria-hidden="true">↗</span></a
				>
			</div>
			<div class="plus-options">
				<div class="plus-signature" role="img" aria-label="ATV+ — assinatura A Tua Vida nos Astros">
					<span class="plus-signature-house" aria-hidden="true">A tua vida nos astros</span>
					<span class="plus-signature-mark" aria-hidden="true">ATV<span>+</span></span>
					<span class="plus-signature-label" aria-hidden="true">Assinatura</span>
				</div>
				<div class="plus-plan-list">
					{#each atvPlusPlans as plan, index (plan.id)}
						<div class="plus-plan">
							<span class="plus-plan-number" aria-hidden="true">0{index + 1}</span>
							<h3>{plan.name}</h3>
							<p>{plusFormulas[index]}</p>
						</div>
					{/each}
				</div>
			</div>
			<p class="plus-note">
				{plus?.state === 'ACTIVE'
					? 'Consulte as condições de cada plano.'
					: plus?.state === 'PAUSED'
						? 'Planos indisponíveis no momento.'
						: 'Planos em preparação. Contratação ainda indisponível.'} Ferramentas grátis continuam acessíveis
				sem assinatura.
			</p>
		</div>
	</section>
	<section class="home-section universe-section" id="universos" aria-labelledby="universes-heading">
		<div class="home-wrap">
			<header class="home-section-head">
				<div>
					<p class="eyebrow">05 / Seis universos</p>
					<h2 id="universes-heading">Encontre o seu <em>assunto.</em></h2>
				</div>
				<p>Do seu céu aos símbolos dos sonhos, encontre um lugar para a sua curiosidade.</p>
			</header>
			<div class="home-universe-grid">
				{#each universes as universe, index (universe.slug)}
					{@const theme = mvpThemes[universe.slug]}
					<article
						class="home-universe"
						style={`--universe-ink:${theme.ink};--universe-tint:${theme.tint}`}
					>
						<a class="universe-main" href={universe.href}
							><span class="universe-number">{String(index + 1).padStart(2, '0')}</span><img
								src={homeUniverseArt[universe.slug]}
								alt=""
								width="720"
								height="480"
								loading="lazy"
							/><span class="eyebrow">{universe.eyebrow}</span>
							<h3>{universe.slug === 'amor' ? 'Amor e relações' : universe.title}</h3>
							<span class="universe-arrow" aria-hidden="true">↗</span></a
						>
					</article>
				{/each}
			</div>
		</div>
	</section>
	<section class="home-section magazine-section" id="revista" aria-labelledby="magazine-heading">
		<div class="home-wrap">
			<header class="home-section-head">
				<div>
					<p class="eyebrow">06 / Revista · em destaque</p>
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
					{@const topic = editorialTopic(article.path)}
					{@const articleArt = homeArticleArt[article.path] ?? article.image?.path}
					<article class="home-article" class:article-without-image={!articleArt}>
						{#if articleArt}
							<a class="article-image" href={article.path} tabindex="-1" aria-hidden="true"
								><img src={articleArt} alt="" width="480" height="320" loading="lazy" /></a
							>
						{/if}
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
					<p class="eyebrow">07 / Loja dos Signos</p>
					<h2 id="shop-heading">O seu universo,<br /><em>perto de você.</em></h2>
				</div>
				<p>Artes dos signos em roupas, objetos e pequenos companheiros do cotidiano.</p>
			</header>
			<ShopHomeShowcase {toolActive} />
		</div>
	</section>
</div>
