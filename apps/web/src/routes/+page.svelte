<script lang="ts">
	import { SITE, universes } from '$lib/data/site';
	import OrbitalPlate from '$lib/components/OrbitalPlate.svelte';
</script>

<svelte:head
	><title>{SITE.name} — {SITE.tagline}</title><meta
		name="description"
		content={SITE.description}
	/><link rel="canonical" href={SITE.url} /><meta property="og:title" content={SITE.name} /><meta
		property="og:description"
		content={SITE.description}
	/><meta
		property="og:image"
		content={`${SITE.url}/brand/social/og-default-1200x630.png`}
	/></svelte:head
>
<section class="hero" data-stitch="PUB-01">
	<div class="container hero-grid">
		<div>
			<p class="eyebrow">Um atlas editorial para a vida</p>
			<h1 class="display">Uma linguagem para olhar a vida com mais clareza.</h1>
			<p class="lead">
				Astrologia, Tarot e símbolos com método, contexto e responsabilidade — para reconhecer
				padrões e escolher seus próximos passos com mais clareza.
			</p>
			<div class="hero-actions">
				<a class="button" href="/bussola-de-carreira">Experimentar a Bússola de Carreira</a><a
					class="button secondary"
					href="#universos">Explorar os seis universos</a
				>
			</div>
		</div>
		<OrbitalPlate />
	</div>
</section>
<section class="trust" aria-label="Princípios da experiência">
	<div class="container trust-grid">
		<p>Cálculo quando há cálculo. Interpretação quando há interpretação.</p>
		<ul>
			<li>Sem fatalismo</li>
			<li>Privacidade por padrão</li>
			<li>Brasil · pt-BR</li>
		</ul>
	</div>
</section>
<section id="universos" class="section">
	<div class="container">
		<p class="eyebrow">Seis caminhos, uma só linguagem</p>
		<h2 class="h2">Comece pela pergunta que está viva agora.</h2>
		<div class="grid grid-3 universe-grid">
			{#each universes as universe (universe.slug)}<article class="card universe">
					<span class="universe-rule" aria-hidden="true"></span>
					<span>{universe.eyebrow}</span>
					<h3>{universe.title}</h3>
					<p>{universe.description}</p>
					<a href={`/${universe.slug}`}>{universe.cta} <span aria-hidden="true">→</span></a>
				</article>{/each}
		</div>
	</div>
</section>
<section class="tool-entry section">
	<div class="container entry-grid">
		<div>
			<p class="eyebrow">Um começo possível · gratuito</p>
			<h2 class="h2">Dê uma direção à sua pergunta.</h2>
			<p class="lead">
				O Meio do Céu oferece um ponto de partida para pensar sua contribuição, seu ofício e o lugar
				que você deseja ocupar.
			</p>
			<a class="button" href="/bussola-de-carreira">Calcular minha Bússola</a>
		</div>
		<ol>
			<li>
				<span>01</span>
				<div>
					<strong>Traga seus dados de nascimento</strong>
					<p>Data, hora, coordenadas e fuso histórico.</p>
				</div>
			</li>
			<li>
				<span>02</span>
				<div>
					<strong>Conheça seu Meio do Céu</strong>
					<p>Veja o signo, o grau e o método do cálculo.</p>
				</div>
			</li>
			<li>
				<span>03</span>
				<div>
					<strong>Escolha como continuar</strong>
					<p>Reflita sobre o resultado e salve se fizer sentido.</p>
				</div>
			</li>
		</ol>
	</div>
</section>
<section class="method section">
	<div class="container entry-grid">
		<div>
			<p class="eyebrow">Método antes de promessa</p>
			<h2 class="h2">Método antes de promessa.</h2>
			<p class="lead">
				Cada leitura registra o que foi calculado, o que foi interpretado e onde existe incerteza.
				Nenhum resultado substitui contexto, cuidado profissional ou decisão humana.
			</p>
			<a class="button secondary" href="/metodo">Conheça nosso método</a>
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

<section class="section editorial-entry">
	<div class="container entry-grid">
		<div>
			<p class="eyebrow">Leitura com contexto</p>
			<h2 class="h2">Há mais de um jeito de fazer uma boa pergunta.</h2>
			<p class="lead">
				Conheça a proposta editorial do Caderno e os fundamentos que orientam cada leitura do atlas.
			</p>
			<a href="/caderno">Conhecer o Caderno →</a>
		</div>
		<div class="editorial-links">
			<a href="/meio-do-ceu"
				><span>Direção e contribuição</span><strong
					>O que o Meio do Céu pode ajudar você a perguntar</strong
				></a
			><a href="/metodo"
				><span>Como lemos</span><strong>Entre o cálculo, a interpretação e a sua escolha</strong></a
			>
		</div>
	</div>
</section>

<style>
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
	ol {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	li {
		display: flex;
		gap: 1.5rem;
		padding-block: 1.5rem;
		border-bottom: 1px solid var(--atv-border);
	}
	ol li > span {
		color: var(--atv-text-accent);
		font: 500 1.75rem var(--atv-font-display);
	}
	ol p {
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
	.editorial-links {
		display: grid;
		gap: 1.5rem;
	}
	.editorial-links a {
		padding-block: 1.5rem;
		border-bottom: 1px solid var(--atv-border);
		text-decoration: none;
	}
	.editorial-links span {
		display: block;
		color: var(--atv-text-accent);
		font-size: 0.75rem;
		margin-bottom: 0.75rem;
	}
	.editorial-links strong {
		color: var(--atv-text-primary);
		font: 500 1.75rem/1.2 var(--atv-font-display);
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
	.trust {
		border-block: 1px solid var(--atv-border);
		background: var(--atv-surface-card);
	}
	.trust-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
		gap: 2rem;
		align-items: center;
		padding-block: 1.4rem;
	}
	.trust p {
		margin: 0;
		font: 500 1.2rem/1.2 var(--atv-font-editorial);
	}
	.trust ul {
		display: flex;
		justify-content: flex-end;
		gap: 1.1rem;
		padding: 0;
		margin: 0;
		list-style: none;
		font: 600 0.72rem var(--atv-font-ui);
		color: var(--atv-text-secondary);
	}
	.trust li::before {
		content: '✦';
		margin-right: 0.4rem;
		color: var(--atv-gold-500);
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
		.trust-grid {
			grid-template-columns: 1fr;
		}
		.trust ul {
			justify-content: flex-start;
			flex-wrap: wrap;
		}
	}
	@media (max-width: 520px) {
		.hero-actions {
			flex-direction: column;
		}
	}
</style>
