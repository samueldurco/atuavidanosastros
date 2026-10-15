<script lang="ts">
	import SocialPresence from '$lib/components/SocialPresence.svelte';
	import { publicChannels, publicContactEmail } from '$lib/data/public-channels';
</script>

<svelte:head>
	<title>Canais oficiais — A Tua Vida nos Astros</title>
	<meta
		name="description"
		content="Encontre os perfis oficiais da ATVNA no Instagram, Facebook, YouTube, Threads, X, TikTok, Pinterest, LinkedIn e Reddit."
	/>
	<link rel="canonical" href="https://atuavidanosastros.com.br/canais-oficiais" />
</svelte:head>

<section class="section channels-page">
	<div class="container">
		<header class="channels-header">
			<p class="eyebrow">Além do site</p>
			<h1 class="h1">Encontre a ATVNA.</h1>
			<p class="lead">
				Escolha onde quer acompanhar a ATVNA. Reunimos aqui nossos perfis e formas de contato.
			</p>
		</header>
		<SocialPresence compact />
		<div class="channels-details">
			<section>
				<h2>Os perfis da marca</h2>
				<p>
					O nome do perfil pode variar de uma rede para outra. Use os links desta página para
					encontrar a conta certa.
				</p>
				<dl>
					{#each publicChannels as channel (channel.id)}<div>
							<dt>{channel.name}</dt>
							<dd>{channel.handle}</dd>
						</div>{/each}
				</dl>
			</section>
			<aside class="channels-note">
				<p class="eyebrow">Novos canais</p>
				<h2>WhatsApp e Telegram</h2>
				<p>
					Estamos preparando esses espaços. Os links serão publicados aqui quando os canais
					estiverem disponíveis.
				</p>
				<hr />
				<h2>Precisa falar com a gente?</h2>
				<p>Para dúvidas sobre sua conta, leituras, conteúdo ou parcerias, escreva por e-mail.</p>
				<a href="/fale-conosco" class="button">Fale conosco</a>
				<p class="email">{publicContactEmail}</p>
			</aside>
		</div>
	</div>
</section>

<style>
	.channels-header {
		max-width: 48rem;
		margin-bottom: 3rem;
	}
	.channels-details {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: clamp(2rem, 6vw, 6rem);
		margin-top: 4rem;
	}
	h2 {
		font: 500 1.8rem/1.2 var(--atv-font-display);
	}
	p {
		line-height: 1.7;
	}
	dl {
		margin: 1.5rem 0 0;
	}
	dl > div {
		display: grid;
		grid-template-columns: 7rem 1fr;
		gap: 1rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--atv-border);
	}
	dt {
		font-weight: 600;
	}
	dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
	.channels-note {
		align-self: start;
		padding: clamp(1.5rem, 4vw, 3rem);
		background: var(--atv-surface-card);
		border: 1px solid var(--atv-border);
	}
	hr {
		border: 0;
		border-top: 1px solid var(--atv-border);
		margin: 2rem 0;
	}
	.email {
		font-size: 0.875rem;
		overflow-wrap: anywhere;
	}
	@media (max-width: 700px) {
		.channels-details {
			grid-template-columns: 1fr;
		}
	}
</style>
