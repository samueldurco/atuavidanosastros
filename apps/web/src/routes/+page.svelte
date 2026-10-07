<script lang="ts">
	import { SITE, universes } from '$lib/data/site';
	import VisualMotif from '$lib/components/VisualMotif.svelte';
	import { visualV3, visualUniverse } from '$lib/data/visual-v3';
	let { data } = $props();
</script>

<svelte:head>
	<title>{SITE.name} — {SITE.tagline}</title>
	<meta name="description" content={SITE.description} />
	<link rel="canonical" href={SITE.url} />
</svelte:head>
<section class="hero" data-stitch="PUB-01">
	<div class="container hero-grid">
		<div>
			<p class="eyebrow">Astrologia e autoconhecimento</p>
			<h1 class="display">Conheça seu mapa. Explore seu momento.</h1>
			<p class="lead">
				Explore mapa astral, previsões, amor, carreira, Tarot e sonhos. Comece com uma ferramenta
				gratuita ou encontre um assunto para conhecer melhor.
			</p>
			<div class="hero-actions">
				<a class="button" href="#comece-gratuitamente">Começar gratuitamente</a>
				<a class="button secondary" href="/leituras">Conhecer as leituras</a>
			</div>
		</div>
		<div class="hero-art" aria-hidden="true">
			<img src={visualV3.hero} alt="" width="760" height="760" fetchpriority="high" />
		</div>
	</div>
</section>
<section id="comece-gratuitamente" class="tool-entry section" aria-labelledby="free-heading">
	<div class="container entry-grid">
		<div>
			<p class="eyebrow">Sem custo · sem cadastro para calcular</p>
			<VisualMotif identity="career-compass" />
			<h2 class="h2" id="free-heading">Comece gratuitamente</h2>
			<h3>Bússola de Carreira</h3>
			<p class="lead">
				Descubra o signo e o grau do seu Meio do Céu, um dos pontos do mapa associados à vida
				profissional. Informe sua data, hora e cidade de nascimento.
			</p>
			<a class="button" href="/bussola-de-carreira">Calcular meu Meio do Céu grátis</a>
		</div>
		<ol class="tool-steps">
			<li>
				<span>01</span>
				<div>
					<strong>Informe seus dados de nascimento</strong>
					<p>Data, hora e cidade. Confira a localização antes de calcular.</p>
				</div>
			</li>
			<li>
				<span>02</span>
				<div>
					<strong>Conheça seu Meio do Céu</strong>
					<p>Veja o signo, o grau, o método e os limites do cálculo.</p>
				</div>
			</li>
			<li>
				<span>03</span>
				<div>
					<strong>Guarde se quiser</strong>
					<p>Com sua conta, você pode salvar o resultado na Biblioteca.</p>
				</div>
			</li>
		</ol>
	</div>
