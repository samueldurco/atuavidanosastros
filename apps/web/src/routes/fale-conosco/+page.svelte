<script lang="ts">
	import { page } from '$app/state';
	import { contactSubjects, contactHref, publicContactEmail } from '$lib/data/public-channels';
	let selected = $state('');
	const subject = $derived(
		contactSubjects.find(
			(item) => item.id === (selected || page.url.searchParams.get('assunto'))
		) ?? contactSubjects[0]
	);
</script>

<svelte:head>
	<title>Fale conosco — A Tua Vida nos Astros</title>
	<meta
		name="description"
		content="Entre em contato com a ATVNA para dúvidas sobre sua conta, leituras digitais, produtos físicos da Loja dos Signos, correções de conteúdo e parcerias."
	/>
	<link rel="canonical" href="https://atuavidanosastros.com.br/fale-conosco" />
</svelte:head>

<section class="section contact-page">
	<div class="container contact-grid">
		<header>
			<p class="eyebrow">Contato</p>
			<h1 class="h1">Fale com a ATVNA.</h1>
			<p class="lead">Conte o que você precisa. Escolha o assunto para começar seu e-mail.</p>
			<p>
				Se a dúvida for sobre uma leitura, informe o nome do produto. Para sugerir uma correção na
				Revista, inclua o link do artigo e o trecho.
			</p>
			<a class="library-link" href="/biblioteca"
				>Acessar minhas leituras <span aria-hidden="true">→</span></a
			>
		</header>
		<div class="contact-paper">
			<label for="contact-subject">Sobre o que você quer falar?</label>
			<select
				id="contact-subject"
				value={subject.id}
				onchange={(event) => (selected = event.currentTarget.value)}
				>{#each contactSubjects as item (item.id)}<option value={item.id}>{item.label}</option
					>{/each}</select
			>
			<a class="button" href={contactHref(subject.subject)}
				>Escrever e-mail <span aria-hidden="true">↗</span></a
			>
			<p class="contact-help">
				O botão abre seu aplicativo de e-mail com o assunto preenchido. A mensagem é enviada por
				você.
			</p>
			<div class="email-address">
				<span>Ou escreva diretamente para</span><a href={`mailto:${publicContactEmail}`}
					>{publicContactEmail}</a
				>
			</div>
		</div>
	</div>
	<div class="container contact-bottom">
		<p>Quer acompanhar a ATVNA em outras plataformas?</p>
		<a href="/canais-oficiais">Ver todos os canais oficiais <span aria-hidden="true">→</span></a>
	</div>
</section>

<style>
	.contact-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: clamp(2rem, 6vw, 6rem);
		align-items: start;
	}
	header p {
		line-height: 1.7;
		max-width: 36rem;
	}
	.library-link {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}
	.contact-paper {
		padding: clamp(1.5rem, 4vw, 3rem);
		border: 1px solid var(--atv-border);
		background: var(--atv-surface-card);
	}
	label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.75rem;
	}
	select {
		display: block;
		width: 100%;
		min-height: 48px;
		padding: 0.75rem;
		border: 1px solid var(--atv-border);
		background: var(--atv-paper-0);
		color: var(--atv-text-primary);
		font: inherit;
		margin-bottom: 1.5rem;
	}
	.button {
		display: inline-flex;
		gap: 0.75rem;
	}
	.contact-help {
		font-size: 0.9rem;
		line-height: 1.7;
	}
	.email-address {
		display: grid;
		gap: 0.5rem;
		border-top: 1px solid var(--atv-border);
		padding-top: 1.5rem;
		margin-top: 1.5rem;
	}
	.email-address a {
		overflow-wrap: anywhere;
		min-height: 44px;
		display: flex;
		align-items: center;
	}
	.contact-bottom {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 2rem;
		align-items: center;
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid var(--atv-border);
	}
	.contact-bottom a {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}
	@media (max-width: 700px) {
		.contact-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
