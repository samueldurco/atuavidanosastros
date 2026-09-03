<svelte:head>
	<title>Mapa de Propósito & Carreira — em preparação</title>
	<meta
		name="description"
		content="Conheça a proposta editorial do futuro Mapa de Propósito & Carreira. Acesso, preço e checkout ainda não estão disponíveis."
	/>
	<link rel="canonical" href="https://atuavidanosastros.com.br/mapa-de-proposito" />
</svelte:head>

<section class="hero">
	<div class="container hero-grid">
		<div>
			<p class="eyebrow">Direção</p>
			<h1 class="display">Mapa de Propósito<br />& Carreira</h1>
			<p class="lead">
				Uma futura leitura para organizar hipóteses sobre contribuição, rotina e presença pública —
				com contexto e perguntas práticas, não promessas sobre destino, renda ou trabalho.
			</p>
			<div class="actions">
				<a class="button" href="/bussola-de-carreira">Conhecer a Bússola de Carreira</a>
				<a class="button secondary" href="#metodo">Ver o método</a>
			</div>
		</div>
		<aside class="status-card" aria-label="Estado da experiência">
			<span class="status">Em preparação</span>
			<h2>A experiência ainda não está aberta.</h2>
			<p>
				Acesso, preço e checkout só serão apresentados depois da validação contratual, editorial e
				operacional. Não há compra ou lista de espera ativa nesta fase.
			</p>
		</aside>
	</div>
</section>

<section id="metodo" class="section">
	<div class="container">
		<p class="eyebrow">Método</p>
		<h2 class="h2">Três camadas, claramente separadas.</h2>
		<div class="grid grid-3 layers">
			<article class="card">
				<h3>Dados calculados</h3>
				<p>Posições, casas e aspectos com método, versão e limites de precisão identificáveis.</p>
			</article>
			<article class="card">
				<h3>Hipóteses interpretativas</h3>
				<p>Leituras editoriais para investigar; elas não se confundem com fatos ou previsões.</p>
			</article>
			<article class="card">
				<h3>Escolhas individuais</h3>
				<p>Formação, território, saúde, oportunidades e decisão humana continuam no centro.</p>
			</article>
		</div>
	</div>
</section>

<section class="scope">
	<div class="container">
		<p class="eyebrow">Escopo em estudo</p>
		<h2 class="h2">Uma leitura para elaborar possibilidades.</h2>
		<div class="scope-grid">
			{#each ['Meio do Céu', 'Casas 2, 6 e 10', 'Recursos e rotina', 'Contribuição e presença', 'Perguntas e experimentos'] as item (item)}
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
		<p class="eyebrow">Entrega e privacidade</p>
		<h2 class="h2">Web primeiro; recuperação pela Biblioteca quando disponível.</h2>
		<p class="lead">
			Quando esta experiência existir, o resultado será apresentado no webapp e poderá ser
			recuperado na Biblioteca. Dados natais não alimentam analytics; todo uso pede uma finalidade
			clara.
		</p>
		<a class="button secondary" href="/metodo">Ler sobre cálculo, interpretação e escolha</a>
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
