<script lang="ts">
	import PreviewCheckout from '$lib/components/bookshop/PreviewCheckout.svelte';
	let { data } = $props();
</script>

<svelte:head><title>{data.book.title} · Prévia restrita ATVNA</title></svelte:head>
<p><a href="/loja/livraria/previa">← Voltar à estante</a></p>
<div class="preview-split">
	<div>
		<img
			class="preview-cover"
			src={data.book.coverUrl}
			alt={`Capa provisória de ${data.book.title}`}
			width="300"
			height="450"
		/>
	</div>
	<div>
		<p class="preview-kicker">{data.book.theme} · Edição avulsa</p>
		<h1>{data.book.title}</h1>
		<p>{data.book.summary}</p>
		<p>
			<strong>Em reescrita.</strong> O inventário atual registra {data.book.chapters} capítulos e {data.book.words.toLocaleString(
				'pt-BR'
			)} palavras. A extensão e o acabamento finais dependem da revisão editorial.
		</p>
		<p>
			Capa provisória, direitos e arquivo de impressão pendentes de revisão para o lançamento.
			Nenhum manuscrito é distribuído nesta prévia.
		</p>
		<p>
			O desconto ATV+ é aplicado ao livro físico, sem incluir frete. A melhor condição elegível é
			usada uma vez sobre o preço regular de teste.
		</p>
	</div>
</div>
<PreviewCheckout kind="book" bookId={data.book.id} title={data.book.title} />
