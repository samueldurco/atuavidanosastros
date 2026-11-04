<script lang="ts">
	import { SITE } from '$lib/data/site';
	import MvpProductCard from '$lib/components/MvpProductCard.svelte';
	let { data } = $props();
</script>

<svelte:head>
	<title>Lançamentos digitais — {SITE.name}</title>
	<meta
		name="description"
		content="Conheça as novas leituras digitais da ATVNA: casamento, recomeço amoroso, Tarot, intimidade, talento e conversas. Explore o conteúdo e abra o teste gratuito na sua conta."
	/>
	<link rel="canonical" href={`${SITE.url}/lancamentos`} />
</svelte:head>

<div class="mvp-public launch-catalog">
	<section class="launch-intro wrap" aria-labelledby="launch-title">
		<nav class="breadcrumb" aria-label="Caminho da página">
			<a href="/">Início</a><span aria-hidden="true">/</span>
			<a href="/leituras">Produtos digitais</a><span aria-hidden="true">/</span>
			<span>Lançamentos</span>
		</nav>
		<div class="intro-copy">
			<p class="eyebrow">Novas leituras digitais · Testes gratuitos</p>
			<h1 id="launch-title">Uma situação sua.<br />Uma leitura para ela.</h1>
			<p class="lead">
				Datas para o casamento, um recomeço ou uma conversa que pede cuidado. Conheça as novas
				leituras, os dados necessários e o que você recebe em cada uma. Entre na sua conta para
				conferir seu acesso aos testes gratuitos.
			</p>
			<a class="text-link" href="#estreia"
				>Conhecer as três primeiras <span aria-hidden="true">↓</span></a
			>
		</div>
		<img
			class="intro-engraving"
			src="/brand/mvp/assets/revisao/micro-ramo.webp"
			alt=""
			width="240"
			height="240"
		/>
	</section>
	<section class="wrap launch-section" id="estreia" aria-labelledby="debut-title">
		<div class="section-heading">
			<div>
				<p class="eyebrow">As três primeiras</p>
				<h2 id="debut-title">Começamos por aqui.</h2>
			</div>
			<p>Uma comparação de datas, uma leitura de um episódio passado e uma previsão de 30 dias.</p>
		</div>
		<div class="launch-grid">
			{#each data.debut as product (product.id)}
				<MvpProductCard
					product={{ ...product, href: `/produtos/${product.slug}`, cta: 'Conhecer a proposta' }}
					trialAccess
					trialHref={`/testar-lancamentos/${product.id}`}
				/>
			{/each}
		</div>
	</section>
	<section class="wrap launch-section following" aria-labelledby="next-title">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Na sequência</p>
				<h2 id="next-title">Outros temas da vida real.</h2>
			</div>
			<p>Leituras individuais para testar gratuitamente na sua conta e guardar o resultado.</p>
		</div>
		<div class="launch-grid">
			{#each data.next as product (product.id)}
				<MvpProductCard
					product={{ ...product, href: `/produtos/${product.slug}`, cta: 'Conhecer a proposta' }}
					trialAccess
					trialHref={`/testar-lancamentos/${product.id}`}
				/>
			{/each}
		</div>
	</section>
	<section class="wrap continuity" aria-labelledby="continuity-title">
		<div>
			<p class="eyebrow">Continue explorando</p>
			<h2 id="continuity-title">Qual é o seu tema de agora?</h2>
		</div>
		<p>Conheça também o catálogo de leituras e as ferramentas gratuitas da ATVNA.</p>
		<div class="continuity-links">
			<a href="/leituras" class="text-link"
				>Ver todas as leituras <span aria-hidden="true">↗</span></a
			><a href="/ferramentas" class="text-link"
				>Explorar ferramentas gratuitas <span aria-hidden="true">↗</span></a
			>
		</div>
	</section>
</div>

<style>
	.launch-catalog {
		color: #183746;
		background: #f6efdf url('/brand/mvp/assets/papel-fino.webp');
		padding-bottom: 80px;
	}
	.launch-catalog .wrap {
		width: min(1160px, calc(100% - 88px));
		margin-inline: auto;
	}
	.launch-intro {
		position: relative;
		padding-top: 28px;
		padding-bottom: 54px;
	}
	.breadcrumb {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		font:
			400 11px/1.7 'Onest',
			sans-serif;
	}
	.breadcrumb a {
		color: inherit;
		text-decoration: none;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
	.intro-copy {
		max-width: 780px;
		padding-top: 44px;
		position: relative;
		z-index: 1;
	}
	.launch-catalog .eyebrow {
		font:
			600 10px/1.6 'Onest',
			sans-serif;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		margin: 0;
	}
	.intro-copy h1 {
		font:
			400 clamp(46px, 5.3vw, 76px)/1.02 'Newsreader',
			Georgia,
			serif;
		letter-spacing: -0.035em;
		margin: 19px 0 24px;
	}
	.lead {
		max-width: 660px;
		font:
			400 16px/1.8 'Onest',
			sans-serif;
	}
	.intro-engraving {
		position: absolute;
		width: 190px;
		height: 190px;
		object-fit: contain;
		right: 0;
		bottom: 26px;
		pointer-events: none;
	}
	.launch-catalog .text-link {
		min-height: 44px;
		display: inline-flex;
		gap: 24px;
		align-items: center;
		padding-block: 10px;
		border-bottom: 1px solid currentColor;
		color: #183746;
		text-decoration: none;
		font:
			500 13px/1.6 'Onest',
			sans-serif;
	}
	.launch-section {
		scroll-margin-top: 100px;
		padding-top: 36px;
	}
	.section-heading {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 32px;
		margin-bottom: 28px;
	}
	.section-heading h2,
	.continuity h2 {
		font:
			500 clamp(34px, 3vw, 44px)/1.12 'Newsreader',
			Georgia,
			serif;
		letter-spacing: -0.02em;
		margin: 12px 0 0;
	}
	.section-heading > p {
		max-width: 340px;
		font:
			400 13px/1.8 'Onest',
			sans-serif;
		margin: 0;
	}
	.launch-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 24px;
	}
	.following {
		padding-top: 70px;
	}
	.continuity {
		margin-top: 72px;
		border-top: 1px solid #c7bfac;
		padding-top: 38px;
	}
	.continuity > p {
		font:
			400 14px/1.8 'Onest',
			sans-serif;
	}
	.continuity-links {
		display: flex;
		flex-wrap: wrap;
		gap: 12px 32px;
	}
	@media (max-width: 1050px) {
		.launch-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.intro-engraving {
			width: 120px;
			height: 120px;
			bottom: 30px;
			opacity: 0.8;
		}
		.intro-copy {
			max-width: 700px;
		}
	}
	@media (max-width: 700px) {
		.launch-catalog .wrap {
			width: calc(100% - 36px);
		}
		.launch-intro {
			padding-top: 16px;
			padding-bottom: 28px;
		}
		.intro-copy {
			padding-top: 28px;
		}
		.intro-copy h1 {
			font-size: clamp(42px, 11vw, 58px);
		}
		.lead {
			font-size: 15px;
		}
		.intro-engraving {
			position: static;
			display: block;
			margin: 22px 0 0 auto;
			width: 95px;
			height: 74px;
			object-fit: cover;
			object-position: center;
		}
		.launch-grid {
			grid-template-columns: 1fr;
			gap: 22px;
		}
		.section-heading {
			display: block;
		}
		.section-heading > p {
			max-width: none;
			margin-top: 16px;
		}
		.launch-section {
			padding-top: 18px;
		}
		.following {
			padding-top: 46px;
		}
		.continuity {
			margin-top: 48px;
		}
	}
</style>
