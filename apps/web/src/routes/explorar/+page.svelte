<script lang="ts">
	import ThemeCards from '$lib/components/explore/ThemeCards.svelte';
	import SignCards from '$lib/components/explore/SignCards.svelte';
	import '$lib/styles/explore.css';
</script>

<div class="explore-surface">
	<div class="explore-wrap">
		<nav class="explore-breadcrumb" aria-label="Caminho da página">
			<a href="/">Início</a><span aria-hidden="true">/</span>Explorar
		</nav>
		<header class="explore-opening">
			<div>
				<p class="explore-eyebrow">A tua vida nos astros</p>
				<h1>Encontre seu<br /><em>próximo caminho.</em></h1>
				<p class="explore-lead">
					Um assunto que desperta curiosidade. Um signo que você quer conhecer. Escolha por onde
					começar.
				</p>
				<div class="explore-shortcuts">
					<a href="#temas">Explorar por temas ↓</a><a href="#signos">Explorar por signos ↓</a>
				</div>
			</div>
			<img
				class="explore-opening-art"
				src="/brand/explorar/explorar-atlas.webp"
				alt=""
				width="1200"
				height="800"
				fetchpriority="high"
			/>
		</header>
		<section id="temas" aria-labelledby="explore-topics">
			<div class="explore-section-head">
				<div>
					<p class="explore-eyebrow">01 / Seu momento</p>
					<h2 id="explore-topics">Por temas</h2>
					<p>Ferramentas, leituras e artigos para cada interesse.</p>
				</div>
				<a href="/temas">Ver todos os temas ↗</a>
			</div>
			<ThemeCards />
		</section>
		<section id="signos" aria-labelledby="explore-zodiac">
			<div class="explore-section-head">
				<div>
					<p class="explore-eyebrow">02 / Seu signo</p>
					<h2 id="explore-zodiac">Os 12 signos do zodíaco</h2>
					<p>Uma página para explorar cada signo.</p>
				</div>
				<a href="/signos">Sobre as datas e os signos ↗</a>
			</div>
			<SignCards />
		</section>
	</div>
</div>
