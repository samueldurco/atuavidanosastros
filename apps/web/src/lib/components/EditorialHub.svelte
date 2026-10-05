<script lang="ts">
	import type { EditorialDocument } from '$lib/server/editorial';
	import type { PageSeo } from '$lib/seo';
	let { documents, seo }: { documents: EditorialDocument[]; seo: PageSeo } = $props();
</script>

<section class="section">
	<div class="reading">
		<p class="eyebrow">Artigos de astrologia</p>
		<h1 class="h1">{seo.title.split(' — ')[0]}</h1>
		<p class="lead">{seo.description}</p>
		{#if documents.length}
			{#each documents as document (document.id)}
				<article class="card">
					<p class="eyebrow">
						{document.kind === 'reporting'
							? 'Reportagem'
							: document.kind === 'column'
								? 'Coluna'
								: document.kind === 'horoscope'
									? 'Horóscopo'
									: 'Guia'}
					</p>
					<h2><a href={document.path}>{document.title}</a></h2>
					<p>{document.description}</p>
					<p>Por <a href={`/pessoas/${document.author.id}`}>{document.author.name}</a></p>
				</article>
			{/each}
		{:else}
			<div class="card">
				<h2>Nenhum artigo publicado ainda</h2>
				<p>Os novos artigos aparecerão aqui assim que forem publicados.</p>
			</div>
		{/if}
		<p><a href="/metodo">Como fazemos as leituras</a> · <a href="/caderno">Ver artigos</a></p>
		{#if seo.path === '/noticias'}<p><a href="/noticias/feed.xml">Acompanhar pelo RSS</a></p>{/if}
	</div>
</section>

<style>
	.card {
		padding: 1.5rem;
		margin-block: 1.5rem;
	}
</style>