</section>
<section id="universos" class="section" aria-labelledby="readings-heading">
	<div class="container">
		<div class="section-intro">
			<div>
				<p class="eyebrow">Produtos digitais</p>
				<h2 class="h2" id="readings-heading">Leituras e experiências</h2>
			</div>
			<a href="/leituras">Ver todas as leituras →</a>
		</div>
		<p class="lead">
			Escolha um tema para conhecer os produtos digitais. Confira o conteúdo e a disponibilidade de
			cada leitura.
		</p>
		<div class="grid grid-3 universe-grid">
			{#each universes as universe (universe.slug)}
				<article class="card universe" data-v3-theme={visualUniverse(universe.slug)}>
					<VisualMotif identity={universe.slug} />
					<span class="universe-rule" aria-hidden="true"></span><span>{universe.eyebrow}</span>
					<h3>{universe.title}</h3>
					<p>{universe.description}</p>
					<a href={`/leituras?tema=${universe.slug}`}
						>{universe.cta} <span aria-hidden="true">→</span></a
					>
				</article>
			{/each}
		</div>
	</div>
</section>
<section class="section editorial-entry" aria-labelledby="magazine-heading">
	<div class="container">
		<div class="section-intro">
			<div>
				<p class="eyebrow">Artigos e guias</p>
				<h2 class="h2" id="magazine-heading">Revista ATVNA</h2>
			</div>
			<a href="/caderno">Explorar a Revista ATVNA →</a>
		</div>
		<p class="lead">
			Entenda seu mapa astral, acompanhe os temas dos ciclos e explore relacionamentos, carreira,
			Tarot e sonhos.
		</p>
		<div class="grid grid-3">
			{#each data.articles as article (article.id)}
				<article class="card editorial-card">
					<p class="eyebrow">Guia</p>
					<h3><a href={article.path}>{article.title}</a></h3>
					<p>{article.description}</p>
				</article>
			{/each}
		</div>
	</div>
</section>
<section class="section shop-entry" aria-labelledby="shop-heading">
	<div class="container entry-grid">
		<div>
			<p class="eyebrow">Produtos físicos</p>
			<h2 class="h2" id="shop-heading">Loja dos Signos</h2>
			<p class="lead">Um espaço para levar os símbolos dos signos para o seu dia a dia.</p>
			<a class="button secondary" href="/loja">Conhecer a Loja dos Signos</a>
		</div>
		<div class="shop-note">
			<strong>A coleção está em preparação.</strong>
			<p>As novidades em produtos físicos serão apresentadas aqui quando estiverem disponíveis.</p>
		</div>
	</div>
</section>
<section class="method section">
	<div class="container entry-grid">
		<div>
			<p class="eyebrow">Nosso método</p>
			<h2 class="h2">Entenda suas leituras.</h2>
			<p class="lead">
				As leituras usam os dados que você informa. Você pode consultar os fatores do mapa e
				entender como cada resultado foi produzido.
			</p>
			<a class="button secondary" href="/metodo">Entender as leituras</a>
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

<style>
	.hero-art {
		width: min(100%, 30rem);
		aspect-ratio: 1;
		justify-self: center;
		mix-blend-mode: multiply;
	}

	.entry-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
		gap: clamp(2rem, 6vw, 6rem);
		align-items: center;
	}
	.tool-entry {
		background: var(--atv-surface-muted);
		border-block: 1px solid var(--atv-border);
	}
	.tool-steps {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.tool-steps li {
		display: flex;
		gap: 1.5rem;
		padding-block: 1.5rem;
		border-bottom: 1px solid var(--atv-border);
	}
	.tool-steps li > span {
		color: var(--atv-text-accent);
		font: 500 1.75rem var(--atv-font-display);
	}
	.tool-steps p {
		margin: 0.5rem 0 0;
		color: var(--atv-text-secondary);
	}
	.method-facts {
		padding: 2rem;
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-md);
		background: var(--atv-surface-card);
	}
	.method-facts div {
		display: grid;
		grid-template-columns: 0.6fr 1fr;
		gap: 1rem;
		padding-block: 1.25rem;
		border-bottom: 1px solid var(--atv-border);
	}
	dt {
		font-weight: 600;
		font-size: 0.8rem;
	}
	dd {
		margin: 0;
		font-size: 0.875rem;
		color: var(--atv-text-secondary);
	}
	@media (max-width: 767px) {
		.entry-grid {
			grid-template-columns: 1fr;
		}
	}
	.hero {
		min-height: 38rem;
		display: grid;
		align-items: center;
		padding: clamp(3rem, 7vw, 7rem) 0;
		background: var(--atv-surface-page);
	}
	.hero-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(20rem, 0.85fr);
		align-items: center;
		gap: clamp(2rem, 5vw, 5rem);
	}
	.lead {
		max-width: 43rem;
	}
	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.85rem;
		margin-top: 2rem;
	}
	.universe-grid {
		margin-top: 3rem;
	}
	.universe {
		padding: 1.6rem;
		display: flex;
		flex-direction: column;
		min-height: 18rem;
	}
	.universe-rule {
		width: 2.25rem;
		height: 1px;
		background: var(--atv-gold-500);
		margin-bottom: 0.25rem;
	}
	.universe > span {
		color: var(--atv-text-accent);
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}
	.universe h3 {
		font: 500 2rem/1.1 var(--atv-font-display);
		margin: 0.8rem 0;
	}
	.universe p {
		color: var(--atv-text-secondary);
		flex: 1;
	}
	.universe a {
		font-weight: 700;
		text-decoration: none;
	}
	.method {
		background: var(--atv-surface-page);
		border-block: 1px solid var(--atv-border);
	}
	.method .lead {
		color: var(--atv-text-secondary);
	}
	.method .secondary {
		border-color: var(--atv-action);
		color: var(--atv-action);
	}
	@media (max-width: 900px) {
		.hero {
			min-height: auto;
		}
		.hero-grid {
			grid-template-columns: 1fr;
			gap: 3rem;
		}
	}
	@media (max-width: 520px) {
		.hero-actions {
			flex-direction: column;
		}
	}

	.section-intro {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: end;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}
	.section-intro .h2 {
		margin-bottom: 0;
	}
	.editorial-card {
		padding: 1.6rem;
	}
	.editorial-card h3 {
		font: 500 1.7rem/1.2 var(--atv-font-display);
	}
	.editorial-card p:not(.eyebrow) {
		color: var(--atv-text-secondary);
	}
	.shop-entry {
		background: var(--atv-surface-muted);
		border-block: 1px solid var(--atv-border);
	}
	.shop-note {
		padding: 2rem;
		border: 1px solid var(--atv-border);
		background: var(--atv-surface-card);
	}
	.shop-note strong {
		font: 500 2rem/1.2 var(--atv-font-display);
	}
</style>
