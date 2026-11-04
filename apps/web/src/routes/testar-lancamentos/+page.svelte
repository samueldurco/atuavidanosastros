<script lang="ts">
	import ContentShell from '$lib/components/shells/ContentShell.svelte';
	import PageIntro from '$lib/components/ui/PageIntro.svelte';
	let { data } = $props();
</script>

<svelte:head
	><title>Preparação dos lançamentos | ATVNA</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<ContentShell kind="product">
	<PageIntro
		eyebrow="Homologação privada"
		title="Preparação dos lançamentos"
		description="Reúna os dados, acompanhe a revisão e reabra suas leituras de teste. O acesso a esta área é individual."
	/>
	<h2>Iniciar uma preparação</h2>
	<ul>
		{#each data.products as product (product.id)}<li>
				<a href={`/testar-lancamentos/${product.id}`}>{product.name}</a>
			</li>{/each}
	</ul>
	<h2>Preparações salvas</h2>
	{#if !data.storageAvailable}<p role="status">
			O salvamento ainda não está disponível neste ambiente.
		</p>{/if}
	<ul>
		{#each data.preparations as item (item.id)}<li>
				<a href={`/testar-lancamentos/preparacoes/${item.id}`}
					>{data.products.find((p) => p.id === item.product_id)?.name ?? item.product_id}</a
				>
				· {item.status === 'AWAITING_CALCULATION'
					? 'Aguardando cálculo'
					: 'Fatos calculados; abrir preparação'}
			</li>{/each}
	</ul>
</ContentShell>
