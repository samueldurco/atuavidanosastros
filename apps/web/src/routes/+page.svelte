<script lang="ts">
	import { SITE } from '$lib/data/site';
	import { interestNavigation } from '$lib/data/public-navigation';
	import { visualV4 } from '$lib/data/visual-v4';
	import V4Card from '$lib/components/V4Card.svelte';
	let { data } = $props();
	const editorialThemes = ['meu-ceu', 'proposito', 'amor'];
</script>

<svelte:head>
	<title>{SITE.name} — {SITE.tagline}</title>
	<meta name="description" content={SITE.description} /><link rel="canonical" href={SITE.url} />
</svelte:head>
<section class="hero" data-stitch="PUB-01">
	<div class="hero-copy">
		<p class="eyebrow">Astrologia e autoconhecimento</p>
		<h1>Conheça seu mapa.<br />Explore seu momento.</h1>
		<p class="hero-lead">
			Explore mapa astral, previsões, amor, carreira, Tarot e sonhos. Comece com uma ferramenta
			gratuita ou encontre um assunto para conhecer melhor.
		</p>
		<div class="hero-actions">
			<a class="button" href="/ferramentas/ascendente">Descobrir meu Ascendente grátis</a><a
				class="text-link"
				href="/leituras">Conhecer as leituras →</a
			>
		</div>
	</div>
</section>
<section id="comece-gratuitamente" class="paper-section free" aria-labelledby="free-heading">
	<div class="section-inner">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Sem custo · sem cadastro para calcular</p>
				<h2 id="free-heading">Descubra seu Ascendente.</h2>
			</div>
		</div>
		<div class="free-feature">
			<div class="free-art" aria-hidden="true">
				<img
					class="sun"
					src={visualV4.figures['meu-ceu'][0]}
					alt=""
					width="320"
					height="320"
					loading="lazy"
				/><img
					class="saturn"
					src={visualV4.mandala}
					alt=""
					width="320"
					height="320"
					loading="lazy"
				/>
			</div>
			<div class="free-copy">
				<h3>Calculadora de Ascendente</h3>
				<p>
					Informe sua data, hora e cidade de nascimento. Veja o signo e o grau do seu Ascendente,
					com uma leitura curta, antes de criar sua conta.
				</p>
				<a class="button" href="/ferramentas/ascendente">Calcular meu Ascendente grátis</a>
				<p><a href="/ferramentas">Explorar todas as ferramentas gratuitas →</a></p>
			</div>
		</div>
		<ol class="free-steps">
			<li>
				<span class="step-number">01</span>
				<div>
					<h4>Informe seus dados de nascimento</h4>
					<p>Data, hora e cidade. Confira a localização antes de calcular.</p>
				</div>
			</li>
			<li>
				<span class="step-number">02</span>
				<div>
					<h4>Conheça seu Ascendente</h4>
					<p>Veja o resultado, a leitura curta e os limites do cálculo.</p>
				</div>
			</li>
			<li>
				<span class="step-number">03</span>
				<div>
					<h4>Guarde se quiser</h4>
					<p>Com sua conta, você pode salvar o resultado na Biblioteca.</p>
				</div>
			</li>
		</ol>
	</div>
</section>
<section id="universos" class="paper-section readings" aria-labelledby="readings-heading">
	<div class="section-inner">
		<div class="section-heading has-link">
			<div>
				<p class="eyebrow">Seis temas para explorar</p>
				<h2 id="readings-heading">O que você quer conhecer?</h2>
			</div>
			<a href="/leituras">Ver todas as leituras →</a>
		</div>
		<p class="section-lead">
			Encontre ferramentas gratuitas, leituras e artigos relacionados ao assunto que interessa a
			você.
		</p>
		<div class="universe-track">
			{#each interestNavigation as universe (universe.id)}<V4Card
					identity={universe.id}
					title={universe.label}
					description={universe.description}
					href={universe.href}
					action="Explorar o tema"
				/>{/each}
		</div>
	</div>
</section>
<section class="paper-section magazine" aria-labelledby="magazine-heading">
	<div class="section-inner">
		<div class="section-heading has-link">
			<div>
				<p class="eyebrow">Artigos e guias</p>
				<h2 id="magazine-heading">Revista ATVNA.</h2>
			</div>
			<a href="/revista">Explorar a Revista ATVNA →</a>
		</div>
		<p class="section-lead">
			Entenda seu mapa astral, acompanhe os temas dos ciclos e explore relacionamentos, carreira,
			Tarot e sonhos.
		</p>
		<div class="magazine-grid">
			{#each data.articles as article, index (article.id)}<V4Card
					identity={editorialThemes[index]}
					title={article.title}
					description={article.description}
					href={article.path}
					action="Ler o guia"
					eyebrow="Guia"
					editorial
					compact={index > 0}
					variant={index}
				/>{/each}
		</div>
	</div>
</section>
<section class="paper-section method">
	<div class="section-inner method-inner">
		<div>
			<p class="eyebrow">Nosso método</p>
			<h2>Entenda suas leituras.</h2>
			<p>
				As leituras usam os dados que você informa. Você pode consultar os fatores do mapa e
				entender como cada resultado foi produzido.
			</p>
			<a class="button" href="/metodo">Entender as leituras</a>
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
