<svelte:head
	><title>Seu atlas — A Tua Vida nos Astros</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<section class="section">
	<div class="container">
		<p class="eyebrow">Área pessoal</p>
		<h1 class="h1">Seu atlas, organizado pelo que pede atenção.</h1>
		<p class="lead">
			O dashboard autenticado será ligado ao Supabase Auth. Nesta prévia, nenhum dado pessoal é
			carregado ou persistido.
		</p>
		<div class="grid grid-3">
			<article class="card panel">
				<span class="status">Próximo passo</span>
				<h2>Complete seu perfil natal</h2>
				<p>Data, hora, local e grau de precisão ficam versionados e podem ser corrigidos.</p>
			</article>
			<article class="card panel">
				<h2>Biblioteca</h2>
				<p>Resultados, relatórios e materiais autorizados em um só lugar.</p>
				<a href="/biblioteca">Abrir prévia</a>
			</article>
			<article class="card panel">
				<h2>Continuidade</h2>
				<p>Recomendações explicadas, sem reofertar o que você já possui.</p>
			</article>
		</div>
	</div>
</section>

<style>
	.panel {
		padding: 1.5rem;
	}
	.panel h2 {
		font: 500 1.7rem var(--atv-font-display);
	}
</style>
