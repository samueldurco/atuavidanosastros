<script lang="ts">
	import PreviewCheckout from '$lib/components/bookshop/PreviewCheckout.svelte';
	let { data } = $props();
</script>

<svelte:head><title>Céu de Papel · Prévia restrita ATVNA</title></svelte:head>
<p><a href="/loja/livraria/previa">← Voltar à estante</a></p>
<section class="preview-club">
	<p class="preview-kicker">O clube de leitura da Livraria ATVNA</p>
	<h1 style="color:#fff8ed">Céu de Papel</h1>
	<p>
		Um livro por mês para ler com atenção e anotar o que fica. Cada edição reúne o livro e um
		caderno de leitura inédito no mesmo volume, com capa própria do clube.
	</p>
	<p>
		Os ciclos trimestral e anual recebem a mesma edição mensal. O anual tem menor valor de teste por
		edição. A alternância entre astrologia e Tarot continua depois do primeiro trimestre.
	</p>
</section>
<h2>O primeiro trimestre</h2>
<div class="preview-grid">
	{#each data.preview.club.editions.slice(0, 3) as edition, index (edition.id)}<article
			class="preview-book"
		>
			<img
				src={edition.coverUrl}
				alt={`Capa provisória exclusiva de ${edition.title}`}
				width="240"
				height="360"
			/>
			<p class="preview-kicker">Mês {index + 1} · {edition.theme}</p>
			<h3>{edition.title}</h3>
			<p>{edition.exclusive}</p>
			<span class="preview-badge">Edição exclusiva em preparação</span>
		</article>{/each}
</div>
<p>
	A edição regular do primeiro livro permanece disponível no catálogo avulso. As edições seguintes
	do clube ampliam o material editorial; o lançamento depende de revisão, arquivos de impressão e
	fornecedor homologado.
</p>
<PreviewCheckout kind="club" title="Céu de Papel" />
