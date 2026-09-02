<svelte:head
	><title>Biblioteca — A Tua Vida nos Astros</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<section class="section">
	<div class="container">
		<p class="eyebrow">Biblioteca</p>
		<h1 class="h1">Tudo o que é seu, recuperável e versionado.</h1>
		<div class="card empty">
			<img src="/brand/logo/monogram/atv-monogram.svg" alt="" width="256" height="256" />
			<h2>Sua Biblioteca ainda está vazia.</h2>
			<p>
				Quando você salvar uma ferramenta ou receber um produto, ele aparecerá aqui com histórico,
				formato e opções de acesso.
			</p>
			<a class="button" href="/meu-ceu">Explorar o Meu Céu</a>
		</div>
	</div>
</section>

<style>
	.empty {
		padding: clamp(2rem, 6vw, 5rem);
		text-align: center;
	}
	.empty img {
		width: 5rem;
	}
	.empty h2 {
		font: 500 2rem var(--atv-font-display);
	}
</style>
