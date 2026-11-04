<script lang="ts">
	import ReadingShell from '$lib/components/shells/ReadingShell.svelte';
	import PageIntro from '$lib/components/ui/PageIntro.svelte';
	import type { LaunchReading } from '$lib/trials/launch-reading';
	import '$lib/styles/mvp-product-art.css';
	let { reading, productId }: { reading: LaunchReading; productId: string } = $props();
	const contents = $derived([
		{ id: 'panorama', label: 'Seu panorama' },
		...reading.sections.map((section) => ({ id: `leitura-${section.id}`, label: section.title })),
		{ id: 'proximo-passo', label: 'Um próximo passo' },
		{ id: 'limites', label: 'Como usar esta leitura' }
	]);
</script>

<ReadingShell {contents}>
	{#snippet heading()}
		<PageIntro
			eyebrow="Sua leitura · teste privado"
			title={reading.title}
			description="Uma leitura para refletir sobre sua situação e escolher o próximo passo com autonomia."
			identity={productId}
			productArtwork
		/>
	{/snippet}
	<article class="launch-reading">
		<section id="panorama" aria-labelledby="panorama-titulo">
			<h2 id="panorama-titulo">Seu panorama</h2>
			<p class="summary">{reading.summary}</p>
		</section>
		{#each reading.sections as section (section.id)}
			<section id={`leitura-${section.id}`} aria-labelledby={`titulo-${section.id}`}>
				<h2 id={`titulo-${section.id}`}>{section.title}</h2>
				{#each section.paragraphs as paragraph (paragraph)}<p>{paragraph}</p>{/each}
			</section>
		{/each}
		<section id="proximo-passo" aria-labelledby="acao-titulo">
			<h2 id="acao-titulo">Um próximo passo</h2>
			<p>{reading.practicalAction}</p>
			<blockquote>{reading.reflection}</blockquote>
		</section>
		<section id="limites" aria-labelledby="limites-titulo">
			<h2 id="limites-titulo">Como usar esta leitura</h2>
			<ul>
				{#each reading.limits as limit (limit)}<li>{limit}</li>{/each}
			</ul>
		</section>
	</article>
	{#snippet actions()}
		<p class="private-note">
			Edição de teste privado. A avaliação do proprietário e a liberação comercial são etapas
			separadas.
		</p>
		<a href="/testar-lancamentos">Minhas preparações</a>
	{/snippet}
</ReadingShell>

<style>
	.launch-reading {
		font-family: var(--atv-font-editorial);
		color: var(--atv-text-primary);
		overflow-wrap: anywhere;
	}
	section {
		scroll-margin-top: 2rem;
		padding-bottom: 2rem;
		margin-bottom: 2rem;
		border-bottom: 1px solid var(--atv-border);
	}
	h2 {
		font: 400 clamp(1.65rem, 3vw, 2.15rem)/1.2 var(--atv-font-editorial);
		margin: 0 0 1.25rem;
	}
	p,
	li,
	blockquote {
		font-size: 1.125rem;
		line-height: 1.8;
	}
	.summary {
		font-size: 1.3rem;
	}
	blockquote {
		margin: 1.5rem 0 0;
		padding: 1rem 1.25rem;
		border-left: 2px solid var(--atv-border);
		background: var(--atv-surface-card);
	}
	li {
		margin-bottom: 0.75rem;
	}
	.private-note {
		font: 400 0.9rem/1.6 var(--atv-font-ui);
		color: var(--atv-text-secondary);
	}
	a {
		display: inline-block;
		padding-block: 0.75rem;
	}
</style>
