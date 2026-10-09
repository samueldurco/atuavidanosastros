<script lang="ts">
	import TrialLibrary from '$lib/components/TrialLibrary.svelte';
	import ContentShell from '$lib/components/shells/ContentShell.svelte';
	import PageIntro from '$lib/components/ui/PageIntro.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { loginHref } from '$lib/auth-return';
	let { data } = $props();
	const products = $derived(data.products.filter((product) => product.universe !== 'global'));
	const approvedProducts = $derived(
		products.filter((product) =>
			data.feedback.some(
				(feedback) => feedback.product_id === product.id && feedback.decision === 'approved'
			)
		).length
	);
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
		description={data.trialAccess
			? `Seus ${products.length} produtos estão disponíveis para teste gratuito. Gere as leituras, reabra os resultados e registre seu parecer, um produto por vez.`
			: 'Entre com sua conta Google para acessar os testes privados.'}
	/>
	{#if data.trialAccess}
		<Card title="Seu acesso de testes está ativo" variant="attention">
			<p>
				Comece pela Bússola de Carreira. Cada leitura passa por revisão automática antes de ser
				salva. Sua aprovação do produto fica registrada separadamente.
			</p>
			<p>
				<a href="/testar-produtos/career-compass">Testar Bússola de Carreira</a> ·
				<a href="/testar-produtos/atv-plus">Entrar no ATV+ gratuito</a>
			</p>
		</Card>
		{#if data.libraryUnavailable}<p role="alert">
				A biblioteca está temporariamente indisponível. Tente novamente antes de gerar outra
				leitura.
			</p>{/if}
		<section aria-labelledby="free-products">
			<h2 id="free-products">Escolha seu próximo produto</h2>
			<p>
				{approvedProducts} de {products.length} produtos aprovados por você. Uma rejeição fica registrada
				para orientar a revisão.
			</p>
			<div class="products">
				{#each products as product (product.id)}
					{@const feedback = data.feedback.find((f) => f.product_id === product.id)}
					<Card
						title={product.name}
						eyebrow={feedback
							? feedback.decision === 'approved'
								? 'Aprovado por você'
								: 'Revisão solicitada'
							: 'Aguardando seu teste'}
						variant="product"
					>
						<p><a href={`/testar-produtos/${product.id}`}>Testar {product.name}</a></p>
						{#if feedback}<p>
								<a href={`/testar-produtos/leituras/${feedback.reading_id}`}
									>Reabrir a leitura avaliada</a
								>
							</p>{/if}
					</Card>
				{/each}
			</div>
		</section>
		<TrialLibrary
			library={{ readings: data.readings, unavailable: Boolean(data.libraryUnavailable) }}
		/>
	{:else}
		<Card
			title={data.user
				? 'Esta conta não tem acesso aos testes privados'
				: 'Entre para acessar seus testes gratuitos'}
			variant="attention"
		>
			<p>
				O acesso aos {products.length} produtos e ao ATV+ é liberado por conta. Use a mesma conta Google
				autorizada para seus testes.
			</p>
			<p>
				<a href={loginHref('/testar-produtos')}>Entrar com Google para testar</a>
			</p>
		</Card>
		<section aria-labelledby="entradas-title">
			<h2 id="entradas-title">Os {products.length} produtos para teste privado</h2>
			<p>
				Ao entrar com a conta autorizada, você poderá gerar, salvar e avaliar cada leitura
				gratuitamente.
			</p>
			<div class="products">
				{#each products as product (product.id)}
					<Card title={product.name} eyebrow="Teste privado" variant="product">
						<a href={`/testar-produtos/${product.id}`}>Testar {product.name}</a>
					</Card>
				{/each}
			</div>
		</section>
	{/if}
	<Card
		title="A Tua Vida nos Astros+"
		eyebrow={data.trialAccess ? 'Teste gratuito disponível' : 'Teste privado'}
	>
		<p>
			{data.trialAccess
				? 'Seu clube de teste está liberado gratuitamente. Explore os produtos e registre sua avaliação do ATV+.'
				: 'Entre com a conta autorizada para testar o clube gratuitamente.'}
		</p>
		<p>
			<a href="/testar-produtos/atv-plus"
				>{data.trialAccess ? 'Testar ATV+ grátis' : 'Acessar teste do ATV+'}</a
			>
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
