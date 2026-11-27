<script lang="ts">
	import BookSeal from '$lib/components/bookshop/BookSeal.svelte';
	import '$lib/components/bookshop/preview.css';
	let { children } = $props();
</script>

<svelte:head><meta name="robots" content="noindex, nofollow, noarchive" /></svelte:head>
<div class="book-preview">
	<header class="preview-header">
		<a href="/loja/livraria/previa" class="preview-brand"
			><BookSeal /> <span>Livraria ATVNA<small>Prévia editorial restrita</small></span></a
		>
		<nav aria-label="Prévia da Livraria">
			<a href="/loja/livraria/previa">Estante</a><a href="/loja/livraria/previa/ceu-de-papel"
				>Céu de Papel</a
			><a href="/loja/livraria/previa/minha-area">Minha área de teste</a><a href="/loja/livraria"
				>Página pública</a
			>
		</nav>
	</header>
	<aside class="preview-notice">
		<strong>Ambiente de simulação.</strong> Livros em reescrita e capas provisórias. Valores, fretes,
		pagamentos e rastreios são fictícios para testar a jornada. Nenhuma compra, assinatura ou impressão
		é realizada.
	</aside>
	<div class="preview-content">{@render children()}</div>
	<footer class="preview-footer">
		Livraria ATVNA · Prévia privada · A estreia depende da conclusão editorial e da homologação dos
		fornecedores. <a href="/contato">Suporte oficial</a>
	</footer>
</div>
