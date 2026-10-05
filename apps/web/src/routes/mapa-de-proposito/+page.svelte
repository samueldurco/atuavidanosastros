<svelte:head>
	<title>Mapa de Carreira — em preparação</title>
	<meta
		name="description"
		content="Conheça a proposta do Mapa de Carreira: vocação, trabalho e sua relação com dinheiro. Produto em preparação."
	/>
	<link rel="canonical" href="https://atuavidanosastros.com.br/mapa-de-proposito" />
</svelte:head>

<section class="hero">
	<div class="container hero-grid">
		<div>
			<p class="eyebrow">Carreira e dinheiro</p>
			<h1 class="display">Mapa de Carreira</h1>
			<p class="lead">
				Explore vocação, rotina de trabalho e sua relação com dinheiro no mapa astral. O Mapa de
				Carreira está em preparação. Você já pode calcular seu Meio do Céu gratuitamente.
			</p>
			<div class="actions">
				<a class="button" href="/bussola-de-carreira">Calcular meu Meio do Céu</a>
				<a class="button secondary" href="#metodo">O que o mapa vai analisar</a>
			</div>
		</div>
		<aside class="status-card" aria-label="Estado da experiência">
			<span class="status">Em preparação</span>
			<h2>Este produto ainda não está disponível.</h2>
			<p>
				A compra e a lista de espera ainda não estão abertas. O preço e os detalhes da entrega serão
				apresentados quando o produto estiver disponível.
			</p>
		</aside>
	</div>
</section>

<section id="metodo" class="section">
	<div class="container">
		<p class="eyebrow">O que será analisado</p>
		<h2 class="h2">Seu trabalho no mapa astral.</h2>
		<div class="grid grid-3 layers">
			<article class="card">
				<h3>Vocação e carreira</h3>
				<p>Meio do Céu, casa 10 e os fatores ligados à vida profissional.</p>
			</article>
			<article class="card">
				<h3>Dinheiro e recursos</h3>
				<p>Casa 2 e os fatores que ajudam a explorar sua relação com dinheiro e recursos.</p>
			</article>
			<article class="card">
				<h3>Rotina de trabalho</h3>
				<p>Casa 6, hábitos e organização do dia a dia.</p>
			</article>
		</div>
	</div>
</section>

<section class="scope">
	<div class="container">
		<p class="eyebrow">Conteúdo previsto</p>
		<h2 class="h2">Os assuntos da leitura.</h2>
		<div class="scope-grid">
			{#each ['Meio do Céu', 'Casas 2, 6 e 10', 'Dinheiro e recursos', 'Vocação e trabalho', 'Perguntas para refletir'] as item (item)}
				<article>
					<span aria-hidden="true"></span>
					<h3>{item}</h3>
				</article>
			{/each}
		</div>
	</div>
</section>

<section class="section">
	<div class="reading delivery">
		<p class="eyebrow">Sua leitura</p>
		<h2 class="h2">Acompanhe pela Biblioteca.</h2>
		<p class="lead">
			Quando o produto estiver disponível, você poderá consultar o resultado na sua conta. A
			Biblioteca reúne os pedidos e as leituras salvas.
		</p>
		<a class="button secondary" href="/metodo">Como fazemos as leituras</a>
	</div>
</section>

<style>
	.hero {
		padding: clamp(4rem, 9vw, 9rem) 0;
	}
	.hero-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.25fr) minmax(18rem, 0.75fr);
		gap: clamp(2rem, 6vw, 6rem);
		align-items: end;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem;
		margin-top: 2rem;
	}
	.status-card {
		padding: clamp(1.5rem, 3vw, 2.4rem);
		background: var(--atv-night-950);
		color: var(--atv-frost-50);
		border-radius: var(--atv-radius-lg);
	}
	.status-card .status {
		color: var(--atv-frost-50);
		border-color: var(--atv-lunar-mist-300);
	}
	.status-card h2,
	.layers h3,
	.scope-grid h3 {
		font: 500 1.7rem/1.1 var(--atv-font-display);
	}
	.status-card p {
		color: var(--atv-lunar-mist-300);
	}
	.layers {
		margin-top: 2.5rem;
	}
	.layers .card {
		padding: 1.5rem;
	}
	.layers p {
		color: var(--atv-text-secondary);
		font-family: var(--atv-font-editorial);
	}
	.scope {
		padding: clamp(4rem, 8vw, 8rem) 0;
		background: var(--atv-surface-card);
		border-block: 1px solid var(--atv-border);
	}
	.scope-grid {
		margin-top: 2.5rem;
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		border-top: 1px solid var(--atv-border);
	}
	.scope-grid article {
		min-height: 13rem;
		padding: 1.25rem;
		border-right: 1px solid var(--atv-border);
	}
	.scope-grid article:first-child {
		border-left: 1px solid var(--atv-border);
	}
	.scope-grid span {
		display: block;
		width: 2rem;
		height: 1px;
		background: var(--atv-gold-500);
	}
	.delivery {
		text-align: center;
	}
	@media (max-width: 900px) {
		.hero-grid {
			grid-template-columns: 1fr;
		}
		.scope-grid {
			grid-template-columns: 1fr 1fr;
		}
		.scope-grid article:nth-child(odd) {
			border-left: 1px solid var(--atv-border);
		}
	}
	@media (max-width: 620px) {
		.actions {
			flex-direction: column;
		}
		.scope-grid {
			grid-template-columns: 1fr;
		}
		.scope-grid article {
			min-height: auto;
			border-left: 1px solid var(--atv-border);
			border-bottom: 1px solid var(--atv-border);
		}
	}
</style>
