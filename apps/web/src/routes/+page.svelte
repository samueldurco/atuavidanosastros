<script lang="ts">
	import { SITE, universes } from '$lib/data/site';
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
<section class="hero">
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
		<div class="atlas" aria-hidden="true">
			<img src="/brand/logo/symbol/atv-symbol.svg" alt="" width="256" height="256" />
			<div class="orbit one"></div>
			<div class="orbit two"></div>
			<span class="coordinate">23°33′ S · 46°38′ W</span>
		</div>
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
<section class="method">
	<div class="reading">
		<p class="eyebrow">Método antes de promessa</p>
		<h2 class="h2">Método antes de promessa.</h2>
		<p class="lead">
			Cada leitura registra o que foi calculado, o que foi interpretado e onde existe incerteza.
			Nenhum resultado substitui contexto, cuidado profissional ou decisão humana.
		</p>
		<a class="button secondary" href="/metodo">Conheça nosso método</a>
	</div>
</section>

<style>
	.hero {
		min-height: calc(100vh - 5.25rem);
		display: grid;
		align-items: center;
		padding: 5rem 0 7rem;
		background: linear-gradient(180deg, var(--atv-ivory-25), var(--atv-frost-50));
	}
	.hero-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(20rem, 0.85fr);
		align-items: center;
		gap: 5rem;
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
	.atlas {
		aspect-ratio: 5 / 4;
		position: relative;
		display: grid;
		place-items: center;
		background:
			radial-gradient(circle at 50% 50%, rgb(218 185 123 / 13%), transparent 25%),
			var(--atv-surface-card);
		border: 1px solid var(--atv-border);
		border-radius: var(--atv-radius-lg);
		box-shadow: 0 20px 60px rgb(3 23 68 / 8%);
	}
	.atlas img {
		width: 42%;
		z-index: 2;
	}
	.orbit {
		position: absolute;
		border: 1px solid var(--atv-gold-500);
		border-radius: 50%;
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
	.orbit.one {
		inset: 12%;
		opacity: 0.45;
	}
	.orbit.two {
		inset: 26%;
		border-style: dashed;
	}
	.coordinate {
		position: absolute;
		bottom: 10%;
		font-size: 0.68rem;
		letter-spacing: 0.12em;
		color: var(--atv-text-secondary);
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
		color: var(--atv-gold-700);
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
		padding: 7rem 0;
		background: var(--atv-night-950);
		color: var(--atv-frost-50);
	}
	.method .lead {
		color: var(--atv-lunar-mist-300);
	}
	.method .secondary {
		border-color: var(--atv-gold-200);
		color: var(--atv-gold-200);
	}
	@media (max-width: 900px) {
		.hero {
			min-height: auto;
		}
		.hero-grid {
			grid-template-columns: 1fr;
			gap: 3rem;
		}
		.atlas {
			width: min(28rem, 90vw);
			margin: auto;
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
