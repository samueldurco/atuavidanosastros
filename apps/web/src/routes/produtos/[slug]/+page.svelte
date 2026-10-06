<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { formatLabels } from '$lib/data/product-details';
	let { data } = $props();
</script>

<section class="section">
	<div class="reading">
		<p class="eyebrow">Conheça a leitura</p>
		<h1 class="h1">{data.product.name}</h1>
		<p class="lead">{data.product.summary}</p>
		<h2>O que a leitura aborda</h2>
		<p>{data.details.scope}</p>
		<h2>O que você precisa informar</h2>
		<p>{data.details.input}</p>
		<h2>Formatos previstos</h2>
		<ul>
			{#each data.product.delivery as format (format)}<li>{formatLabels[format]}</li>{/each}
		</ul>
		{#if data.trialAccess}
			<div class="card status">
				<h2>Teste gratuito disponível</h2>
				<p>Seu acesso está ativo. Gere a leitura, salve o resultado e registre sua avaliação.</p>
				<Button href={`/testar-produtos/${data.product.id}`}
					>Testar {data.product.name} grátis</Button
				>
			</div>
		{:else if data.product.state === 'ACTIVE' && data.product.personalized}
			<Button href={`/biblioteca/nova/${data.product.id}`}>{data.product.action}</Button>
		{:else}
			<div class="card status" role="status">
				<h2>{data.product.state === 'PAUSED' ? 'Disponibilidade' : 'Produto em preparação'}</h2>
				<p>
					{data.product.state === 'PAUSED'
						? 'Esta leitura está temporariamente indisponível.'
						: 'Esta leitura ainda não está disponível. O conteúdo, o preço e os formatos finais serão apresentados quando ela for liberada.'}
				</p>
			</div>
		{/if}
		{#if !data.trialAccess}
			<p><a href="/testar-produtos">Acessar testes gratuitos com minha conta</a></p>
		{/if}
		{#if data.product.id === 'career-compass'}
			<Button href="/bussola-de-carreira">Calcular meu Meio do Céu grátis</Button>
		{/if}
		<p class="back">
			<a href="/dashboard">Ver minhas leituras</a> · <a href="/metodo">Como fazemos as leituras</a>
		</p>
	</div>
</section>

<style>
	h2 {
		margin-top: 2rem;
	}
	.status {
		padding: 1.5rem;
		margin-block: 2rem;
	}
	.status h2 {
		margin-top: 0;
	}
	.back {
		margin-top: 2rem;
	}
</style>
