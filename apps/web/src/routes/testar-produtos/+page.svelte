<script lang="ts">
	import ContentShell from '$lib/components/shells/ContentShell.svelte';
	import PageIntro from '$lib/components/ui/PageIntro.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	let { data } = $props();
</script>

<svelte:head>
	<title>Teste dos produtos — A Tua Vida nos Astros</title>
	<meta name="robots" content="noindex,nofollow" />
	<meta
		name="description"
		content="Acesse as entradas de teste e consulte o que está disponível em cada produto."
	/>
</svelte:head>

<ContentShell kind="product">
	<PageIntro
		eyebrow="Área de teste"
		title="Teste os produtos"
		description="Veja os formulários dos 25 produtos e o que já está disponível para testar."
	/>
	<Card title="Comece pelo cálculo da Bússola de Carreira" variant="attention">
		<p>
			Você já pode informar cidade, data e hora para experimentar o cálculo do Meio do Céu. A base é
			experimental; a interpretação completa ainda está em preparação.
		</p>
		<p>
			<a href="/bussola-de-carreira">Calcular meu Meio do Céu</a> ·
			<a href="/meio-do-ceu">Ver Meio do Céu</a>
		</p>
	</Card>
	<section aria-labelledby="entradas-title">
		<h2 id="entradas-title">Entradas dos 25 produtos</h2>
		<p>
			<a href="/entrar">Entre com Google</a> antes de abrir as entradas abaixo. Você pode conferir os
			formulários e os estados disponíveis. Os pedidos de novas leituras continuam bloqueados enquanto
			os produtos estão em preparação.
		</p>
		<p>
			Resultados completos, salvamento e formatos finais ainda dependem da liberação de cada
			produto.
		</p>
		<div class="products">
			{#each data.products.filter((product) => product.universe !== 'global') as product (product.id)}
				<Card title={product.name} eyebrow="Leitura em preparação" variant="product">
					<a href={`/biblioteca/nova/${product.id}`}>Abrir formulário de {product.name}</a>
				</Card>
			{/each}
		</div>
	</section>
	<Card title="A Tua Vida nos Astros+" eyebrow="Em preparação">
		<p>
			Os planos e benefícios ainda estão em definição. A assinatura não está disponível para teste
			ou compra.
		</p>
	</Card>
	<p><a href="/biblioteca">Abrir a Biblioteca</a> · <a href="/dashboard">Abrir minha conta</a></p>
</ContentShell>

<style>
	section {
		margin-block: 2rem;
	}
	.products {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
		gap: 1rem;
	}
	.products a {
		display: inline-block;
		padding-block: 0.5rem;
	}
</style>
