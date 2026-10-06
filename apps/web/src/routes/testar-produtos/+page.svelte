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
		description={data.trialAccess
			? 'Seus 25 produtos estão disponíveis para teste gratuito. Gere as leituras, reabra os resultados e registre seu parecer, um produto por vez.'
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
				{data.feedback.filter((f) => f.decision === 'approved').length} de 25 produtos aprovados por você.
				Uma rejeição fica registrada para orientar a revisão.
			</p>
			<div class="products">
				{#each data.products.filter((p) => p.universe !== 'global') as product (product.id)}
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
		<section aria-labelledby="trial-library">
			<h2 id="trial-library">Sua biblioteca de testes</h2>
			{#if !data.readings.length}<p>
					Suas leituras aparecerão aqui depois de serem geradas e salvas.
				</p>{/if}
			<ul>
				{#each data.readings as reading (reading.id)}<li>
						<a href={`/testar-produtos/leituras/${reading.id}`}
							>{data.products.find((p) => p.id === reading.product_id)?.name ??
								reading.product_id}</a
						>
						— {new Date(reading.created_at).toLocaleDateString('pt-BR', {
							timeZone: 'America/Sao_Paulo'
						})}
					</li>{/each}
			</ul>
		</section>
	{:else}
		<Card title="Comece pelo cálculo da Bússola de Carreira" variant="attention">
			<p>
				Você já pode informar cidade, data e hora para experimentar o cálculo do Meio do Céu. A base
				é experimental; a interpretação completa ainda está em preparação.
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
	{/if}
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
