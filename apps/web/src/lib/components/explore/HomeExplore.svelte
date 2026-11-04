<script lang="ts">
	import ThemeCards from './ThemeCards.svelte';
	import SignCards from './SignCards.svelte';
	import '$lib/styles/explore.css';
</script>

<section id="explorar" class="explore-surface explore-home" aria-labelledby="home-explore-title">
	<div class="explore-wrap">
		<header class="explore-opening">
			<div>
				<p class="explore-eyebrow">Explorar · temas e signos</p>
				<h2 id="home-explore-title">Um assunto. Um signo.<br /><em>Por onde começar?</em></h2>
				<p class="explore-lead">
					Encontre um tema que conversa com o seu momento ou conheça o céu pelo seu signo.
				</p>
				<a class="explore-button" href="/explorar"
					>Conhecer todos os caminhos <span aria-hidden="true">↗</span></a
				>
			</div>
			<img
				class="explore-opening-art"
				src="/brand/explorar/home-explorar.webp"
				alt=""
				width="1200"
				height="800"
				loading="lazy"
			/>
		</header>
		<div class="explore-section-head">
			<div>
				<p class="explore-eyebrow">01 / Seu momento</p>
				<h3>Por temas</h3>
				<p>Comece pelo que está vivendo.</p>
			</div>
			<a href="/temas">Ver todos os temas <span aria-hidden="true">↗</span></a>
		</div>
		<ThemeCards />
		<div class="explore-section-head">
			<div>
				<p class="explore-eyebrow">02 / Seu signo</p>
				<h3>Doze signos. Doze caminhos.</h3>
				<p>Conteúdos, previsões e descobertas para cada signo.</p>
			</div>
			<a href="/signos">Conhecer os signos <span aria-hidden="true">↗</span></a>
		</div>
		<SignCards compact />
	</div>
</section>
