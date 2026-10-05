<script lang="ts">
	import type { EditorialDocument } from '$lib/server/editorial';
	import type { PageSeo } from '$lib/seo';
	let { documents, seo }: { documents: EditorialDocument[]; seo: PageSeo } = $props();
</script>

<section class="section">
	<div class="reading">
		<p class="eyebrow">Caderno do céu</p>
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
				<h2>Um acervo começa pelo cuidado</h2>
				<p>
					Ainda não há publicações liberadas neste acervo. Cada leitura precisa de autoria
					identificada, fontes e revisão editorial antes de aparecer aqui.
				</p>
				<p>
					Não publicamos previsões sem fatos calculados e verificados, nem transformamos um signo em
					sentença sobre a sua vida.
				</p>
			</div>
		{/if}
		<p><a href="/metodo">Conheça nosso método</a> · <a href="/caderno">Explore o Caderno</a></p>
		{#if seo.path === '/noticias'}<p><a href="/noticias/feed.xml">Acompanhar pelo RSS</a></p>{/if}
	</div>
</section>

<style>
	.card {
		padding: 1.5rem;
		margin-block: 1.5rem;
	}
</style>
