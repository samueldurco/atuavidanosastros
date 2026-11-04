<script lang="ts">
	import SignCards from '$lib/components/explore/SignCards.svelte';
	import '$lib/styles/explore.css';
</script>

<div class="explore-surface">
	<div class="explore-wrap">
		<nav class="explore-breadcrumb" aria-label="Caminho da página">
			<a href="/">Início</a><span aria-hidden="true">/</span><a href="/explorar">Explorar</a><span
				aria-hidden="true">/</span
			>Signos
		</nav>
		<header class="explore-directory-intro">
			<p class="explore-eyebrow">Doze signos · doze caminhos</p>
			<h1>Os 12 signos<br /><em>do zodíaco.</em></h1>
			<p class="explore-lead">
				Na astrologia tropical, o signo solar é o trecho do zodíaco onde o Sol estava quando você
				nasceu. Escolha um signo para conhecer seus símbolos e explorar conteúdos, previsões e
				ferramentas.
			</p>
			<p class="explore-date-note">
				As datas são aproximadas. O Sol muda de signo em um horário diferente a cada ano. Se você
				nasceu perto da mudança, use a data, a hora e o local de nascimento para <a
					href="/ferramentas/mapa-astral"
					data-atv-event="tool_select"
					data-atv-tool="mapa-astral"
					data-atv-universe="meu-ceu"
					data-atv-context="universe">consultar o seu mapa astral</a
				>.
			</p>
		</header>
		<SignCards />
		<section class="explore-explainer" aria-labelledby="solar-ascendant">
			<h2 id="solar-ascendant">Signo solar e ascendente são a mesma coisa?</h2>
			<p>
				O signo solar vem da posição do Sol. O ascendente é o signo que surgia no horizonte leste na
				hora e no lugar do nascimento. Para descobrir o seu, <a
					href="/ferramentas/ascendente"
					data-atv-event="tool_select"
					data-atv-tool="ascendente"
					data-atv-universe="meu-ceu"
					data-atv-context="universe">calcule o ascendente</a
				>. Para reunir essas posições em uma leitura,
				<a href="/temas/mapa-astral">explore o tema mapa astral</a>.
			</p>
		</section>
	</div>
</div>
