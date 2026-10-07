<script lang="ts">
	import ContentShell from '$lib/components/shells/ContentShell.svelte';
	let { data } = $props();
</script>

<svelte:head
	><title>{data.reading.title} — leitura compartilhada</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<ContentShell kind="product">
	<article>
		<p class="eyebrow">Uma leitura para conversar a dois</p>
		<h1>{data.reading.title}</h1>
		{#if data.reading.names}<p>{data.reading.names}</p>{/if}
		<p class="prose">{data.reading.opening}</p>
		<nav aria-label="Capítulos">
			<ol>
				{#each data.reading.sections as section, i (i)}<li>
						<a href={`#capitulo-${i}`}>{section.title}</a>
					</li>{/each}
			</ol>
		</nav>
		{#each data.reading.sections as section, i (i)}<section id={`capitulo-${i}`}>
				<h2>{section.title}</h2>
				<p class="prose">{section.text}</p>
			</section>{/each}
		<section>
			<h2>Perguntas para conversar</h2>
			<ul>
				{#each data.reading.questions as question, i (i)}<li>{question}</li>{/each}
			</ul>
			<p class="prose">{data.reading.practice}</p>
		</section>
		<p>
			Leitura simbólica para reflexão. Não determina o futuro da relação. O proprietário pode
			desativar este link.
		</p>
	</article>
</ContentShell>

<style>
	article {
		max-width: 48rem;
		margin: 2rem auto;
	}
	h1,
	h2 {
		font-family: var(--atv-font-display);
	}
	h1 {
		font-size: clamp(2rem, 5vw, 3.5rem);
	}
	section {
		margin-block: 2.5rem;
		scroll-margin-top: 5rem;
	}
	.prose {
		white-space: pre-line;
		line-height: 1.85;
	}
	nav {
		padding: 1.5rem;
		border-block: 1px solid var(--atv-border, #ddd);
	}
</style>
