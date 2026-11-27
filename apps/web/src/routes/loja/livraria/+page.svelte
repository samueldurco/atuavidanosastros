<script lang="ts">
	import BookSeal from '$lib/components/bookshop/BookSeal.svelte';
	const themes = [
		{
			number: '01',
			title: 'Astrologia',
			note: 'O mapa, os ciclos e as relações.',
			color: '#476278',
			symbol: '☉'
		},
		{
			number: '02',
			title: 'Tarot',
			note: 'Símbolos, perguntas e prática de leitura.',
			color: '#A95745',
			symbol: '✦'
		},
		{
			number: '03',
			title: 'Sonhos',
			note: 'Imagens e experiências da vida onírica.',
			color: '#776783',
			symbol: '☾'
		}
	];
</script>

<svelte:head>
	<title>Livraria ATVNA e Céu de Papel — Em preparação</title>
	<meta
		name="description"
		content="Conheça a proposta da Livraria ATVNA e do Céu de Papel, nosso clube de leitura. Livros sobre astrologia, Tarot e sonhos, em preparação."
	/>
	<meta name="robots" content="noindex, follow" />
	<link rel="canonical" href="https://atuavidanosastros.com.br/loja/livraria" />
</svelte:head>

<div class="bookshop-public">
	<section class="bookshop-hero" aria-labelledby="bookshop-heading">
		<div class="bookshop-wrap">
			<nav class="bookshop-breadcrumb" aria-label="Caminho da Livraria">
				<a href="/">Início</a><span aria-hidden="true">/</span><a href="/loja">Loja</a><span
					aria-hidden="true">/</span
				><span>Livraria</span>
			</nav>
			<div class="hero-layout">
				<div class="hero-copy">
					<p class="bookshop-kicker">Livraria ATVNA <span>Em preparação</span></p>
					<h1 id="bookshop-heading">Livros para conhecer<br />o céu. <em>E a si.</em></h1>
					<p class="hero-intro">
						Uma editora independente dedicada à astrologia, ao Tarot e aos sonhos. Estamos
						preparando livros para estudar, consultar e reler no seu tempo.
					</p>
					<a class="bookshop-button" href="#nossa-estante"
						>Conhecer a proposta <span aria-hidden="true">↓</span></a
					>
				</div>
				<div class="hero-art" aria-hidden="true">
					<span class="art-orbit"></span>
					<img
						src="/brand/mvp/assets/catalogo/livro-celeste-v1.webp"
						alt=""
						width="960"
						height="640"
						fetchpriority="high"
					/>
					<p>Astrologia · Tarot · Sonhos</p>
				</div>
			</div>
			<div class="hero-colophon">
				<span>Uma nova estante no ATVNA</span><span>Leitura, estudo e descoberta</span>
			</div>
		</div>
	</section>

	<section class="bookshop-shelf bookshop-wrap" id="nossa-estante" aria-labelledby="shelf-heading">
		<header class="section-heading">
			<div>
				<p class="bookshop-kicker">Os temas do acervo</p>
				<h2 id="shelf-heading">Uma estante para<br /><em>aprofundar a leitura.</em></h2>
			</div>
			<p>
				O catálogo está em desenvolvimento. Estes são alguns dos assuntos que vão fazer parte dos
				nossos livros.
			</p>
		</header>
		<div class="theme-grid">
			{#each themes as theme (theme.title)}
				<article class="theme-card" style={`--theme: ${theme.color}`}>
					<div class="theme-art" aria-hidden="true">
						<span class="theme-number">{theme.number}</span><span class="theme-symbol"
							>{theme.symbol}</span
						><span class="theme-lines"></span>
					</div>
					<div class="theme-caption">
						<h3>{theme.title}</h3>
						<p>{theme.note}</p>
					</div>
				</article>
			{/each}
		</div>
		<p class="shelf-note">
			Títulos, capas e detalhes das edições serão apresentados no lançamento editorial.
		</p>
	</section>

	<section class="paper-sky" aria-labelledby="paper-sky-heading">
		<div class="bookshop-wrap club-layout">
			<div class="club-mark"><BookSeal /><span>Clube de leitura<br />da Livraria ATVNA</span></div>
			<div class="club-copy">
				<p class="bookshop-kicker">Também em preparação</p>
				<h2 id="paper-sky-heading">Céu de <em>Papel</em></h2>
				<p class="club-intro">Um livro por mês.<br />Tempo para ler, espaço para descobrir.</p>
				<p>
					Estamos preparando um clube de livros físicos com edições exclusivas. A curadoria alterna
					Astrologia e Tarot, com propostas de leitura para acompanhar cada edição.
				</p>
				<div class="club-details">
					<p><strong>Dois ciclos</strong><span>Trimestral e anual</span></p>
					<p><strong>A mesma edição mensal</strong><span>Nos dois planos</span></p>
				</div>
				<p class="club-status">As assinaturas serão abertas no lançamento editorial.</p>
			</div>
		</div>
	</section>

	<section class="bookshop-closing bookshop-wrap" aria-labelledby="closing-heading">
		<div>
			<p class="bookshop-kicker">Enquanto os livros ficam prontos</p>
			<h2 id="closing-heading">A leitura já começou<br /><em>na Revista ATVNA.</em></h2>
			<p>Explore artigos sobre mapa astral, ciclos, Tarot e sonhos.</p>
		</div>
		<div class="closing-links">
			<a class="bookshop-button" href="/revista"
				>Ler a Revista ATVNA <span aria-hidden="true">↗</span></a
			><a class="sibling-link" href="/loja"
				>Conhecer a Loja dos Signos <span aria-hidden="true">→</span></a
			>
		</div>
	</section>
</div>

<style>
	.bookshop-public {
		--wine: #3c1020;
		--linen: #f5e9d7;
		--ivory: #fff8ed;
		--ink: #2b2023;
		background: var(--linen);
		color: var(--ink);
		font-family: var(--atv-font-body, 'Onest', sans-serif);
	}
	.bookshop-wrap {
		width: min(1160px, calc(100% - 64px));
		margin-inline: auto;
	}
	.bookshop-public h1,
	.bookshop-public h2,
	.bookshop-public h3,
	.club-intro {
		font-family: var(--atv-font-display, 'Newsreader', Georgia, serif);
		font-weight: 400;
	}
	.bookshop-public h1,
	.bookshop-public h2,
	.bookshop-public h3,
	.bookshop-public p {
		margin-top: 0;
	}
	.bookshop-public a:focus-visible {
		outline: 3px solid #b56d72;
		outline-offset: 5px;
	}
	.bookshop-hero {
		background: var(--wine);
		color: var(--ivory);
		overflow: hidden;
	}
	.bookshop-breadcrumb {
		display: flex;
		gap: 12px;
		padding-block: 25px;
		font-size: 11px;
		align-items: center;
	}
	.bookshop-breadcrumb a {
		color: inherit;
		text-underline-offset: 3px;
		min-height: 24px;
		display: inline-flex;
		align-items: center;
	}
	.hero-layout {
		display: grid;
		grid-template-columns: 1.15fr 1fr;
		align-items: center;
		gap: 42px;
		padding-block: 52px 66px;
	}
	.bookshop-kicker {
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		line-height: 1.8;
		font-weight: 500;
	}
	.hero-copy .bookshop-kicker {
		display: flex;
		flex-wrap: wrap;
		gap: 12px 20px;
		align-items: center;
	}
	.hero-copy .bookshop-kicker span {
		font-size: 9px;
		border: 1px solid #b56d7299;
		border-radius: 2px;
		padding: 3px 9px;
		letter-spacing: 0.12em;
	}
	h1 {
		font-size: clamp(43px, 5vw, 68px);
		line-height: 1.03;
		letter-spacing: -0.035em;
		margin-bottom: 24px;
	}
	h1 em {
		color: #edbdad;
	}
	.hero-intro {
		max-width: 440px;
		font-size: 14px;
		line-height: 1.85;
		margin-bottom: 28px;
	}
	.bookshop-button {
		display: inline-flex;
		justify-content: space-between;
		align-items: center;
		gap: 35px;
		min-height: 48px;
		padding: 12px 20px;
		background: var(--ivory);
		border: 1px solid var(--ivory);
		color: var(--wine);
		font-size: 12px;
		font-weight: 600;
		text-decoration: none;
	}
	.bookshop-button:hover {
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	.hero-art {
		position: relative;
		text-align: center;
		isolation: isolate;
		padding-block: 30px;
	}
	.hero-art img {
		position: relative;
		width: 100%;
		height: auto;
		display: block;
		filter: drop-shadow(0 16px 16px #16061144);
	}
	.art-orbit {
		position: absolute;
		inset: 0 12%;
		border: 1px solid #b78d5270;
		border-radius: 50%;
		z-index: -1;
	}
	.art-orbit:after {
		content: '';
		position: absolute;
		inset: 12px;
		border: 1px solid #b78d5233;
		border-radius: 50%;
	}
	.hero-art p {
		position: relative;
		margin: 24px 0 0;
		font: italic 18px/1.4 var(--atv-font-display);
		color: #edc8ad;
	}
	.hero-colophon {
		display: flex;
		justify-content: space-between;
		gap: 20px;
		padding-block: 17px;
		border-top: 1px solid #b78d5255;
		font-size: 9px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #e4cbb7;
	}
	.bookshop-shelf {
		padding-block: 76px 64px;
		scroll-margin-top: 24px;
	}
	.section-heading {
		display: grid;
		grid-template-columns: 1.1fr 1fr;
		gap: 50px;
		align-items: end;
		margin-bottom: 38px;
	}
	.section-heading h2,
	.bookshop-closing h2 {
		font-size: clamp(34px, 4vw, 48px);
		line-height: 1.05;
		letter-spacing: -0.02em;
		margin-bottom: 0;
	}
	.section-heading .bookshop-kicker {
		color: var(--wine);
	}
	.section-heading > p {
		max-width: 360px;
		font-size: 13px;
		line-height: 1.85;
		margin-bottom: 3px;
		justify-self: end;
	}
	.theme-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 28px;
	}
	.theme-card {
		background: var(--ivory);
		border: 1px solid #d5c3ad;
		padding: 15px 15px 20px;
	}
	.theme-art {
		position: relative;
		isolation: isolate;
		min-height: 210px;
		display: grid;
		place-items: center;
		background: var(--theme);
		color: var(--ivory);
		overflow: hidden;
		border: 1px solid #fff8ed22;
	}
	.theme-art:before,
	.theme-art:after {
		content: '';
		position: absolute;
		border: 1px solid #fff8ed55;
		inset: 17px;
	}
	.theme-art:after {
		inset: 24px;
		border-color: #fff8ed33;
	}
	.theme-number {
		position: absolute;
		top: 35px;
		left: 36px;
		font: italic 14px var(--atv-font-display);
		color: var(--ivory);
	}
	.theme-symbol {
		font:
			400 95px/1 Georgia,
			serif;
		z-index: 1;
		margin-bottom: 12px;
	}
	.theme-lines {
		position: absolute;
		width: 130px;
		height: 130px;
		border: 1px solid #fff8ed60;
		border-radius: 50%;
	}
	.theme-lines:before,
	.theme-lines:after {
		content: '';
		position: absolute;
		border: 1px solid #fff8ed44;
		border-radius: 50%;
		inset: -10px;
	}
	.theme-lines:after {
		inset: -20px;
		border-style: dotted;
	}
	.theme-caption {
		padding: 22px 10px 0;
	}
	.theme-caption h3 {
		font-size: 30px;
		margin-bottom: 8px;
		line-height: 1.1;
	}
	.theme-caption p {
		font-size: 11px;
		line-height: 1.7;
		margin: 0;
		max-width: 220px;
	}
	.shelf-note {
		font-size: 10px;
		line-height: 1.7;
		margin: 23px 0 0;
		color: #634f54;
	}
	.paper-sky {
		background: #240c17;
		color: var(--ivory);
		border-block: 1px solid #b78d52;
	}
	.club-layout {
		display: grid;
		grid-template-columns: 1fr 1.2fr;
		gap: 80px;
		align-items: center;
		padding-block: 70px;
	}
	.club-mark {
		justify-self: center;
		text-align: center;
		color: #d7b77f;
	}
	.club-mark :global(svg) {
		display: block;
		width: 220px;
		max-width: 100%;
		height: auto;
		margin: 0 auto 26px;
	}
	.club-mark > span {
		display: block;
		font-size: 10px;
		line-height: 1.8;
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}
	.club-copy .bookshop-kicker {
		color: #d7b77f;
	}
	.club-copy h2 {
		font-size: clamp(52px, 6vw, 76px);
		letter-spacing: -0.035em;
		line-height: 1;
		margin-bottom: 26px;
	}
	.club-copy h2 em {
		color: #eab0b3;
	}
	.club-intro {
		font-size: 25px;
		line-height: 1.25;
		margin-bottom: 20px;
	}
	.club-copy > p:not(.bookshop-kicker, .club-intro) {
		font-size: 12px;
		line-height: 1.85;
		max-width: 410px;
	}
	.club-details {
		display: grid;
		grid-template-columns: 1fr 1fr;
		border-block: 1px solid #b78d524f;
		padding-block: 18px;
		gap: 25px;
		margin-block: 26px;
	}
	.club-details p {
		margin: 0;
	}
	.club-details strong,
	.club-details span {
		display: block;
		font-size: 11px;
		line-height: 1.8;
	}
	.club-details strong {
		font-weight: 500;
		color: #e8c69e;
	}
	.club-details span {
		margin-top: 3px;
	}
	.club-copy .club-status {
		color: #e8c69e;
		margin-bottom: 0;
	}
	.bookshop-closing {
		padding-block: 66px 72px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 38px;
	}
	.bookshop-closing p:last-child {
		font-size: 12px;
		line-height: 1.8;
		margin: 20px 0 0;
	}
	.closing-links {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 12px;
	}
	.closing-links .bookshop-button {
		color: var(--ivory);
		background: var(--wine);
		border-color: var(--wine);
	}
	.sibling-link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 18px;
		color: var(--wine);
		font-size: 11px;
		min-height: 44px;
		text-underline-offset: 4px;
		padding-inline: 4px;
	}
	@media (max-width: 760px) {
		.bookshop-wrap {
			width: calc(100% - 40px);
		}
		.hero-layout {
			grid-template-columns: 1fr;
			gap: 24px;
			padding-block: 28px 32px;
		}
		.hero-copy {
			max-width: 560px;
		}
		.hero-art {
			max-width: 420px;
			justify-self: center;
			padding-block: 18px;
		}
		.hero-art p {
			margin-top: 15px;
			font-size: 16px;
		}
		.hero-colophon {
			font-size: 8px;
			letter-spacing: 0.06em;
			line-height: 1.6;
		}
		.bookshop-shelf {
			padding-block: 46px;
		}
		.section-heading {
			grid-template-columns: 1fr;
			gap: 22px;
			margin-bottom: 25px;
		}
		.section-heading > p {
			justify-self: start;
			max-width: 450px;
			margin: 0;
		}
		.theme-grid {
			gap: 12px;
		}
		.theme-card {
			padding: 7px 7px 14px;
		}
		.theme-art {
			min-height: 170px;
		}
		.theme-art:before {
			inset: 9px;
		}
		.theme-art:after {
			inset: 14px;
		}
		.theme-number {
			top: 20px;
			left: 20px;
			font-size: 12px;
		}
		.theme-symbol {
			font-size: 65px;
		}
		.theme-lines {
			width: 80px;
			height: 80px;
		}
		.theme-caption {
			padding: 16px 5px 0;
		}
		.theme-caption h3 {
			font-size: 24px;
		}
		.theme-caption p {
			font-size: 10px;
		}
		.club-layout {
			grid-template-columns: 1fr;
			gap: 35px;
			padding-block: 45px;
		}
		.club-mark {
			display: flex;
			align-items: center;
			gap: 25px;
			justify-self: start;
			text-align: left;
		}
		.club-mark :global(svg) {
			width: 100px;
			margin: 0;
		}
		.club-mark > span {
			font-size: 9px;
		}
		.club-copy {
			max-width: 540px;
		}
		.club-copy h2 {
			font-size: 62px;
			margin-bottom: 20px;
		}
		.club-details {
			max-width: 440px;
		}
		.bookshop-closing {
			align-items: flex-start;
			flex-direction: column;
			padding-block: 45px;
		}
		.closing-links {
			width: min(100%, 300px);
		}
	}
	@media (max-width: 480px) {
		.theme-grid {
			grid-template-columns: 1fr;
			gap: 16px;
		}
		.theme-card {
			display: grid;
			grid-template-columns: 106px 1fr;
			align-items: center;
			gap: 16px;
			padding: 10px;
		}
		.theme-art {
			min-height: 138px;
		}
		.theme-caption {
			padding: 0;
		}
		.theme-caption h3 {
			font-size: 29px;
		}
		.theme-caption p {
			font-size: 11px;
		}
		.theme-number {
			top: 18px;
			left: 18px;
			font-size: 10px;
		}
		.theme-symbol {
			font-size: 55px;
			margin: 0;
		}
		.theme-lines {
			width: 58px;
			height: 58px;
		}
		.theme-lines:after {
			inset: -14px;
		}
		.hero-art {
			max-width: 310px;
		}
		.hero-intro {
			font-size: 13px;
		}
		.hero-colophon {
			display: block;
		}
		.hero-colophon span {
			display: block;
		}
		.hero-colophon span + span {
			margin-top: 4px;
		}
		.club-copy h2 {
			font-size: 54px;
		}
		.club-details {
			gap: 15px;
		}
		.bookshop-closing h2 {
			font-size: 35px;
		}
	}
</style>
