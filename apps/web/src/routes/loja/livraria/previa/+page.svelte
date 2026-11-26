<script lang="ts">
	let { data } = $props();
</script>

<svelte:head><title>Estante editorial · Prévia restrita ATVNA</title></svelte:head>
<p class="preview-kicker">21 livros · Acervo permanente em preparação</p>
<h1>Uma estante para<br />voltar a si.</h1>
<p>
	Astrologia e Tarot em livros para estudar, consultar e levar à vida. Esta prévia reúne o catálogo
	editorial completo. As fichas apresentam a proposta de cada obra; os textos continuam em
	reescrita.
</p>
<section aria-label="Primeira vitrine" class="preview-grid">
	{#each data.preview.catalog.slice(0, 3) as book (book.id)}
		<article class="preview-book">
			<a href={`/loja/livraria/previa/livros/${book.slug}`}
				><img
					src={book.coverUrl}
					alt={`Capa provisória de ${book.title}`}
					width="240"
					height="360"
				/></a
			><span class="preview-badge">{book.theme} · Capa provisória</span>
			<h2 style="font-size:1.8rem">{book.title}</h2>
			<p>{book.summary}</p>
			<a href={`/loja/livraria/previa/livros/${book.slug}`}>Conhecer o livro e simular pedido</a>
		</article>
	{/each}
</section>
<section class="preview-club" aria-labelledby="club-preview-title">
	<p class="preview-kicker">Céu de Papel · Clube de leitura</p>
	<h2 id="club-preview-title">Um livro por mês.<br />Tempo para ler, espaço para escrever.</h2>
	<p>
		Edições ampliadas com caderno de leitura no próprio volume. O ciclo trimestral e o anual recebem
		a mesma edição mensal; o anual tem menor valor de teste por edição. Astrologia e Tarot se
		alternam.
	</p>
	<a class="preview-button" href="/loja/livraria/previa/ceu-de-papel"
		>Explorar o clube e os ciclos</a
	>
</section>
<section aria-labelledby="catalog-rest">
	<h2 id="catalog-rest">O restante da estante</h2>
	<div class="preview-grid">
		{#each data.preview.catalog.slice(3) as book (book.id)}<article class="preview-book">
				<a href={`/loja/livraria/previa/livros/${book.slug}`}
					><img
						src={book.coverUrl}
						alt={`Capa provisória de ${book.title}`}
						loading="lazy"
						width="240"
						height="360"
					/></a
				><span class="preview-badge">{book.theme} · Capa provisória</span>
				<h3>{book.title}</h3>
				<p>{book.summary}</p>
				<a href={`/loja/livraria/previa/livros/${book.slug}`}>Ver ficha e simular pedido</a>
			</article>{/each}
	</div>
</section>
