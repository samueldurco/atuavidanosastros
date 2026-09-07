<script lang="ts">
	let { data } = $props();
</script>

<svelte:head
	><title>Seu atlas — A Tua Vida nos Astros</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<section class="section">
	<div class="container">
		<p class="eyebrow">Área pessoal</p>
		<h1 class="h1">Seu atlas, organizado pelo que pede atenção.</h1>
		<p class="lead">
			{#if data.preview}
				O dashboard está em modo de prévia: nenhum dado pessoal é carregado ou persistido.
			{:else}
				Sua conta está conectada. Leituras salvas e entregas disponíveis aparecem aqui sem expor
				dados de nascimento.
			{/if}
		</p>
		<div class="top-grid">
			<article class="attention-panel">
				<p class="eyebrow">Próximo passo</p>
				<h2>Complete seu perfil natal.</h2>
				<p>Data, hora, local e grau de precisão ficam versionados e podem ser corrigidos.</p>
				<a href="/bussola-de-carreira">Adicionar dados de nascimento</a>
			</article>
			<article class="card library-panel">
				<p class="eyebrow">Biblioteca</p>
				{#if data.items.length}
					<h2>
						{data.items.length} item{data.items.length === 1 ? '' : 's'} recente{data.items
							.length === 1
							? ''
							: 's'}.
					</h2>
					<ul>
						{#each data.items as item (item.id)}
							<li>{item.title}</li>
						{/each}
					</ul>
					<a class="button secondary" href="/biblioteca">Abrir Biblioteca</a>
				{:else}
					<h2>Nenhuma leitura salva por enquanto.</h2>
					<p>
						Quando você escolher salvar uma leitura, ela aparece aqui com o contexto e a versão do
						resultado.
					</p>
					<a class="button secondary" href="/bussola-de-carreira">Explorar ferramentas</a>
				{/if}
			</article>
		</div>
		<section class="continue">
			<p class="eyebrow">Continue por aqui</p>
			<div class="grid grid-3">
				<a class="card path-card" href="/meu-ceu"
					><span></span>
					<h2>Meu céu</h2>
					<p>Conheça os pilares do seu mapa com método e espaço para escolha.</p>
					<strong>Acessar →</strong></a
				>
				<a class="card path-card" href="/proposito"
					><span></span>
					<h2>Propósito</h2>
					<p>Observe contribuição, direção e possibilidades sem transformar leitura em sentença.</p>
					<strong>Acessar →</strong></a
				>
				<a class="card path-card" href="/ciclos"
					><span></span>
					<h2>Ciclos</h2>
					<p>Repare em ritmos e temporadas com calma, contexto e continuidade.</p>
					<strong>Acessar →</strong></a
				>
			</div>
		</section>
		<section class="privacy-panel card">
			<div>
				<p class="eyebrow">Privacidade</p>
				<h2>Você controla o que fica no seu atlas.</h2>
			</div>
			<p>Preferências, exportação e exclusão serão sempre caminhos claros dentro da sua conta.</p>
			<div><a href="/privacidade">Preferências</a><a href="/privacidade">Exclusão</a></div>
		</section>
	</div>
</section>

<style>
	.top-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(20rem, 0.8fr);
		gap: 1.25rem;
		margin-top: 3rem;
	}
	.attention-panel,
	.library-panel,
	.path-card,
	.privacy-panel {
		padding: clamp(1.4rem, 3vw, 2rem);
	}
	.attention-panel {
		border-radius: var(--atv-radius-lg);
		background: var(--atv-night-950);
		color: var(--atv-frost-50);
	}
	.attention-panel .eyebrow {
		color: var(--atv-gold-300);
	}
	.attention-panel h2,
	.library-panel h2,
	.path-card h2,
	.privacy-panel h2 {
		font: 500 clamp(1.7rem, 3vw, 2.4rem)/1.05 var(--atv-font-display);
		margin: 0;
	}
	.attention-panel > p:not(.eyebrow) {
		color: var(--atv-lunar-mist-300);
		max-width: 34rem;
	}
	.attention-panel a {
		display: inline-flex;
		margin-top: 1rem;
		color: var(--atv-gold-200);
		font: 700 0.86rem var(--atv-font-ui);
		text-decoration: none;
		border-bottom: 1px solid var(--atv-gold-500);
		padding-bottom: 0.3rem;
	}
	.library-panel {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}
	.library-panel > p:not(.eyebrow),
	.path-card p,
	.privacy-panel > p {
		color: var(--atv-text-secondary);
		font-family: var(--atv-font-editorial);
	}
	.library-panel ul {
		padding-left: 1.15rem;
		margin: 0.4rem 0 1.25rem;
		font-family: var(--atv-font-editorial);
	}
	.library-panel .button {
		margin-top: auto;
	}
	.continue {
		margin-top: clamp(4rem, 8vw, 7rem);
	}
	.path-card {
		color: var(--atv-text-primary);
		text-decoration: none;
		min-height: 16rem;
		display: flex;
		flex-direction: column;
	}
	.path-card span {
		width: 2.5rem;
		height: 1px;
		background: var(--atv-gold-500);
		margin-bottom: 1.5rem;
	}
	.path-card strong {
		color: var(--atv-action);
		margin-top: auto;
		font: 700 0.82rem var(--atv-font-ui);
	}
	.privacy-panel {
		display: grid;
		grid-template-columns: 1fr minmax(16rem, 0.8fr) auto;
		gap: 2rem;
		align-items: center;
		margin-top: clamp(4rem, 8vw, 7rem);
	}
	.privacy-panel p {
		margin: 0;
	}
	.privacy-panel div:last-child {
		display: flex;
		gap: 1rem;
		font: 700 0.82rem var(--atv-font-ui);
	}
	@media (max-width: 800px) {
		.top-grid,
		.privacy-panel {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 620px) {
		.privacy-panel {
			gap: 1rem;
		}
	}
</style>
