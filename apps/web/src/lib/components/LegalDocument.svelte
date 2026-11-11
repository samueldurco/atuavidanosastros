<script lang="ts">
	import { changeAnalyticsConsent } from '$lib/analytics/consent';
	import { legalContact, legalDocuments, legalUpdatedAt } from '$lib/data/legal';
	import PublicEmailMarkup from './PublicEmailMarkup.svelte';
	let { kind }: { kind: keyof typeof legalDocuments } = $props();
	const document = $derived(legalDocuments[kind]);
</script>

<svelte:head>
	<title>{document.title} — A Tua Vida nos Astros</title>
	<meta name="description" content={document.description} />
	<link rel="canonical" href={`https://atuavidanosastros.com.br/${kind}`} />
</svelte:head>

<article class="section reading legal-document">
	<p class="eyebrow">ATVNA · Informações de uso</p>
	<h1>{document.title}</h1>
	<p class="lead">{document.description}</p>
	<p>Versão 1 · Atualizada em {legalUpdatedAt}</p>
	<nav aria-label="Documentos de uso">
		<a href="/termos">Termos de uso</a>
		<a href="/privacidade">Política de Privacidade</a>
	</nav>
	{#each document.sections as section (section.title)}
		<section>
			<h2>{section.title}</h2>
			{#each section.paragraphs as paragraph (paragraph)}<p>{paragraph}</p>{/each}
		</section>
	{/each}
	{#if kind === 'privacidade'}
		<section>
			<h2>Preferência de medição neste navegador</h2>
			<p>A escolha vale para este navegador e pode ser alterada a qualquer momento.</p>
			<div class="controls">
				<button class="button" onclick={() => changeAnalyticsConsent('denied')}
					>Recusar medição opcional</button
				>
				<button class="button" onclick={() => changeAnalyticsConsent('granted')}
					>Aceitar medição opcional</button
				>
			</div>
		</section>
	{/if}
	<section>
		<h2>Fale com a ATVNA</h2>
		<p>
			<PublicEmailMarkup><a href={`mailto:${legalContact}`}>{legalContact}</a></PublicEmailMarkup>
		</p>
	</section>
</article>

<style>
	.legal-document {
		max-width: 76ch;
		margin-inline: auto;
	}
	section {
		margin-block: 2rem;
	}
	section h2 {
		font-size: clamp(1.25rem, 3vw, 1.65rem);
	}
	section p {
		line-height: 1.75;
	}
	nav,
	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}
	nav a {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
</style>
