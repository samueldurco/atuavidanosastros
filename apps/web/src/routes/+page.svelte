<script lang="ts">
	import { SITE, universes } from '$lib/data/site';
	import { mvpArt, mvpThemes } from '$lib/data/mvp-visual';
	import MvpUniverseCard from '$lib/components/MvpUniverseCard.svelte';
	let { data } = $props();
	const editorialThemes = ['meu-ceu', 'proposito', 'amor'];
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
					Mapa astral, previsões, amor, carreira, Tarot e sonhos. Encontre um tema, leia sobre ele e
					conheça as leituras do ATVNA.
				</p>
				<div class="home-hero-actions">
					<a class="button light" href="#universos"
						>Explore os universos <span aria-hidden="true">↗</span></a
					>
					<a class="home-hero-link" href="/bussola-de-carreira"
						>Experimente a Bússola de Carreira <span aria-hidden="true">↗</span></a
					>
				</div>
			</div>
		</div>
	</section>

	<section class="wrap section home-discovery" id="universos" aria-labelledby="universes-heading">
		<header class="chapter-opening">
			<p class="eyebrow">Escolha seu assunto</p>
			<img
				class="chapter-lettering"
				src={mvpArt('lettering-descoberta')}
				alt="Descoberta"
				width="720"
				height="245"
				loading="lazy"
			/>
			<h2 id="universes-heading">Explore os seis universos</h2>
			<p>
				Encontre ferramentas gratuitas, leituras e artigos sobre o assunto que interessa a você.
			</p>
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
		<div class="micro-pause" aria-hidden="true">
			<img src={mvpArt('fases-lunares')} alt="" width="320" height="90" loading="lazy" />
		</div>
	</section>

	<section class="home-paths section" id="carreira" aria-labelledby="career-heading">
		<div class="wrap">
			<header class="chapter-opening">
				<p class="eyebrow">Uma primeira experiência</p>
				<img
					class="chapter-lettering"
					src={mvpArt('lettering-caminhos')}
					alt="Caminhos"
					width="650"
					height="210"
					loading="lazy"
				/>
				<h2 id="career-heading">Bússola de Carreira</h2>
			</header>
			<div class="home-paths-content">
				<div class="home-paths-art" aria-hidden="true">
					<img
						class="art"
						src={mvpArt('bussola-gravada')}
						alt=""
						width="230"
						height="230"
						loading="lazy"
					/>
				</div>
				<div>
					<p class="lead">
						Conheça o Meio do Céu e explore sua relação com carreira e vocação no mapa astral.
					</p>
					<p>Informe sua data, hora e cidade de nascimento para começar gratuitamente.</p>
					<a class="button" href="/bussola-de-carreira"
						>Calcular meu Meio do Céu grátis <span aria-hidden="true">↗</span></a
					>
				</div>
			</div>
		</div>
	</section>

	<section
		id="comece-gratuitamente"
		class="wrap section free-entry-section"
		aria-labelledby="free-heading"
	>
		<div class="paper free-entry-grid">
			<div>
				<p class="eyebrow">Sem custo · sem cadastro para calcular</p>
				<h2 id="free-heading">Descubra seu Ascendente</h2>
				<p>
					Informe sua data, hora e cidade de nascimento. Veja o signo e o grau do seu Ascendente,
					com uma leitura curta, antes de criar sua conta.
				</p>
				<a class="button" href="/ferramentas/ascendente">Calcular meu Ascendente grátis</a>
				<p>
					<a class="text-link" href="/ferramentas"
						>Explorar todas as ferramentas gratuitas <span aria-hidden="true">↗</span></a
					>
				</p>
			</div>
			<img
				class="free-entry-art"
				src={mvpArt('mandala-gravada')}
				alt=""
				width="280"
				height="280"
				loading="lazy"
			/>
		</div>
	</section>

	<section class="wrap section" aria-labelledby="magazine-heading">
		<div class="public-section-heading">
			<div>
				<p class="eyebrow">Artigos e guias</p>
				<h2 id="magazine-heading">Revista ATVNA</h2>
			</div>
			<a class="text-link" href="/revista"
				>Explorar a Revista ATVNA <span aria-hidden="true">↗</span></a
			>
		</div>
		<div class="grid grid-3">
			{#each data.articles as article, index (article.id)}
				<article
					class={'card editorial-card theme-' + editorialThemes[index % editorialThemes.length]}
				>
					<div class="card-art">
						<img
							src={mvpArt(mvpThemes[editorialThemes[index % editorialThemes.length]].art)}
							alt=""
							width="320"
							height="220"
							loading="lazy"
						/>
					</div>
					<div class="card-body">
						<p class="eyebrow">Guia</p>
						<h3><a href={article.path}>{article.title}</a></h3>
						<p>{article.description}</p>
						<a class="text-link" href={article.path}>Ler o guia <span aria-hidden="true">↗</span></a
						>
					</div>
				</article>
			{/each}
		</div>
	</section>

	<section class="method-band section" aria-labelledby="method-heading">
		<div class="wrap method-grid">
			<div>
				<p class="eyebrow">Nosso método</p>
				<h2 id="method-heading">Entenda suas leituras</h2>
				<p>
					As leituras usam os dados que você informa. Você pode consultar os fatores do mapa e
					entender como cada resultado foi produzido.
				</p>
				<a class="button light" href="/metodo">Entender as leituras</a>
			</div>
			<dl class="method-facts">
				<div>
					<dt>Cálculo</dt>
					<dd>Fatos separados da interpretação</dd>
				</div>
				<div>
					<dt>Contexto</dt>
					<dd>Incertezas e limites visíveis</dd>
				</div>
				<div>
					<dt>Privacidade</dt>
					<dd>Você escolhe o que guardar</dd>
				</div>
				<div>
					<dt>Continuidade</dt>
					<dd>Suas leituras na Biblioteca</dd>
				</div>
			</dl>
		</div>
	</section>
</div>

<style>
	.home-copy .lead {
		color: #fff8e9;
	}
	.micro-pause {
		display: flex;
		justify-content: center;
		margin-top: 4rem;
	}
	.micro-pause img {
		width: min(320px, 65%);
		height: 90px;
		object-fit: contain;
	}
	.free-entry-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 280px;
		align-items: center;
		gap: 4rem;
		padding: 3rem;
	}
	.free-entry-art {
		width: 100%;
		object-fit: contain;
	}
	.free-entry-section p {
		max-width: 54ch;
	}
	.editorial-card {
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	.card-body {
		padding: 1.8rem;
		flex: 1;
	}
	.card-body h3 a {
		color: inherit;
		text-decoration: none;
	}
	.method-band {
		background: #102c3d url('/brand/mvp/assets/universos/fundo-home.webp') center/cover;
		color: #fff8e9;
	}
	.method-grid {
		display: grid;
		grid-template-columns: 1.1fr 1fr;
		gap: 4rem;
		background: #102c3de8;
		padding: 3rem;
	}
	.method-grid h2,
	.method-grid .eyebrow {
		color: #fff8e9;
	}
	.method-facts {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		margin: 0;
		align-content: center;
	}
	.method-facts dt {
		font-weight: 600;
		color: #dfb978;
	}
	.method-facts dd {
		margin: 0.5rem 0 0;
	}
	@media (max-width: 700px) {
		.free-entry-grid,
		.method-grid {
			grid-template-columns: 1fr;
			padding: 1.5rem;
			gap: 2rem;
		}
		.free-entry-art {
			width: 180px;
			justify-self: center;
		}
		.method-facts {
			gap: 1.5rem;
		}
	}
</style>
