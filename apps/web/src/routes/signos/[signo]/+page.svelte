<script lang="ts">
	import EditorialArticle from '$lib/components/EditorialArticle.svelte';
	import SignCards from '$lib/components/explore/SignCards.svelte';
	import ThemeCards from '$lib/components/explore/ThemeCards.svelte';
	import '$lib/styles/explore.css';
	let { data } = $props();
</script>

{#if data.profile}
	<EditorialArticle document={data.profile.document} related={data.profile.related} />
{/if}

<div class="explore-surface">
	<div class="explore-wrap">
		{#if !data.profile}
			<nav class="explore-breadcrumb" aria-label="Caminho da página">
				<a href="/explorar">Explorar</a><span aria-hidden="true">/</span><a href="/signos">Signos</a
				><span aria-hidden="true">/</span>{data.sign.name}
			</nav>
			<header class="explore-opening">
				<div>
					<p class="explore-eyebrow">{data.sign.glyph} · Signos do zodíaco</p>
					<h1>Signo de <em>{data.sign.name}.</em></h1>
					<p class="explore-lead">
						Na astrologia tropical, as datas aproximadas de {data.sign.name} são
						<strong>{data.sign.approximateDates}</strong>. Seu elemento é
						<strong>{data.sign.element}</strong>.
					</p>
					<p class="explore-date-note">
						O Sol muda de signo em um horário diferente a cada ano. Se você nasceu perto da
						transição, <a href="/ferramentas/mapa-astral">consulte seu mapa astral</a> com data, hora
						e local de nascimento para confirmar o signo solar.
					</p>
					<a class="explore-button" href={`/horoscopo/${data.sign.slug}`}
						>Ver horóscopo de {data.sign.name} <span aria-hidden="true">↗</span></a
					>
				</div>
				<img
					class="explore-opening-art"
					src={`/brand/explorar/${data.sign.slug}.webp`}
					alt={`Ilustração de ${data.sign.name}`}
					width="1200"
					height="800"
					fetchpriority="high"
				/>
			</header>
		{/if}
		<section aria-labelledby="sign-experiences">
			<div class="explore-section-head">
				<div>
					<p class="explore-eyebrow">Para começar</p>
					<h2 id="sign-experiences">Horóscopo e calculadoras.</h2>
					<p>Consulte as previsões de {data.sign.name} ou calcule seu mapa de nascimento.</p>
				</div>
			</div>
			<nav class="explore-sign-navigation" aria-label={`Experiências de ${data.sign.name}`}>
				<a href={`/horoscopo/${data.sign.slug}`}
					><strong>Previsões de {data.sign.name} ↗</strong><span
						>Consulte as edições disponíveis do horóscopo.</span
					></a
				>
				<a href="/ferramentas/mapa-astral"
					><strong>Seu mapa astral grátis ↗</strong><span
						>Descubra seu signo solar e as posições do seu mapa.</span
					></a
				>
				<a href="/ferramentas/ascendente"
					><strong>Descubra seu Ascendente ↗</strong><span
						>Use data, hora e local de nascimento para calcular.</span
					></a
				>
			</nav>
		</section>
		{#if data.articles.length}
			<section aria-labelledby="sign-reading">
				<div class="explore-section-head">
					<div>
						<p class="explore-eyebrow">Para entender melhor</p>
						<h2 id="sign-reading">Entenda o signo solar, o ascendente e o mapa astral.</h2>
					</div>
					<a href="/revista">Ir para a revista ↗</a>
				</div>
				<nav class="explore-sign-navigation" aria-label="Guias para conhecer seu mapa">
					{#each data.articles as article (article.path)}<a href={article.path}
							><span class="explore-eyebrow">Guia</span><strong>{article.title} ↗</strong></a
						>{/each}
				</nav>
			</section>
		{/if}
		<section aria-labelledby="sign-themes">
			<div class="explore-section-head">
				<div>
					<p class="explore-eyebrow">Continue a descoberta</p>
					<h2 id="sign-themes">O que você quer explorar?</h2>
					<p>Vá além do signo solar com ferramentas, leituras e artigos.</p>
				</div>
			</div>
			<ThemeCards />
		</section>
		<section aria-labelledby="other-signs">
			<div class="explore-section-head">
				<div><h2 id="other-signs">Explore os outros signos</h2></div>
				<a href="/signos">Ver todos os signos ↗</a>
			</div>
			<SignCards compact />
		</section>
	</div>
</div>
