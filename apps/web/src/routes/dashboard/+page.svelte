<script lang="ts">
	import { universes } from '$lib/data/site';
	import PageIntro from '$lib/components/ui/PageIntro.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	let { data } = $props();
</script>

<svelte:head
	><title>Seu atlas — A Tua Vida nos Astros</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<div data-stitch="MEM-01">
	<PageIntro
		eyebrow="Área pessoal"
		title="Seu atlas, no seu tempo."
		description={data.preview
			? 'Esta é uma prévia do seu espaço pessoal. Entre para guardar e reencontrar suas leituras.'
			: 'Suas leituras e próximos caminhos, organizados em um só lugar.'}
	/>
	{#if data.libraryError}<StatePanel
			kind="error"
			title="Sua Biblioteca não carregou agora."
			description="Tente novamente em alguns instantes. Seus resultados salvos continuam na sua conta."
			><Button href="/dashboard" variant="secondary">Tentar novamente</Button></StatePanel
		>{/if}
	<section class="attention" aria-labelledby="attention-title">
		<div>
			<p class="eyebrow">Uma pergunta para começar</p>
			<h2 id="attention-title">Que direção pede um olhar mais atento?</h2>
			<p>
				A Bússola de Carreira é um ponto de partida para observar sua contribuição e formular novas
				perguntas sobre o trabalho.
			</p>
			<Button href="/bussola-de-carreira">Explorar minha direção</Button>
		</div>
		<div class="attention-note">
			<span class="note-number">01</span><strong>Comece com o que você sabe.</strong>
			<p>
				Data, hora e coordenadas de nascimento ajudam a situar seu Meio do Céu. O cálculo inicial
				está disponível sem cadastro.
			</p>
			<a href="/meio-do-ceu">Entender o Meio do Céu →</a>
		</div>
	</section>
	<div class="dashboard-grid">
		<section aria-labelledby="resume-title">
			<div class="section-label">
				<h2 id="resume-title">Leituras para reencontrar</h2>
				<a href="/biblioteca">Ver Biblioteca →</a>
			</div>
			{#if data.items.length}<div class="recent-list">
					{#each data.items as item (item.id)}<article class="recent-item">
							<span class="paper-mark" aria-hidden="true"></span>
							<div>
								<p class="eyebrow">Na sua Biblioteca</p>
								<h3>{item.title}</h3>
								<p>
									Salvo em {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(
										new Date(item.created_at)
									)}
								</p>
							</div>
							<a href="/biblioteca" aria-label={`Encontrar ${item.title} na Biblioteca`}
								>Reencontrar →</a
							>
						</article>{/each}
				</div>
			{:else}<StatePanel
					title="Sua primeira leitura pode começar agora."
					description="Ao salvar um resultado, ele ganha lugar na sua Biblioteca para você voltar quando quiser."
					><Button href="/bussola-de-carreira" variant="secondary">Experimentar a Bússola</Button
					></StatePanel
				>{/if}
		</section>
		<aside>
			<Card eyebrow="Seu contexto importa" title="Método, antes de promessa."
				><p class="context-copy">
					Conheça a diferença entre o que é calculado e o que é interpretado em cada experiência.
				</p>
				<a href="/metodo">Conhecer nosso método →</a></Card
			>
			<div class="account-note">
				<strong>Você escolhe o que guardar.</strong>
				<p>Consulte como tratamos seus dados e quais escolhas estão disponíveis.</p>
				<a href="/privacidade">Privacidade e cuidado →</a>
			</div>
		</aside>
	</div>
	<section class="universe-section" aria-labelledby="paths-title">
		<p class="eyebrow">Seis universos</p>
		<h2 id="paths-title">Continue pela sua pergunta.</h2>
		<div class="universe-grid">
			{#each universes as universe, i (universe.slug)}<a href={`/${universe.slug}`}
					><span class="index">0{i + 1}</span>
					<div>
						<h3>{universe.title}</h3>
						<p>{universe.eyebrow}</p>
					</div>
					<span aria-hidden="true">↗</span></a
				>{/each}
		</div>
	</section>
</div>

<style>
	.attention {
		display: grid;
		grid-template-columns: minmax(0, 1.5fr) minmax(0, 0.75fr);
		gap: 2.5rem;
		padding: clamp(1.5rem, 3vw, 2.5rem);
		border: 1px solid var(--atv-border);
		border-top: 3px solid var(--atv-gold-500);
		background: var(--atv-surface-card);
		border-radius: var(--atv-radius-md);
		margin-block: 1.5rem 2.5rem;
	}
	.attention h2 {
		margin: 0;
		max-width: 30rem;
		font: 500 clamp(1.8rem, 3vw, 2.6rem)/1.15 var(--atv-font-display);
	}
	.attention p {
		color: var(--atv-text-secondary);
		max-width: 38rem;
	}
	.attention > div > p:not(.eyebrow) {
		font: 400 1.1875rem/1.6 var(--atv-font-editorial);
		margin-bottom: 1.5rem;
	}
	.attention-note {
		border-left: 1px solid var(--atv-border);
		padding-left: 2rem;
		font-size: 0.85rem;
	}
	.note-number {
		display: block;
		color: var(--atv-text-accent);
		font: 500 2.5rem var(--atv-font-display);
		margin-bottom: 1rem;
	}
	.dashboard-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
		gap: 2rem;
	}
	.section-label {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1.25rem;
	}
	.section-label h2 {
		margin: 0;
		font: 500 1.6rem var(--atv-font-display);
	}
	.section-label a,
	.recent-item a {
		font-size: 0.85rem;
	}
	.recent-item {
		display: flex;
		gap: 1rem;
		align-items: center;
		padding: 1.5rem 0;
		border-bottom: 1px solid var(--atv-border);
	}
	.recent-item > div {
		flex: 1;
	}
	.recent-item h3 {
		margin: 0;
		font: 500 1.4rem var(--atv-font-display);
	}
	.recent-item p:last-child {
		margin: 0.4rem 0 0;
		font-size: 0.8rem;
		color: var(--atv-text-secondary);
	}
	.paper-mark {
		flex: 0 0 2.5rem;
		height: 3.3rem;
		border: 1px solid var(--atv-gold-500);
		background: var(--atv-surface-card);
	}
	.context-copy,
	.account-note p {
		color: var(--atv-text-secondary);
	}
	.account-note {
		margin-top: 1.5rem;
		padding: 1.5rem;
		border-top: 1px solid var(--atv-border);
		font-size: 0.85rem;
	}
	.universe-section {
		margin-top: 3rem;
	}
	.universe-section h2 {
		font: 500 2rem var(--atv-font-display);
	}
	.universe-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
	}
	.universe-grid a {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1.25rem 0;
		border-top: 1px solid var(--atv-border);
		text-decoration: none;
		color: var(--atv-text-primary);
	}
	.universe-grid a > div {
		flex: 1;
	}
	.universe-grid h3 {
		margin: 0;
		font: 500 1.35rem var(--atv-font-display);
	}
	.universe-grid p {
		font-size: 0.8rem;
		color: var(--atv-text-secondary);
		margin: 0.4rem 0 0;
	}
	.index {
		color: var(--atv-text-accent);
		font-size: 0.75rem;
		padding-top: 0.2rem;
	}
	@media (max-width: 1200px) {
		.dashboard-grid {
			grid-template-columns: 1fr;
		}
		.dashboard-grid aside {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 1rem;
		}
	}
	@media (max-width: 767px) {
		.attention,
		.dashboard-grid aside {
			grid-template-columns: 1fr;
		}
		.attention-note {
			border-left: 0;
			border-top: 1px solid var(--atv-border);
			padding: 1.5rem 0 0;
		}
		.universe-grid {
			grid-template-columns: 1fr 1fr;
		}
		.recent-item {
			flex-wrap: wrap;
		}
	}
	@media (max-width: 400px) {
		.universe-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
