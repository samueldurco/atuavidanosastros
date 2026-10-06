<script lang="ts">
	import type { EditorialDocument } from '$lib/server/editorial';
	let {
		document,
		related = []
	}: { document: EditorialDocument; related?: { path: string; title: string }[] } = $props();
	function date(value: string): string {
		return new Intl.DateTimeFormat('pt-BR', {
			dateStyle: 'long',
			timeStyle: 'short',
			timeZone: 'America/Sao_Paulo'
		}).format(new Date(value));
	}
</script>

<article class="section">
	<div class="reading">
		<p class="eyebrow">
			{document.kind === 'reporting'
				? 'Reportagem'
				: document.kind === 'column'
					? 'Coluna'
					: document.kind === 'horoscope'
						? 'Horóscopo'
						: 'Guia'}
		</p>
		<h1 class="h1">{document.title}</h1>
		<p class="lead">{document.description}</p>
		<p>Por <a href={`/pessoas/${document.author.id}`}>{document.author.name}</a></p>
		{#if document.automationDisclosure}
			<p>
				Produzido com auxílio de inteligência artificial e avaliado em uma passagem automatizada
				separada. Sem revisão humana independente.
			</p>
		{/if}
		<p>
			Publicado em <time datetime={document.publishedAt}>{date(document.publishedAt)}</time> (horário
			de Brasília).
		</p>
		{#if document.modifiedAt !== document.publishedAt}<p>
				Atualizado em <time datetime={document.modifiedAt}>{date(document.modifiedAt)}</time> (horário
				de Brasília).
			</p>{/if}
		{#if document.image}
			<figure>
				<img
					src={document.image.path}
					alt={document.image.alt}
					width={document.image.width}
					height={document.image.height}
				/>
				<figcaption>{document.image.credit} · {document.image.license}</figcaption>
			</figure>
		{/if}
		{#each document.sections as section, sectionIndex (sectionIndex)}
			<section>
				<h2>{section.heading}</h2>
				{#each section.paragraphs as paragraph, paragraphIndex (paragraphIndex)}<p>
						{paragraph}
					</p>{/each}
			</section>
		{/each}
		{#if document.calculation}<aside class="card">
				<h2>Base calculada</h2>
				<p>
					Motor {document.calculation.engine}, versão {document.calculation.version}.
				</p>
				<p>
					Cobertura: <time datetime={document.calculation.coverageStart}
						>{date(document.calculation.coverageStart)}</time
					>
					a
					<time datetime={document.calculation.coverageEnd}
						>{date(document.calculation.coverageEnd)}</time
					> (horário de Brasília).
				</p>
			</aside>{/if}
		<section>
			<h2>Fontes e referências</h2>
			<ul>
				{#each document.sources as source, sourceIndex (sourceIndex)}<li>
						<a href={source.url} rel="noopener noreferrer">{source.title}</a>
					</li>{/each}
			</ul>
		</section>
		{#if related.length}
			<nav aria-label="Guias relacionados">
				<h2>Continue a leitura</h2>
				<ul>
					{#each related as guide (guide.path)}<li>
							<a href={guide.path}>{guide.title}</a>
						</li>{/each}
				</ul>
			</nav>
		{/if}
		<p><a href="/metodo">Método e limites</a> · <a href="/suporte">Solicitar uma correção</a></p>
	</div>
</article>

<style>
	.card {
		padding: 1.5rem;
		margin-block: 1.5rem;
	}
	img {
		max-width: 100%;
		height: auto;
	}
	figure {
		margin-inline: 0;
	}
</style>
