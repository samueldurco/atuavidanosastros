<script lang="ts">
	import { SITE, universes } from '$lib/data/site';
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
			<a class="button" href="#comece-gratuitamente">Começar gratuitamente</a><a
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
				<h2 id="free-heading">Comece gratuitamente.</h2>
			</div>
		</div>
		<div class="free-feature">
			<div class="free-art" aria-hidden="true">
				<img
					class="sun"
					src={visualV4.figures.proposito[0]}
					alt=""
					width="320"
					height="320"
					loading="lazy"
				/><img
					class="saturn"
					src={visualV4.figures.proposito[1]}
					alt=""
					width="320"
					height="320"
					loading="lazy"
				/>
			</div>
			<div class="free-copy">
				<h3>Bússola de Carreira</h3>
				<p>
					Descubra o signo e o grau do seu Meio do Céu, um dos pontos do mapa associados à vida
					profissional. Informe sua data, hora e cidade de nascimento.
				</p>
				<a class="button" href="/bussola-de-carreira">Calcular meu Meio do Céu grátis</a>
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
					<h4>Conheça seu Meio do Céu</h4>
					<p>Veja o signo, o grau, o método e os limites do cálculo.</p>
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
				<p class="eyebrow">Produtos digitais</p>
				<h2 id="readings-heading">Leituras e experiências.</h2>
			</div>
			<a href="/leituras">Ver todas as leituras →</a>
		</div>
		<p class="section-lead">
			Escolha um tema para conhecer os produtos digitais. Confira o conteúdo e a disponibilidade de
			cada leitura.
		</p>
		<div class="universe-track">
			{#each universes as universe (universe.slug)}<V4Card
					identity={universe.slug}
					title={universe.title}
					description={universe.description}
					eyebrow={universe.eyebrow}
					href={`/leituras?tema=${universe.slug}`}
					action={universe.cta}
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
			<a href="/caderno">Explorar a Revista ATVNA →</a>
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
<section class="paper-section shop" aria-labelledby="shop-heading">
	<div class="section-inner shop-inner">
		<div>
			<p class="eyebrow">Produtos físicos</p>
			<h2 id="shop-heading">Loja dos Signos.</h2>
			<p>Um espaço para levar os símbolos dos signos para o seu dia a dia.</p>
			<a class="button" href="/loja">Conhecer a Loja dos Signos</a>
		</div>
		<div class="shop-note">
			<span class="printed-star" aria-hidden="true">✶</span>
			<div>
				<h3>A coleção está em preparação.</h3>
				<p>
					As novidades em produtos físicos serão apresentadas aqui quando estiverem disponíveis.
				</p>
			</div>
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
